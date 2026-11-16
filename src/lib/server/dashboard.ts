import { db } from './db';
import { mapTransaction, type TransactionRow } from './transactions';

export async function getCashflowSummary(userId: string, start: Date, end: Date) {
	const rows = await db`
		SELECT
			COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) AS total_income,
			COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS total_expense
		FROM transactions
		WHERE user_id = ${userId}
			AND transaction_date >= ${start}
			AND transaction_date < ${end}
	`;

	const totalIncome = Number(rows[0].total_income);
	const totalExpense = Number(rows[0].total_expense);
	return { totalIncome, totalExpense, netCashflow: totalIncome - totalExpense };
}

export interface CategoryBreakdownRow {
	category_id: string | null;
	category_name: string | null;
	color: string | null;
	total: string;
}

export async function getCategoryBreakdown(userId: string, start: Date, end: Date) {
	const rows = await db<CategoryBreakdownRow[]>`
		SELECT
			t.category_id,
			COALESCE(c.name, 'Tanpa Kategori') AS category_name,
			COALESCE(c.color, '#94a3b8') AS color,
			SUM(t.amount) AS total
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE t.user_id = ${userId}
			AND t.type = 'EXPENSE'
			AND t.transaction_date >= ${start}
			AND t.transaction_date < ${end}
		GROUP BY t.category_id, c.name, c.color
		ORDER BY SUM(t.amount) DESC
	`;

	const grandTotal = rows.reduce((sum, row) => sum + Number(row.total), 0);

	return rows.map((row) => ({
		categoryId: row.category_id,
		categoryName: row.category_name ?? 'Tanpa Kategori',
		color: row.color ?? '#94a3b8',
		total: Number(row.total),
		percentage: grandTotal > 0 ? (Number(row.total) / grandTotal) * 100 : 0
	}));
}

export async function getTotalBalance(userId: string) {
	const rows = await db`
		SELECT COALESCE(SUM(current_balance), 0) AS total
		FROM wallets
		WHERE user_id = ${userId} AND is_included_in_total = TRUE
	`;
	return Number(rows[0].total);
}

export async function getRecentTransactions(userId: string, limit = 5) {
	const rows = await db<TransactionRow[]>`
		SELECT id, wallet_id, destination_wallet_id, category_id, type, amount, transaction_date, note
		FROM transactions
		WHERE user_id = ${userId}
		ORDER BY transaction_date DESC
		LIMIT ${limit}
	`;
	return rows.map(mapTransaction);
}
