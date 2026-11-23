import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireAdmin } from '#lib/server/session';
import type { RequestHandler } from './$types';

interface WalletTypeRow {
	code: string;
	label: string;
	is_active: boolean;
}

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	requireAdmin(locals);

	const body = (await request.json().catch(() => null)) as {
		label?: string;
		isActive?: boolean;
	} | null;
	if (!body) throw error(400, 'Body harus JSON.');

	const fields: string[] = [];
	const values: any[] = [];

	if (typeof body.label === 'string') {
		const label = body.label.trim();
		if (label.length < 2 || label.length > 50) {
			throw error(400, 'Label wajib 2-50 karakter.');
		}
		values.push(label);
		fields.push(`label = $${values.length}`);
	}
	if (typeof body.isActive === 'boolean') {
		values.push(body.isActive);
		fields.push(`is_active = $${values.length}`);
	}
	if (fields.length === 0) throw error(400, 'Tidak ada perubahan yang dikirim.');

	values.push(params.code);
	const rows = await db.unsafe<WalletTypeRow[]>(
		`UPDATE wallet_types
		 SET ${fields.join(', ')}
		 WHERE code = $${values.length}
		 RETURNING code, label, is_active`,
		values
	);
	if (rows.length === 0) throw error(404, 'Tipe dompet tidak ditemukan.');

	const r = rows[0];
	return json({ code: r.code, label: r.label, isActive: r.is_active });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	requireAdmin(locals);

	const used = await db`SELECT 1 FROM wallets WHERE type = ${params.code} LIMIT 1`;
	if (used.length > 0) {
		throw error(409, 'Tipe dompet masih dipakai oleh beberapa dompet dan tidak bisa dihapus.');
	}

	const rows = await db`DELETE FROM wallet_types WHERE code = ${params.code} RETURNING code`;
	if (rows.length === 0) throw error(404, 'Tipe dompet tidak ditemukan.');

	return new Response(null, { status: 204 });
};
