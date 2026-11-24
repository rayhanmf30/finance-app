import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireUserId } from '#lib/server/session';
import { resolveWalletTypeId, validateWalletInput } from '#lib/server/wallets';

export async function GET({ locals }) {
	const userId = requireUserId(locals);
	const rows = await db`
		SELECT w.id, w.name, w.type, w.currency, w.current_balance, w.is_included_in_total,
			wt.code AS type_code, wt.label AS type_label
		FROM wallets w
		LEFT JOIN wallet_types wt ON wt.id = w.type
		WHERE w.user_id = ${userId}
		ORDER BY w.created_at
	`;

	return json(
		rows.map((row) => ({
			id: row.id,
			name: row.name,
			type: row.type,
			typeCode: row.type_code ?? '',
			typeLabel: row.type_label ?? row.type,
			currency: row.currency,
			currentBalance: Number(row.current_balance),
			isIncludedInTotal: row.is_included_in_total
		}))
	);
}


/** Tambah dompet milik pengguna login (saldo awal >= 0). */
export async function POST({ locals, request }: import('./$types').RequestEvent) {
	const userId = requireUserId(locals);
	const body = (await request.json().catch(() => null)) as {
		name?: string;
		type?: string;
		currency?: string;
		initialBalance?: number;
		isIncludedInTotal?: boolean;
	} | null;
	if (!body) throw error(400, { message: 'Body harus JSON.', code: 'E_BAD_BODY' });

	const { name, currency } = validateWalletInput(body);
	const typeCode = String(body.type ?? '').trim();
	const initialBalance = Number(body.initialBalance ?? 0);
	const isIncludedInTotal = body.isIncludedInTotal ?? true;

	if (!Number.isFinite(initialBalance) || initialBalance < 0) {
		throw error(400, { message: 'Saldo awal wajib angka >= 0.', code: 'E_BAD_INITIAL_BALANCE' });
	}
	if (typeCode.length < 2) {
		throw error(400, { message: 'Tipe dompet wajib dipilih.', code: 'E_BAD_WALLET_TYPE' });
	}
	const walletType = await resolveWalletTypeId(db, userId, typeCode);

	const [created] = await db<{ id: string }[]>`
		INSERT INTO wallets (user_id, name, type, currency, current_balance, is_included_in_total)
		VALUES (${userId}, ${name}, ${walletType.id}, ${currency}, ${initialBalance}, ${isIncludedInTotal})
		RETURNING id
	`;

	return json({ id: created.id }, { status: 201 });
}
