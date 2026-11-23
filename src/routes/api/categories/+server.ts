import { json } from '@sveltejs/kit';
import { demoUserId } from '#lib/server/auth';
import { db } from '#lib/server/db';

export async function GET() {
	const rows = await db`
		SELECT id, parent_id, name, type, color
		FROM categories
		WHERE user_id IS NULL OR user_id = ${demoUserId}
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
