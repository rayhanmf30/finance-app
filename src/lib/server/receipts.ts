import { db } from './db';
import type { ReceiptExtraction } from '#lib/shared/models/domain';

export async function parseReceipt(userId: string): Promise<ReceiptExtraction> {
	const categories = await db`
		SELECT id, name FROM categories
		WHERE (user_id IS NULL OR user_id = ${userId}) AND type = 'EXPENSE'
		ORDER BY name
	`;
	const suggested = categories.find((c) => c.name === 'Belanja') ?? categories[0];

	return {
		merchantName: 'Indomaret Kemang',
		transactionDate: new Date().toISOString(),
		items: [
			{ name: 'Indomie Goreng', quantity: 5, unitPrice: 3500 },
			{ name: 'Teh Kotak 250ml', quantity: 2, unitPrice: 5000 },
			{ name: 'Roti Tawar', quantity: 1, unitPrice: 18500 }
		],
		tax: 1900,
		discount: 0,
		total: 43400,
		suggestedCategoryId: suggested?.id ?? null
	};
}
