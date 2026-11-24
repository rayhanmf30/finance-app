import type { ISql } from 'postgres';
import { error } from '@sveltejs/kit';
import { db } from './db';
import { periodKey, periodRange, type PeriodType } from './period';

type SqlExecutor = ISql;

export interface TransactionRow {
	id: string;
	wallet_id: string;
	destination_wallet_id: string | null;
	category_id: string | null;
	type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
	amount: string;
	transaction_date: Date;
	note: string | null;
}

export interface TransactionItemRecord {
	name: string;
	quantity: number;
	unitPrice: number;
	discount?: number;
}

export interface CreateTransactionInput {
	walletId: string;
	destinationWalletId?: string | null;
	categoryId?: string | null;
	type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
	amount: number;
	transactionDate: string;
	note?: string | null;
	/** Rincian barang belanja (mis. dari scan resi) — disimpan ke tabel transaction_items. */
	items?: TransactionItemRecord[];
}

export function mapTransaction(row: TransactionRow) {
	return {
		id: row.id,
		walletId: row.wallet_id,
		destinationWalletId: row.destination_wallet_id,
		categoryId: row.category_id,
		type: row.type,
		amount: Number(row.amount),
		transactionDate: new Date(row.transaction_date).toISOString(),
		note: row.note ?? ''
	};
}

function validateInput(input: CreateTransactionInput): void {
	if (!['INCOME', 'EXPENSE', 'TRANSFER'].includes(input.type)) {
		error(400, 'Tipe transaksi tidak valid.');
	}

	const amount = Number(input.amount);
	if (!Number.isFinite(amount) || amount <= 0) {
		error(400, 'Nominal harus lebih besar dari nol.');
	}

	const date = new Date(input.transactionDate);
	if (Number.isNaN(date.getTime())) {
		error(400, 'Tanggal transaksi tidak valid.');
	}

	if (input.type === 'TRANSFER') {
		if (!input.destinationWalletId) {
			error(400, 'Transfer wajib memiliki dompet tujuan.');
		}
		if (input.destinationWalletId === input.walletId) {
			error(400, 'Dompet tujuan tidak boleh sama dengan dompet sumber.');
		}
	}

	if (input.items) {
		if (input.items.length > 500) {
			error(400, 'Maksimal 500 item per transaksi.');
		}
		input.items.forEach((item, index) => {
			const label = `Item #${index + 1}`;
			if (!item.name || item.name.trim().length === 0 || item.name.length > 150) {
				error(400, `${label} wajib punya nama 1-150 karakter.`);
			}
			const qty = Number(item.quantity);
			if (!Number.isFinite(qty) || qty <= 0) {
				error(400, `${label} harus punya kuantitas lebih besar dari nol.`);
			}
			const price = Number(item.unitPrice);
			if (!Number.isFinite(price) || price < 0) {
				error(400, `${label} harus punya harga satuan >= 0.`);
			}
			const discount = Number(item.discount ?? 0);
			if (!Number.isFinite(discount) || discount < 0) {
				error(400, `${label} harus punya diskon >= 0.`);
			}
		});
	}
}

export async function listTransactions(userId: string, month: string, query: string) {
	const [year, monthIndex] = month.split('-').map(Number);
	if (!year || !monthIndex) error(400, 'Format bulan harus YYYY-MM.');

	const start = new Date(year, monthIndex - 1, 1);
	const end = new Date(year, monthIndex, 1);
	const pattern = `%${query.trim()}%`;

	const rows = await db<TransactionRow[]>`
		SELECT t.id, t.wallet_id, t.destination_wallet_id, t.category_id, t.type, t.amount, t.transaction_date, t.note
		FROM transactions t
		WHERE t.user_id = ${userId}
			AND t.transaction_date >= ${start}
			AND t.transaction_date < ${end}
			AND (
				${query.trim()} = ''
				OR t.note ILIKE ${pattern}
				OR EXISTS (
					SELECT 1 FROM categories c
					WHERE c.id = t.category_id AND c.name ILIKE ${pattern}
				)
			)
		ORDER BY t.transaction_date DESC
	`;

	return rows.map(mapTransaction);
}

export async function createTransaction(userId: string, input: CreateTransactionInput) {
	validateInput(input);
	const amount = Number(input.amount);
	const date = new Date(input.transactionDate);

	return db.begin(async (tx) => {
		const walletIds =
			input.type === 'TRANSFER' ? [input.walletId, input.destinationWalletId!] : [input.walletId];

		const locked = await tx<{ id: string; current_balance: string }[]>`
			SELECT id, current_balance FROM wallets
			WHERE user_id = ${userId} AND id IN ${tx(walletIds)}
			ORDER BY id
			FOR UPDATE
		`;
		if (locked.length !== walletIds.length) {
			error(400, 'Dompet tidak ditemukan.');
		}

		// Saldo dompet sumber tidak boleh minus akibat transfer.
		if (input.type === 'TRANSFER') {
			const source = locked.find((w) => w.id === input.walletId)!;
			if (Number(source.current_balance) < amount) {
				error(400, 'Saldo dompet sumber tidak cukup untuk transfer ini.');
			}
		}

		const rows = await tx<TransactionRow[]>`
			INSERT INTO transactions (user_id, wallet_id, destination_wallet_id, category_id, type, amount, transaction_date, note)
			VALUES (${userId}, ${input.walletId}, ${input.destinationWalletId ?? null}, ${input.categoryId ?? null}, ${input.type}, ${amount}, ${date}, ${input.note ?? null})
			RETURNING id, wallet_id, destination_wallet_id, category_id, type, amount, transaction_date, note
		`;

		if (input.type === 'INCOME') {
			await tx`UPDATE wallets SET current_balance = current_balance + ${amount} WHERE id = ${input.walletId}`;
		} else if (input.type === 'EXPENSE') {
			await tx`UPDATE wallets SET current_balance = current_balance - ${amount} WHERE id = ${input.walletId}`;
		} else {
			await tx`UPDATE wallets SET current_balance = current_balance - ${amount} WHERE id = ${input.walletId}`;
			await tx`UPDATE wallets SET current_balance = current_balance + ${amount} WHERE id = ${input.destinationWalletId!}`;
		}

		// Simpan rincian barang pada tabel transaction_items (satu baris per barang).
		if (input.items && input.items.length > 0) {
			// sql()/tx() dengan array objek otomatis menghasilkan kolom + multi VALUES.
			await tx`
				INSERT INTO transaction_items
				${tx(
					input.items.map((item) => ({
						transaction_id: rows[0].id,
						name: item.name.trim(),
						quantity: Number(item.quantity),
						unit_price: Number(item.unitPrice),
						discount: Number(item.discount ?? 0)
					}))
				)}
			`;
		}

		if (input.type === 'EXPENSE') {
			await evaluateBudgets(tx, userId, input.categoryId ?? null, date);
		}

		return mapTransaction(rows[0]);
	});
}

/**
 * Ubah transaksi di tempat (UPDATE sejati) — id dan created_at tetap.
 * Saldo dompet direkonsiliasi harmonis: efek saldo transaksi lama dibalik,
 * efek saldo transaksi baru diterapkan, semuanya dalam satu db.begin().
 */
export async function updateTransaction(userId: string, id: string, input: CreateTransactionInput) {
	validateInput(input);
	const amount = Number(input.amount);
	const date = new Date(input.transactionDate);

	return db.begin(async (tx) => {
		// Kunci baris transaksi lama untuk menghindari race dengan operasi lain.
		const rows = await tx<TransactionRow[]>`
			SELECT id, wallet_id, destination_wallet_id, category_id, type, amount, transaction_date, note
			FROM transactions
			WHERE id = ${id} AND user_id = ${userId}
			FOR UPDATE
		`;
		if (rows.length === 0) error(404, 'Transaksi tidak ditemukan.');
		const old = rows[0];
		const oldAmount = Number(old.amount);

		// Kunci semua dompet yang terlibat (lama + baru) milik user ini.
		const involved = Array.from(
			new Set(
				[
					input.walletId,
					input.type === 'TRANSFER' ? input.destinationWalletId! : null,
					old.wallet_id,
					old.destination_wallet_id
				].filter((wid): wid is string => Boolean(wid))
			)
		);
		const locked = await tx<{ id: string; current_balance: string }[]>`
			SELECT id, current_balance FROM wallets
			WHERE user_id = ${userId} AND id IN ${tx(involved)}
			ORDER BY id
			FOR UPDATE
		`;
		if (locked.length !== involved.length) {
			error(400, 'Dompet tidak ditemukan.');
		}

		// Rekonsiliasi saldo: kumpulkan delta per dompet (kunci gabungan lama + baru,
		// jadi dompet yang sama muncul di lama & baru otomatis saling meneutral).
		const deltas = new Map<string, number>();
		const add = (walletId: string, delta: number) =>
			deltas.set(walletId, (deltas.get(walletId) ?? 0) + delta);

		// 1) Balikkan efek transaksi lama.
		if (old.type === 'INCOME') {
			add(old.wallet_id, -oldAmount);
		} else if (old.type === 'EXPENSE') {
			add(old.wallet_id, oldAmount);
		} else {
			add(old.wallet_id, oldAmount);
			add(old.destination_wallet_id!, -oldAmount);
		}

		// 2) Terapkan efek transaksi baru.
		if (input.type === 'INCOME') {
			add(input.walletId, amount);
		} else if (input.type === 'EXPENSE') {
			add(input.walletId, -amount);
		} else {
			add(input.walletId, -amount);
			add(input.destinationWalletId!, amount);
		}

		// Saldo dompet sumber tidak boleh minus akibat transfer.
		// Proyeksi = saldo terkini (dompet sudah terkunci) + delta gabungan (efek lama dibalik + efek baru).
		if (input.type === 'TRANSFER') {
			const source = locked.find((w) => w.id === input.walletId)!;
			const projected =
				Number(source.current_balance) + (deltas.get(input.walletId) ?? 0);
			if (projected < 0) {
				error(400, 'Saldo dompet sumber tidak cukup untuk transfer ini.');
			}
		}

		for (const [walletId, delta] of deltas) {
			if (delta === 0) continue;
			await tx`UPDATE wallets SET current_balance = current_balance + ${delta} WHERE id = ${walletId}`;
		}

		// 3) Perbarui baris transaksi (id & created_at tidak disentuh; updated_at via trigger).
		const updated = await tx<TransactionRow[]>`
			UPDATE transactions SET
				wallet_id = ${input.walletId},
				destination_wallet_id = ${input.type === 'TRANSFER' ? input.destinationWalletId! : null},
				category_id = ${input.type === 'TRANSFER' ? null : input.categoryId ?? null},
				type = ${input.type},
				amount = ${amount},
				transaction_date = ${date},
				note = ${input.note ?? null}
			WHERE id = ${id} AND user_id = ${userId}
			RETURNING id, wallet_id, destination_wallet_id, category_id, type, amount, transaction_date, note
		`;

		// 4) Rincian barang: bila body membawa items, ganti seluruh rincian;
		// bila tidak, rincian lama dibiarkan utuh.
		if (input.items) {
			await tx`DELETE FROM transaction_items WHERE transaction_id = ${id}`;
			if (input.items.length > 0) {
				await tx`
					INSERT INTO transaction_items
					${tx(
						input.items.map((item) => ({
							transaction_id: id,
							name: item.name.trim(),
							quantity: Number(item.quantity),
							unit_price: Number(item.unitPrice),
							discount: Number(item.discount ?? 0)
						}))
					)}
				`;
			}
		}

		if (input.type === 'EXPENSE') {
			await evaluateBudgets(tx, userId, input.categoryId ?? null, date);
		}

		return mapTransaction(updated[0]);
	});
}

/** Satu transaksi + rincian barangnya. */
export async function getTransaction(userId: string, id: string) {
	const rows = await db<TransactionRow[]>`
		SELECT id, wallet_id, destination_wallet_id, category_id, type, amount, transaction_date, note
		FROM transactions
		WHERE id = ${id}::uuid AND user_id = ${userId}
	`;
	if (rows.length === 0) error(404, 'Transaksi tidak ditemukan.');
	const items = await listTransactionItems(userId, id);
	return { ...mapTransaction(rows[0]), items };
}

/** Rincian barang milik sebuah transaksi (untuk pertahankan data saat edit). */
export async function listTransactionItems(userId: string, transactionId: string): Promise<TransactionItemRecord[]> {
	const rows = await db<{ name: string; quantity: string; unit_price: string; discount: string }[]>`
		SELECT ti.name, ti.quantity, ti.unit_price, ti.discount
		FROM transaction_items ti
		JOIN transactions t ON t.id = ti.transaction_id
		WHERE ti.transaction_id = ${transactionId}::uuid AND t.user_id = ${userId}
	`;
	return rows.map((r) => ({
		name: r.name,
		quantity: Number(r.quantity),
		unitPrice: Number(r.unit_price),
		discount: Number(r.discount ?? 0)
	}));
}

export async function deleteTransaction(userId: string, id: string) {
	return db.begin(async (tx) => {
		const rows = await tx<TransactionRow[]>`
			SELECT id, wallet_id, destination_wallet_id, category_id, type, amount, transaction_date, note
			FROM transactions
			WHERE id = ${id} AND user_id = ${userId}
			FOR UPDATE
		`;
		if (rows.length === 0) error(404, 'Transaksi tidak ditemukan.');

		const row = rows[0];
		const amount = Number(row.amount);

		if (row.type === 'INCOME') {
			await tx`UPDATE wallets SET current_balance = current_balance - ${amount} WHERE id = ${row.wallet_id}`;
		} else if (row.type === 'EXPENSE') {
			await tx`UPDATE wallets SET current_balance = current_balance + ${amount} WHERE id = ${row.wallet_id}`;
		} else {
			await tx`UPDATE wallets SET current_balance = current_balance + ${amount} WHERE id = ${row.wallet_id}`;
			await tx`UPDATE wallets SET current_balance = current_balance - ${amount} WHERE id = ${row.destination_wallet_id}`;
		}

		await tx`DELETE FROM transactions WHERE id = ${id}`;
	});
}

interface BudgetRecord {
	id: string;
	category_id: string | null;
	period_type: PeriodType;
	limit_amount: string;
	warning_threshold_pct: number;
	category_name: string | null;
}

export interface BudgetStatusRow {
	budgetId: string;
	categoryId: string | null;
	categoryName: string;
	periodType: PeriodType;
	periodKey: string;
	limitAmount: number;
	spentAmount: number;
	remainingAmount: number;
	usagePercentage: number;
	status: 'SAFE' | 'WARNING' | 'EXCEEDED';
}

export function mapBudgetStatus(budget: BudgetRecord, spent: number, key: string): BudgetStatusRow {
	const limit = Number(budget.limit_amount);
	const remaining = limit - spent;
	const percentage = limit > 0 ? (spent / limit) * 100 : 0;
	const status: BudgetStatusRow['status'] =
		spent > limit ? 'EXCEEDED' : percentage >= budget.warning_threshold_pct ? 'WARNING' : 'SAFE';

	return {
		budgetId: budget.id,
		categoryId: budget.category_id,
		categoryName: budget.category_name ?? 'Total Semua Pengeluaran',
		periodType: budget.period_type,
		periodKey: key,
		limitAmount: limit,
		spentAmount: spent,
		remainingAmount: remaining,
		usagePercentage: Math.round(percentage * 100) / 100,
		status
	};
}

export async function computeBudgetStatuses(
	executor: SqlExecutor,
	userId: string,
	at: Date = new Date()
): Promise<BudgetStatusRow[]> {
	const budgets = await executor<BudgetRecord[]>`
		SELECT b.id, b.category_id, b.period_type, b.limit_amount, b.warning_threshold_pct, c.name AS category_name
		FROM budgets b
		LEFT JOIN categories c ON c.id = b.category_id
		WHERE b.user_id = ${userId} AND b.is_active = TRUE
		ORDER BY b.created_at
	`;

	const statuses: BudgetStatusRow[] = [];
	for (const budget of budgets) {
		const { start, end } = periodRange(at, budget.period_type);
		const key = periodKey(at, budget.period_type);
		const spent = await sumExpenses(executor, userId, budget.category_id, start, end);
		statuses.push(mapBudgetStatus(budget, spent, key));
	}
	return statuses;
}

async function sumExpenses(
	executor: SqlExecutor,
	userId: string,
	categoryId: string | null,
	start: Date,
	end: Date
): Promise<number> {
	const rows = categoryId
		? await executor<{ total: string }[]>`
			WITH RECURSIVE subtree AS (
				SELECT id FROM categories WHERE id = ${categoryId}
				UNION ALL
				SELECT c.id FROM categories c JOIN subtree s ON c.parent_id = s.id
			)
			SELECT COALESCE(SUM(t.amount), 0) AS total
			FROM transactions t
			WHERE t.user_id = ${userId}
				AND t.type = 'EXPENSE'
				AND t.category_id IN (SELECT id FROM subtree)
				AND t.transaction_date >= ${start}
				AND t.transaction_date < ${end}
		`
		: await executor<{ total: string }[]>`
			SELECT COALESCE(SUM(t.amount), 0) AS total
			FROM transactions t
			WHERE t.user_id = ${userId}
				AND t.type = 'EXPENSE'
				AND t.transaction_date >= ${start}
				AND t.transaction_date < ${end}
		`;
	return Number(rows[0].total);
}

async function evaluateBudgets(
	tx: SqlExecutor,
	userId: string,
	categoryId: string | null,
	date: Date
): Promise<void> {
	const budgets = await tx<BudgetRecord[]>`
		WITH RECURSIVE chain AS (
			SELECT id, parent_id FROM categories WHERE id = ${categoryId}
			UNION ALL
			SELECT c.id, c.parent_id FROM categories c JOIN chain ch ON c.id = ch.parent_id
		)
		SELECT b.id, b.category_id, b.period_type, b.limit_amount, b.warning_threshold_pct, c.name AS category_name
		FROM budgets b
		LEFT JOIN categories c ON c.id = b.category_id
		WHERE b.user_id = ${userId}
			AND b.is_active = TRUE
			AND (b.category_id IS NULL OR b.category_id IN (SELECT id FROM chain))
	`;

	for (const budget of budgets) {
		const { start, end } = periodRange(date, budget.period_type);
		const key = periodKey(date, budget.period_type);
		const spent = await sumExpenses(tx, userId, budget.category_id, start, end);
		const limit = Number(budget.limit_amount);
		const percentage = limit > 0 ? (spent / limit) * 100 : 0;

		let level: 'WARNING_THRESHOLD' | 'EXCEEDED_LIMIT' | null = null;
		if (spent > limit) {
			level = 'EXCEEDED_LIMIT';
		} else if (percentage >= budget.warning_threshold_pct) {
			level = 'WARNING_THRESHOLD';
		}
		if (!level) continue;

		const label = budget.category_name ?? 'Total Semua Pengeluaran';
		const message =
			level === 'EXCEEDED_LIMIT'
				? `Budget ${label} sudah terlampaui: terpakai ${spent.toLocaleString('id-ID')} dari limit ${limit.toLocaleString('id-ID')}.`
				: `Budget ${label} sudah terpakai ${Math.floor(percentage)}%: ${spent.toLocaleString('id-ID')} dari ${limit.toLocaleString('id-ID')}.`;

		await tx`
			INSERT INTO budget_alerts (user_id, budget_id, period_key, alert_level, spent_amount, limit_amount, message)
			VALUES (${userId}, ${budget.id}, ${key}, ${level}, ${spent}, ${limit}, ${message})
			ON CONFLICT (budget_id, period_key, alert_level) DO NOTHING
		`;
	}
}
