<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button, Modal } from '#lib/shared/components/index';
	import Input from '#lib/shared/components/Input.svelte';
	import { transactionStore } from '#lib/features/transactions/transaction.store.svelte';
	import { dashboardStore } from '#lib/features/dashboard/dashboard.store.svelte';
	import { transactionService } from '#lib/features/transactions/services/transaction.service';
	import type { Category, Transaction, TransactionInput, Wallet } from '#lib/shared/models/domain';
	import TransactionList from '#lib/features/transactions/components/TransactionList.svelte';
	import TransactionForm from '#lib/features/transactions/components/TransactionForm.svelte';
	import TransactionDetailModal from '#lib/features/transactions/components/TransactionDetailModal.svelte';
	import ScanResiModal from '#lib/features/receipt-scanner/ScanResiModal.svelte';
	import { formatMonthYear } from '#lib/shared/pipes/date';

	let viewTarget = $state<Transaction | null>(null);
	let editTarget = $state<Transaction | null>(null);
	let scanOpen = $state(false);
	let wallets = $state<Wallet[]>([]);
	let categories = $state<Category[]>([]);
	let actionError = $state<string | null>(null);

	$effect(() => {
		transactionStore.filter.month;
		transactionStore.filter.query;
		transactionStore.refresh();
		loadReferenceData();
	});

	async function loadReferenceData() {
		[wallets, categories] = await Promise.all([
			transactionService.getWallets(),
			transactionService.getCategories()
		]);
	}

	function openEditFromDetail(t: Transaction) {
		viewTarget = null;
		editTarget = t;
	}

	async function handleUpdate(input: TransactionInput) {
		if (!editTarget) return;
		actionError = null;
		try {
			await transactionService.update(editTarget.id, input);
			editTarget = null;
			await transactionStore.refresh();
			dashboardStore.refresh();
		} catch {
			actionError = 'Gagal memperbarui transaksi.';
		}
	}

	async function handleDelete(id: string) {
		actionError = null;
		try {
			await transactionStore.remove(id);
			dashboardStore.refresh();
		} catch {
			actionError = 'Gagal menghapus transaksi.';
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
			Riwayat Transaksi — {formatMonthYear(transactionStore.filter.month)}
		</h1>
		<div class="flex flex-wrap gap-2">
			<Button variant="secondary" onclick={() => (scanOpen = true)}>
				<svg class="mr-1 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
					<circle cx="12" cy="12" r="3.5" />
				</svg>
				Scan Resi
			</Button>
			<Button variant="primary" onclick={() => goto('/transactions/new')}>+ Tambah Transaksi</Button>
		</div>
	</div>

	<div class="flex flex-wrap gap-3">
		<div class="w-44">
			<Input label="Bulan" type="month" bind:value={transactionStore.filter.month} />
		</div>
		<div class="min-w-56 flex-1">
			<Input
				label="Cari"
				type="search"
				placeholder="Cari catatan atau kategori…"
				bind:value={transactionStore.filter.query}
			/>
		</div>
	</div>

	{#if transactionStore.error || actionError}
		<p class="rounded-lg bg-red-50 p-3 text-sm text-red-700">
			{transactionStore.error ?? actionError}
		</p>
	{/if}

	<div class="rounded-xl bg-white dark:bg-boxdark-2 px-5 py-2 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
		{#if transactionStore.loading}
			<div class="space-y-3 py-4">
				{#each Array(4) as _, index (index)}
					<div class="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-boxdark-2"></div>
				{/each}
			</div>
		{:else}
			<TransactionList
				transactions={transactionStore.transactions}
				{categories}
				onview={(t) => (viewTarget = t)}
				onedit={(t) => (editTarget = t)}
				ondelete={handleDelete}
			/>
		{/if}
	</div>
</div>

{#if viewTarget}
	<TransactionDetailModal
		transaction={viewTarget}
		{wallets}
		{categories}
		onclose={() => (viewTarget = null)}
		onedit={openEditFromDetail}
	/>
{/if}

{#if editTarget}
	<Modal title="Edit Transaksi" onclose={() => (editTarget = null)}>
		<TransactionForm
			{categories}
			{wallets}
			initial={editTarget}
			onsubmit={handleUpdate}
		/>
	</Modal>
{/if}

<ScanResiModal open={scanOpen} onclose={() => (scanOpen = false)} />
