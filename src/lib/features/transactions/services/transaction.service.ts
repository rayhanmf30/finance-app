import { httpClient } from '#lib/core/api/http-client';
import type {
	Category,
	Transaction,
	TransactionFilter,
	TransactionInput,
	Wallet
} from '#lib/shared/models/domain';

class TransactionService {
	async list(filter: TransactionFilter): Promise<Transaction[]> {
		const params = new URLSearchParams({ month: filter.month, query: filter.query });
		return httpClient.get<Transaction[]>(`/api/transactions?${params}`);
	}

	async create(input: TransactionInput): Promise<Transaction> {
		return httpClient.post<Transaction>('/api/transactions', input);
	}

	/** Detail transaksi + rincian barang (transaction_items). */
	async get(id: string): Promise<Transaction> {
		return httpClient.get<Transaction>(`/api/transactions/${id}`);
	}

	async update(id: string, input: TransactionInput): Promise<Transaction> {
		return httpClient.put<Transaction>(`/api/transactions/${id}`, input);
	}

	async remove(id: string): Promise<void> {
		await httpClient.delete<void>(`/api/transactions/${id}`);
	}

	async getWallets(): Promise<Wallet[]> {
		return httpClient.get<Wallet[]>('/api/wallets');
	}

	async getCategories(): Promise<Category[]> {
		return httpClient.get<Category[]>('/api/categories');
	}
}

export const transactionService = new TransactionService();
