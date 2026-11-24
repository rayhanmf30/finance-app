import { error } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireUserId } from '#lib/server/session';
import type { RequestHandler } from './$types';

interface WalletTypeRow {
	code: string;
	label: string;
	is_active: boolean;
}

function normalizeCode(raw: string): string {
	return raw.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20);
}

/** Edit tipe dompet MILIK pengguna login (global admin tidak boleh diubah dari sini). */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const userId = requireUserId(locals);
	const body = (await request.json().catch(() => null)) as {
		code?: string;
		label?: string;
		isActive?: boolean;
	} | null;
	if (!body) throw error(400, { message: 'Body harus JSON.', code: 'E_BAD_BODY' });

	const fields: string[] = [];
	const values: any[] = [];

	if (typeof body.label === 'string') {
		const label = body.label.trim();
		if (label.length < 2 || label.length > 50) {
			throw error(400, { message: 'Label wajib 2-50 karakter.', code: 'E_WT_BAD_LABEL' });
		}
		values.push(label);
		fields.push(`label = $${values.length}`);
	}
	if (typeof body.code === 'string') {
		const code = normalizeCode(body.code);
		if (code.length < 2 || code.length > 20) {
			throw error(400, { message: 'Kode wajib 2-20 karakter (huruf besar, angka, underscore).', code: 'E_WT_BAD_CODE' });
		}
		values.push(code);
		fields.push(`code = $${values.length}`);
	}
	if (typeof body.isActive === 'boolean') {
		values.push(body.isActive);
		fields.push(`is_active = $${values.length}`);
	}
	if (fields.length === 0) {
		throw error(400, { message: 'Tidak ada perubahan yang dikirim.', code: 'E_NOTHING_TO_UPDATE' });
	}

	values.push(params.id);
	values.push(userId);

	try {
		const rows = await db.unsafe<WalletTypeRow[]>(
			`UPDATE wallet_types
			 SET ${fields.join(', ')}
			 WHERE id = $${values.length - 1}::uuid AND user_id = $${values.length}
			 RETURNING code, label, is_active`,
			values
		);
		if (rows.length === 0) {
			throw error(404, { message: 'Tipe dompet tidak ditemukan.', code: 'E_WT_NOT_FOUND' });
		}
		const r = rows[0];
		return new Response(JSON.stringify({ code: r.code, label: r.label, isActive: r.is_active }), {
			headers: { 'content-type': 'application/json' }
		});
	} catch (err) {
		// unique (user_id, code) — kode bentrok dengan tipe lain milik pengguna/global.
		if ((err as { code?: string }).code === '23505') {
			throw error(409, { message: 'Kode tipe dompet sudah terpakai.', code: 'E_WT_CONFLICT' });
		}
		throw err;
	}
};

/** Hapus tipe dompet milik pengguna; ditolak bila masih dipakai dompet. */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const userId = requireUserId(locals);

	const used = await db`
		SELECT 1 FROM wallets w
		JOIN wallet_types wt ON wt.id = w.type
		WHERE wt.id = ${params.id}::uuid AND wt.user_id = ${userId}
		LIMIT 1
	`;
	if (used.length > 0) {
		throw error(409, {
			message: 'Tipe dompet masih dipakai oleh dompet Anda dan tidak bisa dihapus.',
			code: 'E_WT_USED'
		});
	}

	const rows = await db<{ code: string }[]>`
		DELETE FROM wallet_types WHERE id = ${params.id}::uuid AND user_id = ${userId} RETURNING code
	`;
	if (rows.length === 0) {
		throw error(404, { message: 'Tipe dompet tidak ditemukan.', code: 'E_WT_NOT_FOUND' });
	}

	return new Response(null, { status: 204 });
};
