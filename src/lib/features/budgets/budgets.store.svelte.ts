import type { BudgetInput, BudgetStatusRow } from '#lib/shared/models/domain';
import { i18n } from '#lib/shared/i18n/i18n.service.svelte';
import { toast } from '#lib/shared/toast/toast.store.svelte';
import { budgetService } from './services/budget.service';

class BudgetStore {
	rows = $state<BudgetStatusRow[]>([]);
	loading = $state(false);

	async refresh(): Promise<void> {
		this.loading = true;
		try {
			this.rows = await budgetService.list();
		} catch {
			toast.error(i18n.t('budget.failedLoad')); // notifikasi lewat toast, bukan banner
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
