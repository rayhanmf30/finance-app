import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireAdmin } from '#lib/server/session';
import { resolveWalletTypeId } from '#lib/server/wallets';
import type { RequestHandler } from './$types';

interface AdminWalletRow {
	id: string;
	owner_id: string;
	owner_name: string;
	owner_email: string;
	name: string;
	type: string;
	type_label: string | null;
	currency: string;
	current_balance: string;
	is_included_in_total: boolean;
	transaction_count: number;
	created_at: Date;
}

export const GET: RequestHandler = async ({ locals, url }) => {
	requireAdmin(locals);

	const query = (url.searchParams.get('q') ?? '').trim();
	const pattern = `%${query}%`;

	const rows = await db<AdminWalletRow[]>`
		SELECT w.id, w.user_id AS owner_id, u.name AS owner_name, u.email AS owner_email,
			w.name, w.type, wt.label AS type_label, w.currency,
			w.current_balance, w.is_included_in_total, w.created_at,
			(SELECT count(*) FROM transactions t
			 WHERE t.wallet_id = w.id OR t.destination_wallet_id = w.id)::int AS transaction_count
		FROM wallets w
		JOIN users u ON u.id = w.user_id
		LEFT JOIN wallet_types wt ON wt.id = w.type
		WHERE ${query} = ''
			OR w.name ILIKE ${pattern}
			OR u.name ILIKE ${pattern}
			OR u.email ILIKE ${pattern}
			OR COALESCE(wt.label, '') ILIKE ${pattern}
		ORDER BY u.name, u.email, w.created_at
	`;

	return json(
		rows.map((r) => ({
			id: r.id,
			ownerId: r.owner_id,
			ownerName: r.owner_name,
			ownerEmail: r.owner_email,
			name: r.name,
			type: r.type,
			typeLabel: r.type_label,
			currency: r.currency,
			currentBalance: Number(r.current_balance),
			isIncludedInTotal: r.is_included_in_total,
			transactionCount: r.transaction_count,
			createdAt: new Date(r.created_at).toISOString()
		}))
	);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	requireAdmin(locals);

	const body = (await request.json().catch(() => null)) as {
		userId?: string;
		name?: string;
		type?: string;
		currency?: string;
		initialBalance?: number;
	} | null;
	if (!body) throw error(400, 'Body harus JSON.');

	const userId = (body.userId ?? '').trim();
	const name = (body.name ?? '').trim();
	const type = (body.type ?? '').trim();
	const currency = (body.currency ?? 'IDR').trim().toUpperCase();
	const initialBalance = body.initialBalance ?? 0;

	if (!/^[0-9a-fA-F-]{36}$/.test(userId)) throw error(400, 'Pengguna wajib dipilih.');
	if (name.length < 2 || name.length > 100) {
		throw error(400, 'Nama dompet wajib 2-100 karakter.');
	}
	if (currency.length !== 3) throw error(400, 'Kode mata uang wajib 3 huruf (mis. IDR).');
	if (!Number.isFinite(initialBalance) || initialBalance < 0) {
		throw error(400, 'Saldo awal wajib angka >= 0.');
	}

	const user = await db`SELECT id FROM users WHERE id = ${userId}`;
	if (user.length === 0) throw error(404, 'Pengguna tidak ditemukan.');

	const walletType = await resolveWalletTypeId(db, userId, type);

	const [created] = await db<{ id: string }[]>`
		INSERT INTO wallets (user_id, name, type, currency, current_balance)
		VALUES (${userId}, ${name}, ${walletType.id}, ${currency}, ${initialBalance})
		RETURNING id
	`;

	return json({ id: created.id }, { status: 201 });
};
