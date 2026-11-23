import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireAdmin } from '#lib/server/session';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	requireAdmin(locals);

	const body = (await request.json().catch(() => null)) as {
		name?: string;
		color?: string;
	} | null;
	if (!body) throw error(400, 'Body harus JSON.');

	const sets: string[] = [];
	const values: any[] = [];
	if (body.name !== undefined) {
		const name = body.name.trim();
		if (name.length < 2 || name.length > 100) throw error(400, 'Nama kategori wajib 2-100 karakter.');
		values.push(name);
		sets.push(`name = $${values.length}`);
	}
	if (body.color !== undefined) {
		if (!/^#[0-9a-fA-F]{6}$/.test(body.color)) throw error(400, 'Format warna harus #RRGGBB.');
		values.push(body.color);
		sets.push(`color = $${values.length}`);
	}
	if (sets.length === 0) throw error(400, 'Tidak ada perubahan yang dikirim.');

	values.push(params.id);
	const rows = await db.unsafe<{ id: string }[]>(
		`UPDATE categories SET ${sets.join(', ')}
		 WHERE id = $${values.length} AND user_id IS NULL
		 RETURNING id`,
		values
	);
	if (rows.length === 0) throw error(404, 'Kategori sistem tidak ditemukan.');
	return json({ id: rows[0].id });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	requireAdmin(locals);

	const rows = await db<{ id: string; has_usages: boolean }[]>`
		SELECT id, EXISTS (
			SELECT 1
			FROM (SELECT 1 AS x UNION ALL SELECT 2) dummy
			JOIN (
				SELECT 1 FROM transactions WHERE category_id = ${params.id}
				UNION ALL SELECT 1 FROM categories WHERE parent_id = ${params.id}
				UNION ALL SELECT 1 FROM budgets WHERE category_id = ${params.id}
				UNION ALL SELECT 1 FROM transaction_items WHERE category_id = ${params.id}
			) usages ON TRUE
		) AS has_usages
		FROM categories
		WHERE id = ${params.id} AND user_id IS NULL
	`;
	if (rows.length === 0) {
		throw error(404, 'Kategori sistem tidak ditemukan.');
	}
	if (rows[0].has_usages) {
		throw error(409, 'Kategori masih dipakai (transaksi, sub-kategori, atau budget) dan tidak bisa dihapus.');
	}

	await db`DELETE FROM categories WHERE id = ${params.id}`;
	return json({ status: 'deleted' });
};
