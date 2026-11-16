import type { Category, Transaction, Wallet } from '#lib/shared/models/domain';

const now = new Date();
const iso = (day: number) =>
	new Date(now.getFullYear(), now.getMonth(), day, 12, 0, 0).toISOString();

export const wallets: Wallet[] = [
	{ id: 'w-bca', name: 'BCA Utama', type: 'BANK', currency: 'IDR', currentBalance: 8250000 },
	{ id: 'w-gopay', name: 'GoPay', type: 'EWALLET', currency: 'IDR', currentBalance: 350000 },
	{ id: 'w-cash', name: 'Dompet Tunai', type: 'CASH', currency: 'IDR', currentBalance: 420000 }
];

export const categories: Category[] = [
	{ id: 'c-salary', name: 'Gaji', type: 'INCOME', parentId: null, color: '#16a34a' },
	{ id: 'c-food', name: 'Makan & Minum', type: 'EXPENSE', parentId: null, color: '#f97316' },
	{ id: 'c-coffee', name: 'Kopi & Jajan', type: 'EXPENSE', parentId: 'c-food', color: '#fb923c' },
	{ id: 'c-transport', name: 'Transportasi', type: 'EXPENSE', parentId: null, color: '#3b82f6' },
	{ id: 'c-bills', name: 'Tagihan', type: 'EXPENSE', parentId: null, color: '#a855f7' },
	{ id: 'c-shopping', name: 'Belanja', type: 'EXPENSE', parentId: null, color: '#ec4899' }
];

export const transactions: Transaction[] = [
	{ id: 't-1', walletId: 'w-bca', destinationWalletId: null, categoryId: 'c-salary', type: 'INCOME', amount: 12000000, transactionDate: iso(1), note: 'Gaji bulanan' },
	{ id: 't-2', walletId: 'w-bca', destinationWalletId: null, categoryId: 'c-bills', type: 'EXPENSE', amount: 750000, transactionDate: iso(2), note: 'Listrik & internet' },
	{ id: 't-3', walletId: 'w-bca', destinationWalletId: 'w-gopay', categoryId: null, type: 'TRANSFER', amount: 500000, transactionDate: iso(3), note: 'Top-up GoPay' },
	{ id: 't-4', walletId: 'w-gopay', destinationWalletId: null, categoryId: 'c-coffee', type: 'EXPENSE', amount: 24000, transactionDate: iso(4), note: 'Kopi pagi' },
	{ id: 't-5', walletId: 'w-bca', destinationWalletId: null, categoryId: 'c-food', type: 'EXPENSE', amount: 96000, transactionDate: iso(5), note: 'Makan siang kantor' },
	{ id: 't-6', walletId: 'w-cash', destinationWalletId: null, categoryId: 'c-transport', type: 'EXPENSE', amount: 30000, transactionDate: iso(6), note: 'Bensin' },
	{ id: 't-7', walletId: 'w-gopay', destinationWalletId: null, categoryId: 'c-food', type: 'EXPENSE', amount: 145000, transactionDate: iso(7), note: 'GoFood malam' },
	{ id: 't-8', walletId: 'w-bca', destinationWalletId: null, categoryId: 'c-shopping', type: 'EXPENSE', amount: 620000, transactionDate: iso(8), note: 'Belanja mingguan' },
	{ id: 't-9', walletId: 'w-gopay', destinationWalletId: null, categoryId: 'c-coffee', type: 'EXPENSE', amount: 18000, transactionDate: iso(9), note: 'Jajan sore' },
	{ id: 't-10', walletId: 'w-bca', destinationWalletId: null, categoryId: 'c-transport', type: 'EXPENSE', amount: 12000, transactionDate: iso(10), note: 'Parkir & tol' }
];

let sequence = 11;

export function nextId(prefix: string): string {
	return `${prefix}-${sequence++}`;
}

export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
