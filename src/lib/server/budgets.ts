import { error } from '@sveltejs/kit';
import type { ISql } from 'postgres';
import { db } from './db';

/**
 * Helper CRUD budgets (dipakai POST /api/budgets dan /api/budgets/[id]).
 * Validasi + penulisan relasi kategori dibagi agar POST/PUT konsisten.
 */
export interface ParsedBudgetInput {
	/** Budget tanpa kategori = global (semua pengeluaran). */
	categoryIds: string[];
	periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
	limit: number;
	threshold: number;
}

export function parseBudgetInput(body: unknown): ParsedBudgetInput {
	const {
		categoryIds,
		periodType,
		limitAmount,
		warningThresholdPct
	} = (body ?? {}) as Record<string, unknown>;

	if (typeof periodType !== 'string' || !['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(periodType)) {
		throw error(400, { message: 'Tipe periode tidak valid.', code: 'E_BAD_PERIOD' });
	}

	const limit = Number(limitAmount);
	if (!Number.isFinite(limit) || limit <= 0) {
		throw error(400, { message: 'Limit budget harus lebih besar dari nol.', code: 'E_BAD_LIMIT' });
	}

	const threshold = Number(warningThresholdPct ?? 80);
	if (!Number.isInteger(threshold) || threshold < 1 || threshold > 100) {
		throw error(400, { message: 'Threshold peringatan harus 1-100.', code: 'E_BAD_THRESHOLD' });
	}

	// Catatan: interpolasi array di postgres.js harus via = ANY(...), bukan IN (...) —
	// pola `IN ${array}` menghasilkan syntax error (lihat transaksi lock dompet).
	const ids: string[] = Array.isArray(categoryIds)
		? categoryIds.filter(
				(v): v is string => (typeof v === 'string' && v !== '')
			)
		: [];
	return {
		categoryIds: [...new Set(ids)],
		// Sudah divalidasi daftar di atas — aman di-cast ke union periode.
		periodType: periodType as ParsedBudgetInput['periodType'],
		limit,
		threshold
	};
}

/** Validasi semua kategori: EXPENSE milik user atau sistem. */
export async function assertCategoriesValid(
	tx: ISql,
	userId: string,
	categoryIds: string[]
): Promise<void> {
	if (categoryIds.length === 0) return;
	const owned = await tx<{ id: string }[]>`
		SELECT id FROM categories
		WHERE id = ANY(${categoryIds})
			AND type = 'EXPENSE'
			AND (user_id IS NULL OR user_id = ${userId})
	`;
	if (owned.length !== categoryIds.length) {
		throw error(400, { message: 'Satu atau lebih kategori tidak ditemukan atau bukan kategori pengeluaran.', code: 'E_CATEGORY_NOT_FOUND' });
	}
}

/** Pastikan budget ada dan milik user; kembalikan id. */
export async function assertBudgetOwner(userId: string, budgetId: string): Promise<void> {
	const owned = await db<{ id: string }[]>`
		SELECT id FROM budgets WHERE id = ${budgetId} AND user_id = ${userId}
	`;
	if (owned.length === 0) {
		throw error(404, { message: 'Budget tidak ditemukan.', code: 'E_BUDGET_NOT_FOUND' });
	}
}
