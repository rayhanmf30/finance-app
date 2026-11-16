import { categories, delay, nextId, transactions, wallets } from '#lib/core/api/mock-db';
import type {
	Transaction,
	TransactionFilter,
	TransactionInput,
	Wallet
} from '#lib/shared/models/domain';

class TransactionService {
	async list(filter: TransactionFilter): Promise<Transaction[]> {
		await delay(200);

		const [year, month] = filter.month.split('-').map(Number);
		const query = filter.query.trim().toLowerCase();

		return transactions
			.filter((transaction) => {
				const date = new Date(transaction.transactionDate);
				const inMonth = date.getFullYear() === year && date.getMonth() + 1 === month;
				if (!inMonth) return false;
				if (!query) return true;
				const category = categories.find((c) => c.id === transaction.categoryId);
				return (
					transaction.note.toLowerCase().includes(query) ||
					(category?.name.toLowerCase().includes(query) ?? false)
				);
			})
			.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
	}

	async create(input: TransactionInput): Promise<Transaction> {
		await delay(150);

		const transaction: Transaction = {
			id: nextId('t'),
			walletId: input.walletId,
			destinationWalletId: input.destinationWalletId ?? null,
			categoryId: input.categoryId ?? null,
			type: input.type,
			amount: input.amount,
			transactionDate: input.transactionDate,
			note: input.note ?? ''
		};

		transactions.push(transaction);
		this.applyBalance(transaction);
		return transaction;
	}

	async remove(id: string): Promise<void> {
		await delay(150);

		const index = transactions.findIndex((t) => t.id === id);
		if (index === -1) throw new Error('Transaksi tidak ditemukan');
		const [removed] = transactions.splice(index, 1);
		this.applyBalance(removed, true);
	}

	private applyBalance(transaction: Transaction, reverse = false): void {
		const sign = reverse ? -1 : 1;
		const source = wallets.find((w) => w.id === transaction.walletId);
		const destination = wallets.find((w) => w.id === transaction.destinationWalletId);

		if (source) {
			if (transaction.type === 'INCOME') source.currentBalance += sign * transaction.amount;
			else source.currentBalance -= sign * transaction.amount;
		}

		if (destination) {
			destination.currentBalance += sign * transaction.amount;
		}
	}

	getWallets(): Wallet[] {
		return wallets;
	}

	getCategories(type?: 'INCOME' | 'EXPENSE') {
		return type ? categories.filter((c) => c.type === type) : categories;
	}
}

export const transactionService = new TransactionService();
