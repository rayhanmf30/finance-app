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
	const { categoryIds, periodType, limitAmount, warningThresholdPct } = body ?? {};

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

	// Multi-kategori: budget tanpa kategori = global (semua pengeluaran).
	const ids: string[] = Array.isArray(categoryIds) ? categoryIds.filter((v: unknown) => typeof v === 'string' && v !== '') : [];
	const uniqueIds = [...new Set(ids)];
	if (uniqueIds.length > 10) {
		throw error(400, { message: 'Maksimal 10 kategori per budget.', code: 'E_TOO_MANY_CATEGORIES' });
	}

	return db.begin(async (tx) => {
		if (uniqueIds.length > 0) {
			const owned = await tx<{ id: string }[]>`
				SELECT id FROM categories
				WHERE id IN ${uniqueIds}
					AND type = 'EXPENSE'
					AND (user_id IS NULL OR user_id = ${userId})
			`;
			if (owned.length !== uniqueIds.length) {
				throw error(400, { message: 'Satu atau lebih kategori tidak ditemukan atau bukan kategori pengeluaran.', code: 'E_CATEGORY_NOT_FOUND' });
			}
		}

		const rows = await tx`
			INSERT INTO budgets (user_id, period_type, limit_amount, warning_threshold_pct)
			VALUES (${userId}, ${periodType}, ${limit}, ${threshold})
			RETURNING id
		`;
		const budgetId = rows[0].id as string;

		if (uniqueIds.length > 0) {
			await tx`
				INSERT INTO budget_categories (budget_id, category_id)
				SELECT ${budgetId}, id FROM categories WHERE id IN ${uniqueIds}
				ON CONFLICT (budget_id, category_id) DO NOTHING
			`;
		}

		return json({ id: budgetId }, { status: 201 });
	});
};
