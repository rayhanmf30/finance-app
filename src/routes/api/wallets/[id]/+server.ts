import { error } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireUserId } from '#lib/server/session';
import { resolveWalletTypeId } from '#lib/server/wallets';
import type { RequestHandler } from './$types';

interface WalletRow {
	id: string;
	name: string;
	type: string;
	type_label: string | null;
	is_included_in_total: boolean;
}

/** Edit dompet milik pengguna login (nama, tipe, status hitung total). Saldo tidak bisa diedit di sini. */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const userId = requireUserId(locals);
	const body = (await request.json().catch(() => null)) as {
		name?: string;
		type?: string;
		isIncludedInTotal?: boolean;
	} | null;
	if (!body) throw error(400, { message: 'Body harus JSON.', code: 'E_BAD_BODY' });

	const fields: string[] = [];
	const values: any[] = [];

	if (typeof body.name === 'string') {
		const name = body.name.trim();
		if (name.length < 2 || name.length > 100) {
			throw error(400, { message: 'Nama dompet wajib 2-100 karakter.', code: 'E_BAD_WALLET_NAME' });
		}
		values.push(name);
		fields.push(`name = $${values.length}`);
	}
	if (typeof body.type === 'string') {
		const typeCode = body.type.trim();
		if (typeCode.length < 2) {
			throw error(400, { message: 'Tipe dompet wajib dipilih.', code: 'E_BAD_WALLET_TYPE' });
		}
		const walletType = await resolveWalletTypeId(db, userId, typeCode);
		values.push(walletType.id);
		fields.push(`type = $${values.length}::uuid`);
	}
	if (typeof body.isIncludedInTotal === 'boolean') {
		values.push(body.isIncludedInTotal);
		fields.push(`is_included_in_total = $${values.length}`);
	}
	if (fields.length === 0) {
		throw error(400, { message: 'Tidak ada perubahan yang dikirim.', code: 'E_NOTHING_TO_UPDATE' });
	}

	values.push(params.id);
	values.push(userId);

	const rows = await db.unsafe<WalletRow[]>(
		`UPDATE wallets
		 SET ${fields.join(', ')}, updated_at = NOW()
		 WHERE id = $${values.length - 1}::uuid AND user_id = $${values.length}
		 RETURNING id, name, type, is_included_in_total,
		           (SELECT label FROM wallet_types WHERE id = wallets.type) AS type_label`,
		values
	);
	if (rows.length === 0) {
		throw error(404, { message: 'Dompet tidak ditemukan.', code: 'E_WALLET_NOT_FOUND' });
	}

	const r = rows[0];
	return new Response(
		JSON.stringify({
			id: r.id,
			name: r.name,
			type: r.type,
			typeLabel: r.type_label ?? r.type,
			isIncludedInTotal: r.is_included_in_total
		}),
		{ headers: { 'content-type': 'application/json' } }
	);
};

/** Hapus dompet milik pengguna; ditolak bila masih dipakai transaksi. */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const userId = requireUserId(locals);

	const rows = await db<{ id: string }[]>`
		SELECT id FROM wallets WHERE id = ${params.id}::uuid AND user_id = ${userId}
	`;
	if (rows.length === 0) {
		throw error(404, { message: 'Dompet tidak ditemukan.', code: 'E_WALLET_NOT_FOUND' });
	}
	const id = rows[0].id;

	const used = await db`
		SELECT 1 FROM transactions
		WHERE wallet_id = ${id}::uuid OR destination_wallet_id = ${id}::uuid
		LIMIT 1
	`;
	if (used.length > 0) {
		throw error(409, {
			message: 'Dompet masih dipakai transaksi dan tidak bisa dihapus.',
			code: 'E_WALLET_USED'
		});
	}

	await db`DELETE FROM wallets WHERE id = ${id}::uuid AND user_id = ${userId}`;

	return new Response(null, { status: 204 });
};
