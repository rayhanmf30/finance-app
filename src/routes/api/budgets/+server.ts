import { json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { assertCategoriesValid, parseBudgetInput } from '#lib/server/budgets';
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
	const { categoryIds, periodType, limit, threshold } = parseBudgetInput(body);

	return db.begin(async (tx) => {
		await assertCategoriesValid(tx, userId, categoryIds);

		const rows = await tx`
			INSERT INTO budgets (user_id, period_type, limit_amount, warning_threshold_pct)
			VALUES (${userId}, ${periodType}, ${limit}, ${threshold})
			RETURNING id
		`;
		const budgetId = rows[0].id as string;

		if (categoryIds.length > 0) {
			await tx`
				INSERT INTO budget_categories (budget_id, category_id)
				SELECT ${budgetId}, id FROM categories WHERE id = ANY(${categoryIds})
				ON CONFLICT (budget_id, category_id) DO NOTHING
			`;
		}

		return json({ id: budgetId }, { status: 201 });
	});
};
