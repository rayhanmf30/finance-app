import { json } from '@sveltejs/kit';
import { demoUserId } from '#lib/server/auth';
import { db } from '#lib/server/db';

export async function GET() {
	const rows = await db`
		SELECT id, name, type, currency, current_balance
		FROM wallets
		WHERE user_id = ${demoUserId}
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
