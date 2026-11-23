import { httpClient } from '#lib/core/api/http-client';
import type { ReceiptExtraction } from '#lib/shared/models/domain';

const MAX_DIMENSION = 1600;
const COMPRESSION_QUALITY = 0.8;

class ReceiptParserService {
	async compressImage(file: File): Promise<Blob> {
		const bitmap = await createImageBitmap(file);
		const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(bitmap.width * scale);
		canvas.height = Math.round(bitmap.height * scale);

		const context = canvas.getContext('2d');
		if (!context) throw new Error('Gagal memproses gambar.');
		context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

		return await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(blob) => (blob ? resolve(blob) : reject(new Error('Gagal mengompres gambar.'))),
				'image/jpeg',
				COMPRESSION_QUALITY
			);
		});
	}

	async parse(file: File): Promise<ReceiptExtraction> {
		const compressed = await this.compressImage(file);
		const form = new FormData();
		form.append('receipt', compressed, 'receipt.jpg');
		return httpClient.post<ReceiptExtraction>('/api/receipts/parse', form);
	}
}

export const receiptParserService = new ReceiptParserService();
