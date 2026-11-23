import { error, json } from '@sveltejs/kit';
import { hashPassword, validateEmail, validatePassword } from '#lib/server/auth';
import { ADMIN_EMAILS } from '$app/env/private';
import { createSessionToken, sessionCookie } from '#lib/server/session';
import { db } from '#lib/server/db';
import type { RequestHandler } from './$types';

interface RegisterInput {
	name?: string;
	email?: string;
	password?: string;
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = (await request.json().catch(() => null)) as RegisterInput | null;
	if (!body) throw error(400, 'Body harus JSON.');

	const name = (body.name ?? '').trim();
	const email = (body.email ?? '').trim().toLowerCase();
	const password = body.password ?? '';

	if (name.length < 2 || name.length > 150) {
		throw error(400, 'Nama wajib diisi (2-150 karakter).');
	}
	if (!validateEmail(email)) {
		throw error(400, 'Format email tidak valid.');
	}
	if (!validatePassword(password)) {
		throw error(400, 'Password minimal 8 karakter dan mengandung huruf serta angka.');
	}

	const passwordHash = hashPassword(password);

	// Role admin otomatis untuk user pertama pada database yang masih kosong,
	// atau bila email tercantum di env ADMIN_EMAILS (dipisah koma).
	const [userCount, adminEmails] = await Promise.all([
		db`SELECT count(*)::int AS n FROM users`,
		Promise.resolve((ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean))
	]);
	const role = userCount[0].n === 0 || adminEmails.includes(email) ? 'admin' : 'user';

	try {
		const rows = await db`
			INSERT INTO users (name, email, password_hash, role)
			VALUES (${name}, ${email}, ${passwordHash}, ${role})
			RETURNING id, name, email, role, default_currency
		`;
		const user = rows[0];

		// Dompet awal agar user baru langsung bisa mencatat transaksi.
		await db`
			INSERT INTO wallets (user_id, name, type, currency, current_balance, is_included_in_total)
			VALUES (${user.id}, 'Dompet Tunai', 'CASH', ${user.default_currency}, 0, TRUE)
		`;

		const token = createSessionToken(user.id);
		cookies.set(sessionCookie.name, token, sessionCookie.options);
		return json({ id: user.id, name: user.name, email: user.email, role: user.role, defaultCurrency: user.default_currency }, { status: 201 });
	} catch (err) {
		// unique_violation: email sudah terdaftar.
		const code = (err as { code?: string }).code;
		if (code === '23505') {
			throw error(409, 'Email sudah terdaftar. Silakan login.');
		}
		throw err;
	}
};
