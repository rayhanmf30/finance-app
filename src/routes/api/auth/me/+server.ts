import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const userId = locals.userId;
	if (!userId) throw error(401, 'Belum login.');

	const rows = await db`
		SELECT id, name, email, default_currency
		FROM users
		WHERE id = ${userId}
	`;
	if (rows.length === 0) throw error(401, 'Sesi tidak valid.');

	const u = rows[0];
	return json({ id: u.id, name: u.name, email: u.email, defaultCurrency: u.default_currency });
};
