<script lang="ts">
	import { goto } from '$app/navigation';
	import { receiptStore } from '#lib/features/receipt-scanner/receipt.store.svelte';
	import { transactionStore } from '#lib/features/transactions/transaction.store.svelte';
	import { dashboardStore } from '#lib/features/dashboard/dashboard.store.svelte';
	import { transactionService } from '#lib/features/transactions/services/transaction.service';
	import type { Category, TransactionInput, Wallet } from '#lib/shared/models/domain';
	import UploadDropzone from '#lib/features/receipt-scanner/components/UploadDropzone.svelte';
	import ReceiptReviewModal from '#lib/features/receipt-scanner/components/ReceiptReviewModal.svelte';

	let wallets = $state<Wallet[]>([]);
	let categories = $state<Category[]>([]);

	$effect(() => {
		loadReferenceData();
	});

	async function loadReferenceData() {
		[wallets, categories] = await Promise.all([
			transactionService.getWallets(),
			transactionService.getCategories()
		]);
	}

	const uploading = $derived(receiptStore.status === 'uploading');
	const reviewing = $derived(receiptStore.status === 'reviewing' && receiptStore.extraction);
	const saving = $derived(receiptStore.status === 'saving');

	async function handleFile(file: File) {
		await receiptStore.upload(file);
	}

	async function handleSave(inputs: Omit<TransactionInput, 'type'>[]) {
		await receiptStore.save(inputs);
		await transactionStore.refresh();
		dashboardStore.refresh();
		receiptStore.reset();
		goto('/transactions');
	}
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<h1 class="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Scan Resi Belanja</h1>
		<p class="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-metadark">
			Unggah foto struk, AI akan mengekstrak data transaksi secara otomatis.
		</p>
	</div>

	<UploadDropzone disabled={uploading || saving} onfile={handleFile} />

	{#if receiptStore.error}
		<p class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{receiptStore.error}</p>
	{/if}

	{#if uploading}
		<div class="space-y-3 rounded-xl bg-white dark:bg-boxdark-2 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
			<p class="text-sm font-medium text-slate-600 dark:text-slate-300">Mengekstrak data struk…</p>
			{#each Array(3) as _, index (index)}
				<div class="h-4 animate-pulse rounded bg-slate-100 dark:bg-boxdark-2" style="width: {90 - index * 20}%"></div>
			{/each}
		</div>
	{/if}

	{#if reviewing}
		<ReceiptReviewModal
			extraction={receiptStore.extraction!}
			previewUrl={receiptStore.previewUrl}
			{categories}
			{wallets}
			{saving}
			onsave={handleSave}
			onclose={() => receiptStore.reset()}
		/>
	{/if}
</div>
