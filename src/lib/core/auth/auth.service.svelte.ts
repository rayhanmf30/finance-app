import { goto } from '$app/navigation';
import { httpClient } from '#lib/core/api/http-client';
import type { WalletType } from '#lib/shared/models/domain';

export interface SessionUser {
	id: string;
	name: string;
	email: string;
	defaultCurrency: string;
}

class AuthService {
	currentUser = $state<SessionUser | null>(null);
	/** true setelah percobaan pemuatan session pertama selesai. */
	loaded = $state(false);

	readonly isAuthenticated = $derived(this.currentUser !== null);

	/** Muat user dari server sekali (dipanggil dari layout). */
	async load(): Promise<void> {
		if (this.loaded) return;
		try {
			this.currentUser = await httpClient.get<SessionUser>('/api/auth/me');
		} catch {
			this.currentUser = null;
		} finally {
			this.loaded = true;
		}
	}

	async login(email: string, password: string): Promise<void> {
		this.currentUser = await httpClient.post<SessionUser>('/api/auth/login', { email, password });
	}

	async register(name: string, email: string, password: string): Promise<void> {
		this.currentUser = await httpClient.post<SessionUser>('/api/auth/register', { name, email, password });
	}

	async logout(): Promise<void> {
		try {
			await httpClient.post('/api/auth/logout', {});
		} finally {
			this.currentUser = null;
			await goto('/login');
		}
	}
}

export const authService = new AuthService();

export function walletTypeLabel(type: WalletType): string {
	const labels: Record<WalletType, string> = {
		CASH: 'Tunai',
		BANK: 'Bank',
		EWALLET: 'E-Wallet',
		CREDIT_CARD: 'Kartu Kredit'
	};
	return labels[type];
}
