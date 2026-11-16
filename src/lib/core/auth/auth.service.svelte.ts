import type { WalletType } from '#lib/shared/models/domain';

export interface SessionUser {
	id: string;
	name: string;
	email: string;
	defaultCurrency: string;
}

const DEMO_USER: SessionUser = {
	id: 'u-demo',
	name: 'Demo User',
	email: 'demo@financeapp.id',
	defaultCurrency: 'IDR'
};

class AuthService {
	currentUser = $state<SessionUser | null>(DEMO_USER);

	readonly isAuthenticated = $derived(this.currentUser !== null);

	signIn(email: string): SessionUser {
		this.currentUser = { ...DEMO_USER, email };
		return this.currentUser;
	}

	signOut(): void {
		this.currentUser = null;
	}

	assertAuthenticated(): SessionUser {
		if (!this.currentUser) {
			throw new Error('Sesi berakhir. Silakan login kembali.');
		}
		return this.currentUser;
	}
}

export function walletTypeLabel(type: WalletType): string {
	const labels: Record<WalletType, string> = {
		CASH: 'Tunai',
		BANK: 'Bank',
		EWALLET: 'E-Wallet',
		CREDIT_CARD: 'Kartu Kredit'
	};
	return labels[type];
}

export const authService = new AuthService();
