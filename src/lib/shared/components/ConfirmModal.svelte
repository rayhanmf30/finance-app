<script lang="ts">
	import { Button, Modal } from './index';
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';

	/**
	 * Modal konfirmasi generik — WAJIB dipakai untuk semua aksi destruktif
	 * (hapus akun/kategori/tipe dompet/dompet/transaksi, blokir, dll.).
	 * Tombol positif memakai variant="danger" + loading.
	 */
	interface Props {
		open: boolean;
		title: string;
		/** Pesan utama — sebut objeknya secara spesifik (nama/catatan/nominal). */
		message: string;
		/** Peringatan tambahan (dampak aksi). */
		warning?: string;
		confirmLabel?: string;
		/** True saat proses penyetujuan berjalan. */
		confirmLoading?: boolean;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let {
		open,
		title,
		message,
		warning = '',
		confirmLabel = i18n.t('confirm.delete'),
		confirmLoading = false,
		onconfirm,
		oncancel
	}: Props = $props();
</script>

{#if open}
	<Modal {title} onclose={oncancel}>
		<p class="whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
			{message}
		</p>
		{#if warning}
			<p class="mt-1 text-xs text-red-500">{warning}</p>
		{/if}
		<div class="mt-4 flex justify-end gap-2">
			<Button variant="ghost" onclick={oncancel}>{i18n.t('common.cancel')}</Button>
			<Button variant="danger" loading={confirmLoading} onclick={onconfirm}>{confirmLabel}</Button>
		</div>
	</Modal>
{/if}
