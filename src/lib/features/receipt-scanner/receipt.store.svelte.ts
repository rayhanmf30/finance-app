import { transactionService } from '#lib/features/transactions/services/transaction.service';
import type { ReceiptExtraction, TransactionInput } from '#lib/shared/models/domain';
import { receiptParserService } from './services/receipt-parser.service';

export type ReceiptStatus = 'idle' | 'uploading' | 'reviewing' | 'saving' | 'saved';

class ReceiptStore {
	status = $state<ReceiptStatus>('idle');
	previewUrl = $state<string | null>(null);
	extraction = $state<ReceiptExtraction | null>(null);
	error = $state<string | null>(null);

	async upload(file: File): Promise<void> {
		this.reset();
		this.status = 'uploading';
		this.error = null;

		try {
			this.previewUrl = URL.createObjectURL(file);
			this.extraction = await receiptParserService.parse(file);
			this.status = 'reviewing';
		} catch (err) {
			const detail = err instanceof Error ? err.message : '';
			this.error = detail
				? `Gagal mengekstrak resi — ${detail}. Periksa gambar atau konfigurasi GROQ_API_KEY, lalu coba lagi.`
				: 'Gagal mengekstrak resi. Coba gambar lain.';
			this.status = 'idle';
		}
	}

	async save(input: Omit<TransactionInput, 'type'>): Promise<void> {
		this.status = 'saving';

		try {
			await transactionService.create({ ...input, type: 'EXPENSE' });
			this.status = 'saved';
		} catch (err) {
			const detail = err instanceof Error ? err.message : '';
			this.error = detail ? `Gagal menyimpan transaksi — ${detail}` : 'Gagal menyimpan transaksi.';
			this.status = 'reviewing';
		}
	}

	reset(): void {
		if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
		this.status = 'idle';
		this.previewUrl = null;
		this.extraction = null;
		this.error = null;
	}
}

export const receiptStore = new ReceiptStore();
