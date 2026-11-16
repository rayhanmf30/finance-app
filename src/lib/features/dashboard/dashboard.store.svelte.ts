import type { CashflowSummary, CategoryBreakdown } from '#lib/shared/models/domain';
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
			const [summary, breakdown, totalBalance] = await Promise.all([
				dashboardService.getCashflowSummary(year, month),
				dashboardService.getCategoryBreakdown(year, month),
				dashboardService.getTotalBalance()
			]);
			this.summary = summary;
			this.breakdown = breakdown;
			this.totalBalance = totalBalance;
		} finally {
			this.loading = false;
		}
	}
}

export const dashboardStore = new DashboardStore();
