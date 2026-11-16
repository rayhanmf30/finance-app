export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type CategoryType = 'INCOME' | 'EXPENSE';
export type WalletType = 'CASH' | 'BANK' | 'EWALLET' | 'CREDIT_CARD';

export interface Wallet {
	id: string;
	name: string;
	type: WalletType;
	currency: string;
	currentBalance: number;
}

export interface Category {
	id: string;
	name: string;
	type: CategoryType;
	parentId: string | null;
	color: string;
}

export interface Transaction {
	id: string;
	walletId: string;
	destinationWalletId: string | null;
	categoryId: string | null;
	type: TransactionType;
	amount: number;
	transactionDate: string;
	note: string;
}

export interface TransactionInput {
	walletId: string;
	destinationWalletId?: string | null;
	categoryId?: string | null;
	type: TransactionType;
	amount: number;
	transactionDate: string;
	note?: string;
}

export interface TransactionFilter {
	month: string;
	query: string;
}

export interface CashflowSummary {
	totalIncome: number;
	totalExpense: number;
	netCashflow: number;
}

export interface CategoryBreakdown {
	categoryId: string;
	categoryName: string;
	color: string;
	total: number;
	percentage: number;
}

export interface ReceiptItem {
	name: string;
	quantity: number;
	unitPrice: number;
}

export interface ReceiptExtraction {
	merchantName: string;
	transactionDate: string;
	items: ReceiptItem[];
	tax: number;
	discount: number;
	total: number;
	suggestedCategoryId: string | null;
}
