import type { BudgetInput, BudgetStatusRow } from '#lib/shared/models/domain';
import { budgetService } from './services/budget.service';

class BudgetStore {
	rows = $state<BudgetStatusRow[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);

	async refresh(): Promise<void> {
		this.loading = true;
		this.error = null;
		try {
			this.rows = await budgetService.list();
		} catch {
			this.error = 'Gagal memuat budget.';
		} finally {
			this.loading = false;
		}
	}

	async create(input: BudgetInput): Promise<void> {
		await budgetService.create(input);
		await this.refresh();
	}
}

export const budgetStore = new BudgetStore();
