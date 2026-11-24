<script lang="ts">
	import { goto } from '$app/navigation';
	import { Card } from '#lib/shared/components/index';
	import { transactionService } from '#lib/features/transactions/services/transaction.service';
	import { transactionStore } from '#lib/features/transactions/transaction.store.svelte';
	import { dashboardStore } from '#lib/features/dashboard/dashboard.store.svelte';
	import TransactionForm from '#lib/features/transactions/components/TransactionForm.svelte';
	import type { Category, TransactionInput, Wallet } from '#lib/shared/models/domain';
	import { toast } from '#lib/shared/toast/toast.store.svelte';
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';

	let wallets = $state<Wallet[]>([]);
	let categories = $state<Category[]>([]);
	let saving = $state(false);

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
		try {
			await transactionService.create(input);
			await transactionStore.refresh();
			dashboardStore.refresh();
			// Notifikasi lewat toast; input form tetap utuh sampai pindah halaman.
			toast.success(i18n.t('tx.addedToast'));
			await goto('/transactions');
		} catch {
			toast.error(i18n.t('tx.failedSave'));
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


	<Card>
		<TransactionForm {categories} {wallets} onsubmit={handleSubmit} />
	</Card>
</div>
