import { error, json } from '@sveltejs/kit';
import { verifyPassword } from '#lib/server/auth';
import { createSessionToken, sessionCookie } from '#lib/server/session';
import { db } from '#lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
	if (!body) throw error(400, 'Body harus JSON.');

	const email = (body.email ?? '').trim().toLowerCase();
	const password = body.password ?? '';

	const rows = await db`
		SELECT id, name, email, password_hash, default_currency, role, is_blocked, block_reason
		FROM users
		WHERE email = ${email}
	`;
	if (rows.length === 0 || !rows[0].password_hash || !verifyPassword(password, rows[0].password_hash)) {
		throw error(401, { message: 'Email atau password salah.', code: 'E_INVALID_CREDENTIALS' });
	}
	if (rows[0].is_blocked) {
		throw error(403, { message: rows[0].block_reason || 'Akun Anda diblokir oleh admin.', code: 'E_BLOCKED' });
	}

	const user = rows[0];
	const token = createSessionToken(user.id);
	cookies.set(sessionCookie.name, token, sessionCookie.options);
	return json({
		id: user.id,
		name: user.name,
		email: user.email,
		defaultCurrency: user.default_currency,
		role: user.role
	});
};
