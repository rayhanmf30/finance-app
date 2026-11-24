import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { computeBudgetStatuses } from '#lib/server/transactions';
import { requireUserId } from '#lib/server/session';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const userId = requireUserId(locals);
	const budgets = await computeBudgetStatuses(db, userId, new Date());
	return json(budgets);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const userId = requireUserId(locals);
	const body = await request.json();
	const { categoryId, periodType, limitAmount, warningThresholdPct } = body ?? {};

	if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(periodType)) {
		throw error(400, { message: 'Tipe periode tidak valid.', code: 'E_BAD_PERIOD' });
	}

	const limit = Number(limitAmount);
	if (!Number.isFinite(limit) || limit <= 0) {
		throw error(400, 'Limit budget harus lebih besar dari nol.');
	}

	const threshold = Number(warningThresholdPct ?? 80);
	if (!Number.isInteger(threshold) || threshold < 1 || threshold > 100) {
		throw error(400, 'Threshold peringatan harus 1-100.');
	}

	if (categoryId) {
		const owned = await db`
			SELECT 1 FROM categories WHERE id = ${categoryId} AND (user_id IS NULL OR user_id = ${userId})
		`;
		if (owned.length === 0) throw error(400, 'Kategori tidak ditemukan.');
	}

	const rows = await db`
		INSERT INTO budgets (user_id, category_id, period_type, limit_amount, warning_threshold_pct)
		VALUES (${userId}, ${categoryId ?? null}, ${periodType}, ${limit}, ${threshold})
		RETURNING id
	`;

	return json({ id: rows[0].id }, { status: 201 });
};
