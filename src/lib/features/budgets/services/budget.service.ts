import { httpClient } from '#lib/core/api/http-client';
import type { BudgetInput, BudgetStatusRow } from '#lib/shared/models/domain';

class BudgetService {
	async list(): Promise<BudgetStatusRow[]> {
		return httpClient.get<BudgetStatusRow[]>('/api/budgets');
	}

	async create(input: BudgetInput): Promise<void> {
		await httpClient.post('/api/budgets', input);
	}
}

export const budgetService = new BudgetService();
