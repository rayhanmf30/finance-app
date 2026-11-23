import { json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireUserId } from '#lib/server/session';

export async function GET({ locals }) {
	const userId = requireUserId(locals);
	const rows = await db`
		SELECT id, name, type, currency, current_balance
		FROM wallets
		WHERE user_id = ${userId}
		ORDER BY created_at
	`;

	return json(
		rows.map((row) => ({
			id: row.id,
			name: row.name,
			type: row.type,
			currency: row.currency,
			currentBalance: Number(row.current_balance)
		}))
	);
}
