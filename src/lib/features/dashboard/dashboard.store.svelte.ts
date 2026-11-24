import type { CashflowSummary, CategoryBreakdown } from '#lib/shared/models/domain';
import { i18n } from '#lib/shared/i18n/i18n.service.svelte';
import { toast } from '#lib/shared/toast/toast.store.svelte';
import { currentMonth } from '#lib/shared/pipes/date';
import { dashboardService } from './services/dashboard.service';

class DashboardStore {
	summary = $state<CashflowSummary>({ totalIncome: 0, totalExpense: 0, netCashflow: 0 });
	breakdown = $state<CategoryBreakdown[]>([]);
	totalBalance = $state(0);
	loading = $state(false);
	month = $state(currentMonth());

	async refresh(): Promise<void> {
		this.loading = true;
		try {
			const [year, month] = this.month.split('-').map(Number);
			const data = await dashboardService.getDashboard(year, month);
			this.summary = data.summary;
			this.breakdown = data.breakdown;
			this.totalBalance = data.totalBalance;
		} catch {
			toast.error(i18n.t('dash.failedLoad')); // notifikasi lewat toast, bukan banner
		} finally {
			this.loading = false;
		}
	}
}

export const dashboardStore = new DashboardStore();
