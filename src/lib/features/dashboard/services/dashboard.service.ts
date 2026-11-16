import { categories, delay, wallets } from '#lib/core/api/mock-db';
import { transactions } from '#lib/core/api/mock-db';
import type { CashflowSummary, CategoryBreakdown, Wallet } from '#lib/shared/models/domain';

class DashboardService {
	async getCashflowSummary(year: number, month: number): Promise<CashflowSummary> {
		await delay(200);

		const monthTransactions = transactions.filter((t) => {
			const date = new Date(t.transactionDate);
			return date.getFullYear() === year && date.getMonth() + 1 === month;
		});

		const totalIncome = sum(monthTransactions.filter((t) => t.type === 'INCOME'));
		const totalExpense = sum(monthTransactions.filter((t) => t.type === 'EXPENSE'));

		return { totalIncome, totalExpense, netCashflow: totalIncome - totalExpense };
	}

	async getCategoryBreakdown(year: number, month: number): Promise<CategoryBreakdown[]> {
		await delay(200);

		const expenses = transactions.filter((t) => {
			const date = new Date(t.transactionDate);
			return (
				t.type === 'EXPENSE' && date.getFullYear() === year && date.getMonth() + 1 === month
			);
		});

		const totals = new Map<string, number>();
		for (const expense of expenses) {
			const key = expense.categoryId ?? '';
			totals.set(key, (totals.get(key) ?? 0) + expense.amount);
		}

		const grandTotal = sum(expenses);
		return [...totals.entries()]
			.map(([categoryId, total]) => {
				const category = categories.find((c) => c.id === categoryId);
				return {
					categoryId,
					categoryName: category?.name ?? 'Tanpa Kategori',
					color: category?.color ?? '#94a3b8',
					total,
					percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0
				};
			})
			.sort((a, b) => b.total - a.total);
	}

	async getTotalBalance(): Promise<number> {
		await delay(100);
		return wallets.reduce((total, wallet) => total + wallet.currentBalance, 0);
	}

	getWallets(): Wallet[] {
		return wallets;
	}
}

function sum(items: { amount: number }[]): number {
	return items.reduce((total, item) => total + item.amount, 0);
}

export const dashboardService = new DashboardService();
