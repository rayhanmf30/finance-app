import type { Transaction, TransactionFilter } from '#lib/shared/models/domain';
import { i18n } from '#lib/shared/i18n/i18n.service.svelte';
import { toast } from '#lib/shared/toast/toast.store.svelte';
import { transactionService } from './services/transaction.service';

function currentMonthValue(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

class TransactionStore {
	transactions = $state<Transaction[]>([]);
	loading = $state(false);
	filter = $state<TransactionFilter>({ month: currentMonthValue(), query: '' });

	async refresh(): Promise<void> {
		this.loading = true;
		try {
			this.transactions = await transactionService.list(this.filter);
		} catch {
			toast.error(i18n.t('tx.failedLoad')); // notifikasi lewat toast, bukan banner
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
