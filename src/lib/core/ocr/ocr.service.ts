import type { ReceiptExtraction } from '#lib/shared/models/domain';

export interface OcrProvider {
	extract(image: Blob): Promise<ReceiptExtraction>;
}

export class MockOcrProvider implements OcrProvider {
	async extract(_image: Blob): Promise<ReceiptExtraction> {
		await new Promise((resolve) => setTimeout(resolve, 1500));

		return {
			merchantName: 'Indomaret Kemang',
			transactionDate: new Date().toISOString(),
			items: [
				{ name: 'Indomie Goreng', quantity: 5, unitPrice: 3500, discount: 0, subtotal: 17500 },
				{ name: 'Teh Kotak 250ml', quantity: 2, unitPrice: 5000, discount: 0, subtotal: 10000 },
				{ name: 'Roti Tawar', quantity: 1, unitPrice: 18500, discount: 0, subtotal: 18500 }
			],
			tax: 1900,
			discount: 0,
			total: 43400,
			suggestedCategoryId: 'c-shopping'
		};
	}
}

export class OcrService {
	constructor(private provider: OcrProvider) {}

	parseReceipt(image: Blob): Promise<ReceiptExtraction> {
		return this.provider.extract(image);
	}
}

export const mockOcrService = new OcrService(new MockOcrProvider());
