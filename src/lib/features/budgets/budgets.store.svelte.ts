import type { BudgetInput, BudgetStatusRow } from '#lib/shared/models/domain';
import { i18n } from '#lib/shared/i18n/i18n.service.svelte';
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
			this.error = i18n.t('budget.failedLoad');
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
