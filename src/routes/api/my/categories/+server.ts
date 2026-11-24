import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireUserId } from '#lib/server/session';
import type { RequestHandler } from './$types';

interface CategoryRow {
	id: string;
	parent_id: string | null;
	name: string;
	type: string;
	color: string | null;
	transaction_count: number;
	child_count: number;
}

/** Daftar kategori MILIK pengguna login (tanpa kategori sistem). */
export const GET: RequestHandler = async ({ locals, url }) => {
	const userId = requireUserId(locals);
	const query = (url.searchParams.get('q') ?? '').trim();
	const pattern = `%${query}%`;

	const rows = await db<CategoryRow[]>`
		SELECT c.id, c.parent_id, c.name, c.type, c.color,
			(SELECT count(*) FROM transactions t WHERE t.category_id = c.id)::int AS transaction_count,
			(SELECT count(*) FROM categories sub WHERE sub.parent_id = c.id AND sub.user_id = c.user_id)::int AS child_count
		FROM categories c
		WHERE c.user_id = ${userId}
			AND (${query} = '' OR c.name ILIKE ${pattern})
		ORDER BY c.name
	`;

	return json(
		rows.map((r) => ({
			id: r.id,
			parentId: r.parent_id,
			name: r.name,
			type: r.type,
			color: r.color,
			transactionCount: r.transaction_count,
			childCount: r.child_count
		}))
	);
};

/** Tambah kategori milik pengguna (INCOME/EXPENSE, opsional kategori induk miliknya). */
export const POST: RequestHandler = async ({ locals, request }) => {
	const userId = requireUserId(locals);
	const body = (await request.json().catch(() => null)) as {
		name?: string;
		type?: string;
		parentId?: string;
	} | null;
	if (!body) throw error(400, { message: 'Body harus JSON.', code: 'E_BAD_BODY' });

	const name = String(body.name ?? '').trim();
	const type = String(body.type ?? '').trim().toUpperCase();
	const parentId = body.parentId ? String(body.parentId).trim() : '';

	if (name.length < 2 || name.length > 100) {
		throw error(400, { message: 'Nama kategori wajib 2-100 karakter.', code: 'E_CAT_BAD_NAME' });
	}
	if (!['INCOME', 'EXPENSE'].includes(type)) {
		throw error(400, { message: 'Tipe kategori wajib INCOME atau EXPENSE.', code: 'E_CAT_BAD_TYPE' });
	}

	let parentType: string | null = null;
	if (parentId) {
		const parent = await db<{ type: string }[]>`
			SELECT type FROM categories WHERE id = ${parentId} AND user_id = ${userId}
		`;
		if (parent.length === 0) {
			throw error(400, { message: 'Kategori induk tidak ditemukan.', code: 'E_CAT_NOT_FOUND' });
		}
		parentType = parent[0].type;
	}
	const effectiveType = parentType ?? type;

	const [created] = await db<{ id: string }[]>`
		INSERT INTO categories (user_id, parent_id, name, type)
		-- NULLIF: param null tidak bisa lewat template postgres.js; '' -> NULL di SQL.
		VALUES (${userId}, NULLIF(${parentId}, '')::uuid, ${name}, ${effectiveType})
		RETURNING id
	`;

	return json({ id: created.id }, { status: 201 });
};
