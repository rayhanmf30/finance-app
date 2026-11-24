import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const userId = locals.userId;
	if (!userId) throw error(401, { message: 'Belum login.', code: 'E_UNAUTHORIZED' });

	const rows = await db`
		SELECT id, name, email, default_currency, role, is_blocked, block_reason
		FROM users
		WHERE id = ${userId}
	`;
	if (rows.length === 0) throw error(401, { message: 'Sesi tidak valid.', code: 'E_SESSION_INVALID' });

	const u = rows[0];
	if (u.is_blocked) throw error(403, { message: u.block_reason || 'Akun Anda diblokir oleh admin.', code: 'E_BLOCKED' });
	return json({
		id: u.id,
		name: u.name,
		email: u.email,
		defaultCurrency: u.default_currency,
		role: u.role
	});
};
