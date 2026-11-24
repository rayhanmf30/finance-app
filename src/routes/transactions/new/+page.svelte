<script lang="ts">
	import { goto } from '$app/navigation';
	import { Card } from '#lib/shared/components/index';
	import { transactionService } from '#lib/features/transactions/services/transaction.service';
	import { transactionStore } from '#lib/features/transactions/transaction.store.svelte';
	import { dashboardStore } from '#lib/features/dashboard/dashboard.store.svelte';
	import TransactionForm from '#lib/features/transactions/components/TransactionForm.svelte';
	import type { Category, TransactionInput, Wallet } from '#lib/shared/models/domain';

	let wallets = $state<Wallet[]>([]);
	let categories = $state<Category[]>([]);
	let saving = $state(false);
	let error = $state('');

	$effect(() => {
		void Promise.all([
			transactionService.getWallets(),
			transactionService.getCategories()
		]).then(([w, c]) => {
			wallets = w;
			categories = c;
		});
	});

	async function handleSubmit(input: TransactionInput) {
		if (saving) return;
		saving = true;
		error = '';
		try {
			await transactionService.create(input);
			await transactionStore.refresh();
			dashboardStore.refresh();
			await goto('/transactions');
		} catch {
			error = 'Gagal menyimpan transaksi.';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>Tambah Transaksi — FinanceApp</title></svelte:head>

<div class="mx-auto w-full max-w-2xl space-y-4">
	<div>
		<h1 class="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Tambah Transaksi</h1>
		<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
			Catat pemasukan atau pengeluaran pada dompet pilihan Anda.
		</p>
	</div>

	{#if error}
		<p class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
	{/if}

	<Card>
		<TransactionForm {categories} {wallets} onsubmit={handleSubmit} />
	</Card>
</div>
