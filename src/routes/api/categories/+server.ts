import { json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireUserId } from '#lib/server/session';

export async function GET({ locals }) {
	const userId = requireUserId(locals);
	const rows = await db`
		SELECT id, parent_id, name, type, color
		FROM categories
		WHERE user_id IS NULL OR user_id = ${userId}
		ORDER BY name
	`;

	return json(
		rows.map((row) => ({
			id: row.id,
			parentId: row.parent_id,
			name: row.name,
			type: row.type,
			color: row.color
		}))
	);
}
