import type { Transaction, TransactionFilter } from '#lib/shared/models/domain';
import { transactionService } from './services/transaction.service';

function currentMonthValue(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

class TransactionStore {
	transactions = $state<Transaction[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);
	filter = $state<TransactionFilter>({ month: currentMonthValue(), query: '' });

	async refresh(): Promise<void> {
		this.loading = true;
		this.error = null;
		try {
			this.transactions = await transactionService.list(this.filter);
		} catch {
			this.error = 'Gagal memuat transaksi.';
		} finally {
			this.loading = false;
		}
	}

	async remove(id: string): Promise<void> {
		await transactionService.remove(id);
		await this.refresh();
	}

	setFilter(partial: Partial<TransactionFilter>): void {
		this.filter = { ...this.filter, ...partial };
	}
}

export const transactionStore = new TransactionStore();
