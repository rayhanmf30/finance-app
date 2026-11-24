<script lang="ts">
	import { Modal } from '#lib/shared/components/index';
	import { receiptStore } from './receipt.store.svelte';
	import UploadDropzone from './components/UploadDropzone.svelte';
	import ReceiptReviewModal from './components/ReceiptReviewModal.svelte';
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

	function closeAll() {
		receiptStore.reset();
		onclose();
	}

	async function handleSave(input: Omit<TransactionInput, 'type'>) {
		await receiptStore.save(input);
		await transactionStore.refresh();
		dashboardStore.refresh();
		receiptStore.reset();
		onclose();
	}
</script>

{#if open}
	<Modal title="Scan Resi Belanja" onclose={closeAll}>
		<p class="mb-4 text-sm text-slate-500 dark:text-slate-400">
			Unggah foto struk, data transaksi akan diekstrak otomatis.
		</p>
		<UploadDropzone disabled={uploading || saving} onfile={(file) => void receiptStore.upload(file)} />

		{#if receiptStore.error}
			<p class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{receiptStore.error}</p>
		{/if}

		{#if uploading}
			<div class="mt-3 space-y-2 rounded-lg bg-slate-50 dark:bg-boxdark p-4">
				<p class="text-sm font-medium text-slate-600 dark:text-slate-300">Mengekstrak data struk…</p>
				{#each Array(3) as _, index (index)}
					<div class="h-4 animate-pulse rounded bg-slate-100 dark:bg-boxdark-2" style="width: {90 - index * 20}%"></div>
				{/each}
			</div>
		{/if}
	</Modal>
{/if}

{#if receiptStore.status === 'reviewing' && receiptStore.extraction}
	<ReceiptReviewModal
		extraction={receiptStore.extraction}
		previewUrl={receiptStore.previewUrl}
		{categories}
		{wallets}
		{saving}
		onsave={handleSave}
		onclose={closeAll}
	/>
{/if}
