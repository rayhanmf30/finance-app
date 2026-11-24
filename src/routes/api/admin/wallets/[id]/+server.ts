import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireAdmin } from '#lib/server/session';
import type { RequestHandler } from './$types';

interface AdminWalletRow {
	id: string;
	name: string;
	type: string;
	currency: string;
	is_included_in_total: boolean;
}

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	requireAdmin(locals);

	const body = (await request.json().catch(() => null)) as {
		name?: string;
		type?: string;
		currency?: string;
		isIncludedInTotal?: boolean;
	} | null;
	if (!body) throw error(400, 'Body harus JSON.');

	const fields: string[] = [];
	const values: any[] = [];

	if (typeof body.name === 'string') {
		const name = body.name.trim();
		if (name.length < 2 || name.length > 100) {
			throw error(400, 'Nama dompet wajib 2-100 karakter.');
		}
		values.push(name);
		fields.push(`name = $${values.length}`);
	}
	if (typeof body.type === 'string') {
		const type = body.type.trim();
		const active = await db`SELECT is_active FROM wallet_types WHERE code = ${type}`;
		if (active.length === 0) throw error(404, `Tipe dompet "${type}" tidak ditemukan.`);
		if (!active[0].is_active) throw error(400, `Tipe dompet "${type}" sedang nonaktif.`);
		values.push(type);
		fields.push(`type = $${values.length}`);
	}
	if (typeof body.currency === 'string') {
		const currency = body.currency.trim().toUpperCase();
		if (currency.length !== 3) throw error(400, 'Kode mata uang wajib 3 huruf (mis. IDR).');
		values.push(currency);
		fields.push(`currency = $${values.length}`);
	}
	if (typeof body.isIncludedInTotal === 'boolean') {
		values.push(body.isIncludedInTotal);
		fields.push(`is_included_in_total = $${values.length}`);
	}
	if (fields.length === 0) throw error(400, 'Tidak ada perubahan yang dikirim.');

	values.push(params.id);
	const rows = await db.unsafe<AdminWalletRow[]>(
		`UPDATE wallets
		 SET ${fields.join(', ')}
		 WHERE id = $${values.length}::uuid
		 RETURNING id, name, type, currency, is_included_in_total`,
		values
	);
	if (rows.length === 0) throw error(404, 'Dompet tidak ditemukan.');

	const r = rows[0];
	return json({ id: r.id, name: r.name, type: r.type, currency: r.currency, isIncludedInTotal: r.is_included_in_total });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	requireAdmin(locals);

	const exists = await db`SELECT 1 FROM wallets WHERE id = ${params.id}::uuid`;
	if (exists.length === 0) throw error(404, 'Dompet tidak ditemukan.');

	const used = await db`
		SELECT 1 FROM transactions
		WHERE wallet_id = ${params.id}::uuid OR destination_wallet_id = ${params.id}::uuid
		LIMIT 1
	`;
	if (used.length > 0) {
		throw error(409, 'Dompet masih dipakai transaksi dan tidak bisa dihapus.');
	}

	await db`DELETE FROM wallets WHERE id = ${params.id}::uuid`;

	return new Response(null, { status: 204 });
};
