<script lang="ts">
	import { Button, Modal } from '#lib/shared/components/index';
	import Input from '#lib/shared/components/Input.svelte';
	import { transactionStore } from '#lib/features/transactions/transaction.store.svelte';
	import { dashboardStore } from '#lib/features/dashboard/dashboard.store.svelte';
	import { transactionService } from '#lib/features/transactions/services/transaction.service';
	import type { Category, TransactionInput, Wallet } from '#lib/shared/models/domain';
	import TransactionList from '#lib/features/transactions/components/TransactionList.svelte';
	import TransactionForm from '#lib/features/transactions/components/TransactionForm.svelte';
	import { formatMonthYear } from '#lib/shared/pipes/date';

	let showForm = $state(false);
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

	async function handleSubmit(input: TransactionInput) {
		actionError = null;
		try {
			await transactionService.create(input);
			showForm = false;
			await transactionStore.refresh();
			dashboardStore.refresh();
		} catch {
			actionError = 'Gagal menyimpan transaksi.';
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
		<Button variant="primary" onclick={() => (showForm = true)}>+ Tambah Transaksi</Button>
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
				ondelete={handleDelete}
			/>
		{/if}
	</div>
</div>

{#if showForm}
	<Modal title="Transaksi Baru" onclose={() => (showForm = false)}>
		<TransactionForm {categories} {wallets} onsubmit={handleSubmit} />
	</Modal>
{/if}
