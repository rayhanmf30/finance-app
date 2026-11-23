import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import {
	getCashflowSummary,
	getCategoryBreakdown,
	getTotalBalance
} from '#lib/server/dashboard';
import { computeBudgetStatuses } from '#lib/server/transactions';
import { requireUserId } from '#lib/server/session';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const userId = requireUserId(locals);
	const year = Number(url.searchParams.get('year'));
	const month = Number(url.searchParams.get('month'));

	if (!year || !month || month < 1 || month > 12) {
		throw error(400, 'Parameter year dan month wajib valid.');
	}

	const start = new Date(year, month - 1, 1);
	const end = new Date(year, month, 1);

	const [summary, breakdown, totalBalance, budgets] = await Promise.all([
		getCashflowSummary(userId, start, end),
		getCategoryBreakdown(userId, start, end),
		getTotalBalance(userId),
		computeBudgetStatuses(db, userId, new Date())
	]);

	return json({ summary, breakdown, totalBalance, budgets });
};
