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
	import { formatCurrency } from '#lib/shared/pipes/currency';

	let viewTarget = $state<Transaction | null>(null);
	let editTarget = $state<Transaction | null>(null);
	let scanOpen = $state(false);
	let deleteTarget = $state<Transaction | null>(null);
	let deleting = $state(false);
	let searching = $state(false);
	let searchInput = $state('');
	let wallets = $state<Wallet[]>([]);
	let categories = $state<Category[]>([]);
	let actionError = $state<string | null>(null);

	$effect(() => {
		transactionStore.filter.month;
		transactionStore.filter.query;
		transactionStore.refresh();
		loadReferenceData();
	});

	// Rincian barang dimuat saat modal dibuka dan dibuang setelah ditutup.
	let viewItems = $state<Transaction['items'] | null>(null);
	let viewItemsLoading = $state(false);
	$effect(() => {
		const target = viewTarget;
		if (!target) {
			viewItems = null;
			return;
		}
		viewItemsLoading = true;
		transactionService
			.get(target.id)
			.then((detail) => (viewItems = detail.items ?? []))
			.catch(() => (viewItems = []))
			.finally(() => (viewItemsLoading = false));
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

	async function handleDelete() {
		if (!deleteTarget || deleting) return;
		deleting = true;
		actionError = null;
		try {
			await transactionStore.remove(deleteTarget.id);
			deleteTarget = null;
			dashboardStore.refresh();
		} catch {
			actionError = 'Gagal menghapus transaksi.';
		} finally {
			deleting = false;
		}
	}

	/** Filter pencarian hanya diterapkan setelah tombol Cari ditekan. */
	async function applySearch() {
		if (searching) return;
		searching = true;
		try {
			transactionStore.filter.query = searchInput.trim();
			await transactionStore.refresh();
		} finally {
			searching = false;
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
			<form class="flex min-w-56 flex-1 flex-wrap items-end gap-2" onsubmit={(e) => { e.preventDefault(); void applySearch(); }}>
			<div class="min-w-48 flex-1">
				<Input
					label="Cari"
					type="search"
					placeholder="Cari catatan atau kategori…"
					bind:value={searchInput}
				/>
			</div>
			<Button type="submit" variant="secondary" loading={searching}>Cari</Button>
		</form>
	</div>

	{#if transactionStore.error || actionError}
		<p class="rounded-lg bg-red-50 p-3 text-sm text-red-700">
			{transactionStore.error ?? actionError}
		</p>
	{/if}

	<div class="rounded-xl bg-white dark:bg-boxdark-2 px-5 py-2 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
		<!-- Tabel selalu dirender: header tetap, hanya body yang berubah saat memuat. -->
		<TransactionList
			transactions={transactionStore.transactions}
			{categories}
			loading={transactionStore.loading}
			onview={(t) => (viewTarget = t)}
			onedit={(t) => (editTarget = t)}
			ondelete={(t) => (deleteTarget = t)}
		/>
	</div>
</div>

<!-- Modal konfirmasi hapus -->
{#if deleteTarget}
	<Modal title="Hapus Transaksi" onclose={() => (deleteTarget = null)}>
		<p class="text-sm text-slate-600 dark:text-slate-300">
			Apakah Anda yakin akan menghapus transaksi ini
			<strong class="font-semibold text-slate-900 dark:text-white">
				“{deleteTarget.note || deleteTarget.categoryId}”
			</strong>
			({formatCurrency(deleteTarget.amount)})?
		</p>
		<p class="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">Saldo dompet akan dikembalikan dan tindakan ini tidak dapat dibatalkan.</p>
		<div class="mt-4 flex justify-end gap-2">
			<Button variant="ghost" onclick={() => (deleteTarget = null)}>Batal</Button>
			<Button variant="danger" loading={deleting} onclick={() => void handleDelete()}>Hapus</Button>
		</div>
	</Modal>
{/if}

{#if viewTarget}
	<TransactionDetailModal
		transaction={viewTarget}
		{wallets}
		{categories}
		items={viewItems}
		itemsLoading={viewItemsLoading}
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
