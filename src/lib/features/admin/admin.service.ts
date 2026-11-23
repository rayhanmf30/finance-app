import { httpClient } from '#lib/core/api/http-client';
import type { AdminCategory, AdminUser, WalletTypeInfo } from '#lib/shared/models/domain';

export interface BlockInput {
	isBlocked: boolean;
	blockReason?: string;
}

export interface CategoryInput {
	name: string;
	type: 'INCOME' | 'EXPENSE';
	color?: string;
	parentId?: string;
}

export const adminService = {
	// ---- Users ----
	async listUsers(query = ''): Promise<AdminUser[]> {
		const search = query.trim();
		return httpClient.get<AdminUser[]>(
			`/api/admin/users${search ? `?query=${encodeURIComponent(search)}` : ''}`
		);
	},
	async updateUser(
		id: string,
		body: { isBlocked?: boolean; blockReason?: string; role?: 'user' | 'admin' }
	): Promise<AdminUser> {
		return httpClient.patch<AdminUser>(`/api/admin/users/${id}`, body);
	},

	// ---- Categories ----
	async listCategories(): Promise<AdminCategory[]> {
		return httpClient.get<AdminCategory[]>('/api/admin/categories');
	},
	async createCategory(body: CategoryInput): Promise<{ id: string }> {
		return httpClient.post<{ id: string }>('/api/admin/categories', body);
	},
	async updateCategory(id: string, body: { name?: string; color?: string }): Promise<void> {
		await httpClient.patch<{ id: string }>(`/api/admin/categories/${id}`, body);
	},
	async deleteCategory(id: string): Promise<void> {
		await httpClient.delete(`/api/admin/categories/${id}`);
	},

	// ---- Wallet types ----
	async listWalletTypes(): Promise<WalletTypeInfo[]> {
		return httpClient.get<WalletTypeInfo[]>('/api/admin/wallet-types');
	},
	async createWalletType(code: string, label: string): Promise<void> {
		await httpClient.post('/api/admin/wallet-types', { code, label });
	},
	async updateWalletType(code: string, body: { label?: string; isActive?: boolean }): Promise<void> {
		await httpClient.patch(`/api/admin/wallet-types/${encodeURIComponent(code)}`, body);
	},
	async deleteWalletType(code: string): Promise<void> {
		await httpClient.delete(`/api/admin/wallet-types/${encodeURIComponent(code)}`);
	}
};
