import type { CashflowSummary, CategoryBreakdown } from '#lib/shared/models/domain';
import { currentMonth } from '#lib/shared/pipes/date';
import { dashboardService } from './services/dashboard.service';

class DashboardStore {
	summary = $state<CashflowSummary>({ totalIncome: 0, totalExpense: 0, netCashflow: 0 });
	breakdown = $state<CategoryBreakdown[]>([]);
	totalBalance = $state(0);
	loading = $state(false);
	error = $state<string | null>(null);
	month = $state(currentMonth());

	async refresh(): Promise<void> {
		this.loading = true;
		this.error = null;
		try {
			const [year, month] = this.month.split('-').map(Number);
			const data = await dashboardService.getDashboard(year, month);
			this.summary = data.summary;
			this.breakdown = data.breakdown;
			this.totalBalance = data.totalBalance;
		} catch {
			this.error = 'Gagal memuat ringkasan. Pastikan backend database berjalan.';
		} finally {
			this.loading = false;
		}
	}
}

export const dashboardStore = new DashboardStore();
