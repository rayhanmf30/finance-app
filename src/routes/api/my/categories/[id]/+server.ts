import { error } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireUserId } from '#lib/server/session';
import type { RequestHandler } from './$types';

interface CategoryRow {
	id: string;
	name: string;
	type: string;
}

/** Edit kategori MILIK pengguna login (kategori sistem tidak boleh lewat sini). */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const userId = requireUserId(locals);
	const body = (await request.json().catch(() => null)) as {
		name?: string;
		type?: string;
	} | null;
	if (!body) throw error(400, { message: 'Body harus JSON.', code: 'E_BAD_BODY' });

	const fields: string[] = [];
	const values: any[] = [];

	if (typeof body.name === 'string') {
		const name = body.name.trim();
		if (name.length < 2 || name.length > 100) {
			throw error(400, { message: 'Nama kategori wajib 2-100 karakter.', code: 'E_CAT_BAD_NAME' });
		}
		values.push(name);
		fields.push(`name = $${values.length}`);
	}
	if (typeof body.type === 'string') {
		const type = body.type.trim().toUpperCase();
		if (!['INCOME', 'EXPENSE'].includes(type)) {
			throw error(400, { message: 'Tipe kategori wajib INCOME atau EXPENSE.', code: 'E_CAT_BAD_TYPE' });
		}
		values.push(type);
		fields.push(`type = $${values.length}`);
	}
	if (fields.length === 0) {
		throw error(400, { message: 'Tidak ada perubahan yang dikirim.', code: 'E_NOTHING_TO_UPDATE' });
	}

	values.push(params.id);
	values.push(userId);

	const rows = await db.unsafe<CategoryRow[]>(
		`UPDATE categories
		 SET ${fields.join(', ')}, updated_at = NOW()
		 WHERE id = $${values.length - 1}::uuid AND user_id = $${values.length}
		 RETURNING id, name, type`,
		values
	);
	if (rows.length === 0) {
		throw error(404, { message: 'Kategori tidak ditemukan.', code: 'E_CAT_NOT_FOUND' });
	}

	const r = rows[0];
	return new Response(JSON.stringify({ id: r.id, name: r.name, type: r.type }), {
		headers: { 'content-type': 'application/json' }
	});
};

/** Hapus kategori milik pengguna; ditolak bila dipakai transaksi atau punya sub-kategori. */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const userId = requireUserId(locals);

	const rows = await db<{ id: string }[]>`
		SELECT id FROM categories WHERE id = ${params.id}::uuid AND user_id = ${userId}
	`;
	if (rows.length === 0) {
		throw error(404, { message: 'Kategori tidak ditemukan.', code: 'E_CAT_NOT_FOUND' });
	}
	const id = rows[0].id;

	const used = await db`
		SELECT 1 FROM transactions WHERE category_id = ${id}::uuid LIMIT 1
	`;
	if (used.length > 0) {
		throw error(409, {
			message: 'Kategori masih dipakai transaksi dan tidak bisa dihapus.',
			code: 'E_CAT_USED'
		});
	}

	const child = await db`SELECT 1 FROM categories WHERE parent_id = ${id}::uuid LIMIT 1`;
	if (child.length > 0) {
		throw error(409, {
			message: 'Kategori masih memiliki sub-kategori; hapus terlebih dahulu sub-kategorinya.',
			code: 'E_CAT_HAS_CHILDREN'
		});
	}

	await db`DELETE FROM categories WHERE id = ${id}::uuid AND user_id = ${userId}`;

	return new Response(null, { status: 204 });
};
