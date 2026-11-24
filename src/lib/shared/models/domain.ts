export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type CategoryType = 'INCOME' | 'EXPENSE';
/** Kode tipe dompet dinamis — dikelola admin di tabel wallet_types. */
export type WalletType = string;
export interface WalletTypeInfo {
	code: string;
	label: string;
	isActive: boolean;
	walletCount: number;
}

export type UserRole = 'user' | 'admin';

export interface AdminUser {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	isBlocked: boolean;
	blockReason: string | null;
	createdAt: string;
	transactionCount: number;
	walletCount: number;
	budgetCount: number;
}

export interface AdminCategory {
	id: string;
	ownerId: string | null;
	parentId: string | null;
	name: string;
	type: CategoryType;
	color: string | null;
	transactionCount: number;
	childCount: number;
}

/** Dompet milik pengguna, dilihat dari panel admin (tabel `wallets`). */
export interface AdminWallet {
	id: string;
	ownerId: string;
	ownerName: string;
	ownerEmail: string;
	name: string;
	type: string;
	/** Label tipe dari tabel wallet_types. */
	typeLabel: string | null;
	currency: string;
	currentBalance: number;
	isIncludedInTotal: boolean;
	/** Jumlah transaksi yang memakai dompet ini (juga sebagai dompet tujuan). */
	transactionCount: number;
	createdAt: string;
}

export type BudgetPeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type BudgetStatusType = 'SAFE' | 'WARNING' | 'EXCEEDED';

export interface Wallet {
	id: string;
	name: string;
	type: WalletType;
	/** Label tipe dari tabel wallet_types (dikelola admin). */
	typeLabel?: string;
	currency: string;
	currentBalance: number;
}

export interface Category {
	id: string;
	parentId: string | null;
	name: string;
	type: CategoryType;
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
	/** Rincian barang (dari scan resi) — tersedia via GET /api/transactions/[id]. */
	items?: ReceiptItemInput[];
}

export interface TransactionInput {
	walletId: string;
	destinationWalletId?: string | null;
	categoryId?: string | null;
	type: TransactionType;
	amount: number;
	transactionDate: string;
	note?: string;
	/** Rincian barang belanja (serta dari scan resi) — disimpan ke tabel transaction_items. */
	items?: ReceiptItemInput[];
}

export interface ReceiptItemInput {
	name: string;
	quantity: number;
	unitPrice: number;
	/** Diskon harga per item (>= 0). */
	discount?: number;
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
	categoryId: string | null;
	categoryName: string;
	color: string;
	total: number;
	percentage: number;
}

export interface BudgetStatusRow {
	budgetId: string;
	/** Kategori yang dicakup budget; kosong = global (semua pengeluaran). */
	categoryIds: string[];
	categoryNames: string[];
	periodType: BudgetPeriodType;
	periodKey: string;
	limitAmount: number;
	spentAmount: number;
	remainingAmount: number;
	usagePercentage: number;
	status: BudgetStatusType;
}

export interface BudgetInput {
	/** Sudah kategori terpilih; array kosong = budget global (semua pengeluaran). */
	categoryIds: string[];
	periodType: BudgetPeriodType;
	limitAmount: number;
	warningThresholdPct: number;
}

export interface DashboardData {
	summary: CashflowSummary;
	breakdown: CategoryBreakdown[];
	totalBalance: number;
	budgets: BudgetStatusRow[];
}

export interface ReceiptItem {
	name: string;
	quantity: number;
	unitPrice: number;
	/** Diskon per item (mis. potongan member) — hasil ekstraksi struk. */
	discount: number;
	/** Harga total item setelah diskon (quantity × unitPrice − discount). */
	subtotal: number;
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
