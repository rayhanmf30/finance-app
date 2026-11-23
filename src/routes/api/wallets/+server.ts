import { json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireUserId } from '#lib/server/session';

export async function GET({ locals }) {
	const userId = requireUserId(locals);
	const rows = await db`
		SELECT w.id, w.name, w.type, w.currency, w.current_balance, wt.label AS type_label
		FROM wallets w
		LEFT JOIN wallet_types wt ON wt.code = w.type
		WHERE w.user_id = ${userId}
		ORDER BY w.created_at
	`;

	return json(
		rows.map((row) => ({
			id: row.id,
			name: row.name,
			type: row.type,
			typeLabel: row.type_label ?? row.type,
			currency: row.currency,
			currentBalance: Number(row.current_balance)
		}))
	);
}
