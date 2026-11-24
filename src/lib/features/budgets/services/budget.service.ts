import { httpClient } from '#lib/core/api/http-client';
import type { BudgetInput, BudgetStatusRow } from '#lib/shared/models/domain';

class BudgetService {
	async list(): Promise<BudgetStatusRow[]> {
		return httpClient.get<BudgetStatusRow[]>('/api/budgets');
	}

	async create(input: BudgetInput): Promise<void> {
		await httpClient.post('/api/budgets', input);
	}

	/** UPDATE sejati pada /api/budgets/[id] (id budget tetap). */
	async update(id: string, input: BudgetInput): Promise<void> {
		await httpClient.put(`/api/budgets/${id}`, input);
	}

	async remove(id: string): Promise<void> {
		await httpClient.delete(`/api/budgets/${id}`);
	}
}

export const budgetService = new BudgetService();
