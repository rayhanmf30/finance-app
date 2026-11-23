import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireAdmin } from '#lib/server/session';
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
