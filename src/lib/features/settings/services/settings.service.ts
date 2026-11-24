import { httpClient } from '#lib/core/api/http-client';
import type { Category, Wallet } from '#lib/shared/models/domain';

/**
 * Tipe dompet untuk pengaturan per-pengguna.
 * `isGlobal = true` berarti baris global milik admin (read-only bagi pengguna).
 */
export interface MyWalletType {
	id: string;
	code: string;
	label: string;
	isActive: boolean;
	walletCount: number;
	isGlobal: boolean;
}

/** Kategori milik pengguna login (tanpa kategori sistem). */
export type MyCategory = Category & {
	transactionCount: number;
	childCount: number;
};

export const settingsService = {
	// ---- Kategori milik pengguna ----
	async listCategories(query = ''): Promise<MyCategory[]> {
		const search = query.trim();
		return httpClient.get<MyCategory[]>(
			`/api/my/categories${search ? `?q=${encodeURIComponent(search)}` : ''}`
		);
	},
	async createCategory(body: {
		name: string;
		type: 'INCOME' | 'EXPENSE';
		parentId?: string;
	}): Promise<{ id: string }> {
		return httpClient.post<{ id: string }>('/api/my/categories', body);
	},
	async updateCategory(id: string, body: { name?: string; type?: string }): Promise<void> {
		await httpClient.patch(`/api/my/categories/${id}`, body);
	},
	async deleteCategory(id: string): Promise<void> {
		await httpClient.delete(`/api/my/categories/${id}`);
	},

	// ---- Tipe dompet milik pengguna ----
	async listWalletTypes(query = ''): Promise<MyWalletType[]> {
		const search = query.trim();
		return httpClient.get<MyWalletType[]>(
			`/api/my/wallet-types${search ? `?q=${encodeURIComponent(search)}` : ''}`
		);
	},
	async createWalletType(body: { label: string; code?: string }): Promise<{ id: string }> {
		return httpClient.post<{ id: string }>('/api/my/wallet-types', body);
	},
	async updateWalletType(
		id: string,
		body: { label?: string; code?: string; isActive?: boolean }
	): Promise<void> {
		await httpClient.patch(`/api/my/wallet-types/${id}`, body);
	},
	async deleteWalletType(id: string): Promise<void> {
		await httpClient.delete(`/api/my/wallet-types/${id}`);
	},

	// ---- Dompet milik pengguna ----
	async listWallets(): Promise<Wallet[]> {
		return httpClient.get<Wallet[]>('/api/wallets');
	},
	async createWallet(body: {
		name: string;
		type: string;
		currency?: string;
		initialBalance?: number;
		isIncludedInTotal?: boolean;
	}): Promise<{ id: string }> {
		return httpClient.post<{ id: string }>('/api/wallets', body);
	},
	async updateWallet(
		id: string,
		body: { name?: string; type?: string; isIncludedInTotal?: boolean }
	): Promise<void> {
		await httpClient.patch(`/api/wallets/${id}`, body);
	},
	async deleteWallet(id: string): Promise<void> {
		await httpClient.delete(`/api/wallets/${id}`);
	}
};
