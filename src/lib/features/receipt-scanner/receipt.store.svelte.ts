import { transactionService } from '#lib/features/transactions/services/transaction.service';
import type { ReceiptExtraction, TransactionInput } from '#lib/shared/models/domain';
import { i18n } from '#lib/shared/i18n/i18n.service.svelte';
import { toast } from '#lib/shared/toast/toast.store.svelte';
import { receiptParserService } from './services/receipt-parser.service';

export type ReceiptStatus = 'idle' | 'uploading' | 'reviewing' | 'saving' | 'saved';

class ReceiptStore {
	status = $state<ReceiptStatus>('idle');
	previewUrl = $state<string | null>(null);
	extraction = $state<ReceiptExtraction | null>(null);

	async upload(file: File): Promise<void> {
		this.reset();
		this.status = 'uploading';

		try {
			this.previewUrl = URL.createObjectURL(file);
			this.extraction = await receiptParserService.parse(file);
			this.status = 'reviewing';
		} catch (err) {
			const detail = err instanceof Error ? err.message : '';
			// Notifikasi gagal ekstraksi lewat toast (panel tetap di fase unggah).
			toast.error(detail ? i18n.t('scan.failedExtract', { detail }) : i18n.t('scan.failedExtractPlain'));
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
			// Gagal simpan: notifikasi toast, review panel tetap terbuka (status kembali 'reviewing').
			toast.error(detail ? i18n.t('scan.failedSave', { detail }) : i18n.t('scan.failedSavePlain'));
			this.status = 'reviewing';
		}
	}

	reset(): void {
		if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
		this.status = 'idle';
		this.previewUrl = null;
		this.extraction = null;
	}
}

export const receiptStore = new ReceiptStore();
