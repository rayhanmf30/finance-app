<script lang="ts">
	import { Modal } from '#lib/shared/components/index';
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';
	import { receiptStore } from './receipt.store.svelte';
	import UploadDropzone from './components/UploadDropzone.svelte';
	import ReceiptReviewPanel from './components/ReceiptReviewPanel.svelte';
	import { transactionService } from '#lib/features/transactions/services/transaction.service';
	import { transactionStore } from '#lib/features/transactions/transaction.store.svelte';
	import { dashboardStore } from '#lib/features/dashboard/dashboard.store.svelte';
	import type { Category, TransactionInput, Wallet } from '#lib/shared/models/domain';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	let wallets = $state<Wallet[]>([]);
	let categories = $state<Category[]>([]);

	$effect(() => {
		if (!open) return;
		void Promise.all([
			transactionService.getWallets(),
			transactionService.getCategories()
		]).then(([w, c]) => {
			wallets = w;
			categories = c;
		});
	});

	const uploading = $derived(receiptStore.status === 'uploading');
	const saving = $derived(receiptStore.status === 'saving');
	/** Fase review menggantikan dropzone di modal yang sama (bukan modal lain). */
	const reviewing = $derived(receiptStore.status === 'reviewing' && receiptStore.extraction !== null);

	function closeAll() {
		receiptStore.reset();
		onclose();
	}

	async function handleSave(input: Omit<TransactionInput, 'type'>) {
		await receiptStore.save(input);
		if (receiptStore.status !== 'saved') return; // gagal simpan → review tetap terbuka
		await transactionStore.refresh();
		dashboardStore.refresh();
		receiptStore.reset();
		onclose();
	}
</script>

{#if open}
	<Modal
		title={reviewing ? i18n.t('scan.reviewTitle') : i18n.t('scan.title')}
		onclose={closeAll}
	>
		{#if reviewing && receiptStore.extraction}
			<ReceiptReviewPanel
				extraction={receiptStore.extraction}
				previewUrl={receiptStore.previewUrl}
				{categories}
				{wallets}
				{saving}
				onsave={handleSave}
			/>
		{:else}
			<p class="mb-4 text-sm text-slate-500 dark:text-slate-400">
				{i18n.t('scan.desc')}
			</p>
			<UploadDropzone disabled={uploading || saving} onfile={(file) => void receiptStore.upload(file)} />

			{#if uploading}
				<div class="mt-3 space-y-2 rounded-lg bg-slate-50 dark:bg-boxdark p-4">
					<p class="text-sm font-medium text-slate-600 dark:text-slate-300">{i18n.t('scan.extracting')}</p>
					{#each Array(3) as _, index (index)}
						<div class="h-4 animate-pulse rounded bg-slate-100 dark:bg-boxdark-2" style="width: {90 - index * 20}%"></div>
					{/each}
				</div>
			{/if}
		{/if}
	</Modal>
{/if}
