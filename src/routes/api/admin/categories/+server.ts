import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireAdmin } from '#lib/server/session';
import type { RequestHandler } from './$types';

interface AdminCategoryRow {
	id: string;
	user_id: string | null;
	parent_id: string | null;
	name: string;
	type: 'INCOME' | 'EXPENSE';
	color: string | null;
	transaction_count: number;
	child_count: number;
}

export const GET: RequestHandler = async ({ locals }) => {
	requireAdmin(locals);

	const rows = await db<AdminCategoryRow[]>`
		SELECT c.id, c.user_id, c.parent_id, c.name, c.type, c.color,
			(SELECT count(*) FROM transactions t WHERE t.category_id = c.id)::int AS transaction_count,
			(SELECT count(*) FROM categories ch WHERE ch.parent_id = c.id)::int AS child_count
		FROM categories c
		ORDER BY c.user_id NULLS FIRST, c.name
	`;

	return json(
		rows.map((c) => ({
			id: c.id,
			ownerId: c.user_id,
			parentId: c.parent_id,
			name: c.name,
			type: c.type,
			color: c.color,
			transactionCount: c.transaction_count,
			childCount: c.child_count
		}))
	);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	requireAdmin(locals);

	const body = (await request.json().catch(() => null)) as {
		name?: string;
		type?: string;
		color?: string;
		parentId?: string;
	} | null;
	if (!body) throw error(400, 'Body harus JSON.');

	const name = (body.name ?? '').trim();
	if (name.length < 2 || name.length > 100) {
		throw error(400, 'Nama kategori wajib 2-100 karakter.');
	}
	if (body.type !== 'INCOME' && body.type !== 'EXPENSE') {
		throw error(400, 'Tipe kategori harus INCOME atau EXPENSE.');
	}
	const type = body.type;

	if (body.parentId) {
		const parents = await db`
			SELECT id, type FROM categories WHERE id = ${body.parentId} AND user_id IS NULL
		`;
		if (parents.length === 0) throw error(400, 'Kategori induk (sistem) tidak ditemukan.');
		if (parents[0].type !== body.type) throw error(400, 'Sub-kategori harus bertipe sama dengan induknya.');
	}

	const parentId = body.parentId ?? '';
	const color = body.color ?? '#64748b';
	const rows = await db`
		INSERT INTO categories (user_id, parent_id, name, type, color)
		VALUES (NULL, NULLIF(${parentId}, '')::uuid, ${name}, ${type}, ${color})
		RETURNING id
	`;
	return json({ id: rows[0].id }, { status: 201 });
};
