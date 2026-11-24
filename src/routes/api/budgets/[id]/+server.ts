import { json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { assertBudgetOwner, assertCategoriesValid, parseBudgetInput } from '#lib/server/budgets';
import { requireUserId } from '#lib/server/session';
import type { RequestHandler } from './$types';

/** Edit budget (UPDATE sejati: baris & id tetap, relasi kategori diganti). */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const userId = requireUserId(locals);
	const body = await request.json();
	const { categoryIds, periodType, limit, threshold } = parseBudgetInput(body);

	await assertBudgetOwner(userId, params.id);

	return db.begin(async (tx) => {
		await assertCategoriesValid(tx, userId, categoryIds);

		await tx`
			UPDATE budgets
			SET period_type = ${periodType},
				limit_amount = ${limit},
				warning_threshold_pct = ${threshold},
				updated_at = NOW()
			WHERE id = ${params.id}
		`;

		// Ganti seluruh relasi kategori (budget tanpa relasi = global).
		await tx`
			DELETE FROM budget_categories WHERE budget_id = ${params.id}
		`;
		if (categoryIds.length > 0) {
			await tx`
				INSERT INTO budget_categories (budget_id, category_id)
				SELECT ${params.id}, id FROM categories WHERE id = ANY(${categoryIds})
				ON CONFLICT (budget_id, category_id) DO NOTHING
			`;
		}

		return new Response(null, { status: 204 });
	});
};

/** Hapus budget (budget_alerts & budget_categories ikut via ON DELETE CASCADE). */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const userId = requireUserId(locals);
	await assertBudgetOwner(userId, params.id);

	await db`
		DELETE FROM budgets WHERE id = ${params.id}
	`;
	return new Response(null, { status: 204 });
};
