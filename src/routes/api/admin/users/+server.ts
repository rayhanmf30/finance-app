import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireAdmin } from '#lib/server/session';
import { hashPassword, validateEmail, validatePassword } from '#lib/server/auth';
import type { RequestHandler } from './$types';

interface AdminUserRow {
	id: string;
	name: string;
	email: string;
	role: 'user' | 'admin';
	is_blocked: boolean;
	block_reason: string | null;
	created_at: Date;
	transaction_count: number;
	wallet_count: number;
	budget_count: number;
}

export const GET: RequestHandler = async ({ locals, url }) => {
	requireAdmin(locals);

	const query = (url.searchParams.get('query') ?? '').trim();
	const pattern = `%${query}%`;

	const rows = await db<AdminUserRow[]>`
		SELECT u.id, u.name, u.email, u.role, u.is_blocked, u.block_reason, u.created_at,
			(SELECT count(*) FROM transactions t WHERE t.user_id = u.id)::int AS transaction_count,
			(SELECT count(*) FROM wallets w WHERE w.user_id = u.id)::int AS wallet_count,
			(SELECT count(*) FROM budgets b WHERE b.user_id = u.id)::int AS budget_count
		FROM users u
		WHERE ${query} = ''
			OR u.name ILIKE ${pattern}
			OR u.email ILIKE ${pattern}
		ORDER BY u.created_at
	`;

	return json(
		rows.map((u) => ({
			id: u.id,
			name: u.name,
			email: u.email,
			role: u.role,
			isBlocked: u.is_blocked,
			blockReason: u.block_reason,
			createdAt: new Date(u.created_at).toISOString(),
			transactionCount: u.transaction_count,
			walletCount: u.wallet_count,
			budgetCount: u.budget_count
		}))
	);
};

// ---- Buat akun baru (admin) ----
interface CreateAccountInput {
	name?: string;
	email?: string;
	password?: string;
	role?: string;
}

export const POST: RequestHandler = async ({ locals, request }) => {
	requireAdmin(locals);

	const body = (await request.json().catch(() => null)) as CreateAccountInput | null;
	if (!body) throw error(400, 'Body harus JSON.');

	const name = (body.name ?? '').trim();
	const email = (body.email ?? '').trim().toLowerCase();
	const password = body.password ?? '';
	const role = body.role === 'admin' ? 'admin' : 'user';

	if (name.length < 2 || name.length > 150) {
		throw error(400, 'Nama wajib diisi (2-150 karakter).');
	}
	if (!validateEmail(email)) {
		throw error(400, 'Format email tidak valid.');
	}
	if (!validatePassword(password)) {
		throw error(400, 'Password minimal 8 karakter dan mengandung huruf serta angka.');
	}

	try {
		const rows = await db<{ id: string; name: string; email: string; role: 'user' | 'admin' }[]>`
			INSERT INTO users (name, email, password_hash, role)
			VALUES (${name}, ${email}, ${hashPassword(password)}, ${role})
			RETURNING id, name, email, role
		`;
		const user = rows[0];

		// Dompet awal agar akun baru langsung bisa mencatat transaksi (sama seperti registrasi).
		await db`
			INSERT INTO wallets (user_id, name, type, currency, current_balance, is_included_in_total)
			VALUES (${user.id}, 'Dompet Tunai', 'CASH', 'IDR', 0, TRUE)
		`;

		return json({ id: user.id, name: user.name, email: user.email, role: user.role }, { status: 201 });
	} catch (err) {
		const code = (err as { code?: string }).code;
		if (code === '23505') {
			throw error(409, 'Email sudah terdaftar.');
		}
		throw err;
	}
};
