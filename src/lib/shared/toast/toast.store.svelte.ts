/**
 * Store toast global (singleton).
 *
 * Semua notifikasi hasil aksi (berhasil/gagal/informasi) WAJIB lewat sini —
 * bukan alert(), bukan banner inline (lihat aturan di CONTRIBUTING.md).
 * Validasi field pada form boleh tetap inline karena terikat pada input.
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
	id: number;
	type: ToastType;
	message: string;
}

const DEFAULT_DURATION_MS = 4000;
const INFO_DURATION_MS = 5000;
const ERROR_DURATION_MS = 7000;

class ToastStore {
	items = $state<ToastItem[]>([]);
	#seq = 0;

	push(type: ToastType, message: string): void {
		const id = ++this.#seq;
		this.items = [...this.items, { id, type, message }];
		setTimeout(() => this.dismiss(id), durationFor(type));
	}

	success(message: string): void {
		this.push('success', message);
	}

	error(message: string): void {
		this.push('error', message);
	}

	info(message: string): void {
		this.push('info', message);
	}

	warning(message: string): void {
		this.push('warning', message);
	}

	dismiss(id: number): void {
		this.items = this.items.filter((t) => t.id !== id);
	}
}

function durationFor(type: ToastType): number {
	if (type === 'error') return ERROR_DURATION_MS;
	if (type === 'info') return INFO_DURATION_MS;
	return DEFAULT_DURATION_MS;
}

export const toast = new ToastStore();
