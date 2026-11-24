<script lang="ts">
	import { goto } from '$app/navigation';
	import { Modal } from '#lib/shared/components/index';
	import Input from '#lib/shared/components/Input.svelte';
	import IconButton from '#lib/shared/components/IconButton.svelte';
	import ConfirmModal from '#lib/shared/components/ConfirmModal.svelte';
	import { transactionStore } from '#lib/features/transactions/transaction.store.svelte';
	import { dashboardStore } from '#lib/features/dashboard/dashboard.store.svelte';
	import { transactionService } from '#lib/features/transactions/services/transaction.service';
	import type { Category, Transaction, TransactionInput, Wallet } from '#lib/shared/models/domain';
	import TransactionList from '#lib/features/transactions/components/TransactionList.svelte';
	import TransactionForm from '#lib/features/transactions/components/TransactionForm.svelte';
	import TransactionDetailModal from '#lib/features/transactions/components/TransactionDetailModal.svelte';
	import ScanResiModal from '#lib/features/receipt-scanner/ScanResiModal.svelte';
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';
	import { formatMonthYear } from '#lib/shared/pipes/date';
	import { formatCurrency } from '#lib/shared/pipes/currency';
	import { toast } from '#lib/shared/toast/toast.store.svelte';

	let viewTarget = $state<Transaction | null>(null);
	let editTarget = $state<Transaction | null>(null);
	let scanOpen = $state(false);
	let deleteTarget = $state<Transaction | null>(null);
	let deleting = $state(false);
	let searching = $state(false);
	let searchInput = $state('');
	let wallets = $state<Wallet[]>([]);
	let categories = $state<Category[]>([]);

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

	function deleteTargetName(): string {
		if (!deleteTarget) return '';
		return (
			deleteTarget.note ||
			categories.find((c) => c.id === deleteTarget?.categoryId)?.name ||
			'—'
		);
	}

	function openEditFromDetail(t: Transaction) {
		viewTarget = null;
		editTarget = t;
	}

	async function handleUpdate(input: TransactionInput) {
		if (!editTarget) return;
		try {
			await transactionService.update(editTarget.id, input);
			editTarget = null;
			await transactionStore.refresh();
			dashboardStore.refresh();
			toast.success(i18n.t('tx.updatedToast'));
		} catch {
			toast.error(i18n.t('tx.failedUpdate')); // notifikasi lewat toast
		}
	}

	async function handleDelete() {
		if (!deleteTarget || deleting) return;
		deleting = true;
		try {
			await transactionStore.remove(deleteTarget.id);
			deleteTarget = null;
			dashboardStore.refresh();
			toast.success(i18n.t('tx.deletedToast'));
		} catch {
			toast.error(i18n.t('tx.failedDelete')); // notifikasi lewat toast
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
			{i18n.t('tx.history')} — {formatMonthYear(transactionStore.filter.month)}
		</h1>
		<div class="flex flex-wrap gap-2">
			<IconButton
				icon="scan"
				size="md"
				label={i18n.t('scan.title')}
				onclick={() => (scanOpen = true)}
			/>
			<IconButton
				icon="plus"
				size="md"
				variant="primary"
				label={i18n.t('tx.addTransaction')}
				onclick={() => goto('/transactions/new')}
			/>
		</div>
	</div>

	<div class="flex flex-wrap gap-3">
		<div class="w-44">
			<Input label={i18n.t('tx.month')} type="month" bind:value={transactionStore.filter.month} />
		</div>
		<form
			class="flex min-w-56 flex-1 flex-wrap items-end gap-2"
			onsubmit={(e) => {
				e.preventDefault();
				void applySearch();
			}}
		>
			<div class="min-w-48 flex-1">
				<Input
					label={i18n.t('tx.search')}
					type="search"
					placeholder={i18n.t('tx.searchPlaceholder')}
					bind:value={searchInput}
				/>
			</div>
			<IconButton
				type="submit"
				size="md"
				icon="search"
				label={i18n.t('tx.search')}
				loading={searching}
			/>
		</form>
	</div>


	<div class="rounded-xl bg-white px-5 py-2 shadow-sm ring-1 ring-slate-200 dark:bg-boxdark-2 dark:ring-slate-700">
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

<!-- Modal konfirmasi hapus — WAJIB dikonfirmasi sebelum menghapus. -->
<ConfirmModal
	open={deleteTarget !== null}
	title={i18n.t('tx.deleteTitle')}
	message={
		i18n.t('tx.deleteMessage', { note: deleteTargetName() }) +
		(deleteTarget ? ` (${formatCurrency(deleteTarget.amount)})` : '')
	}
	warning={i18n.t('tx.deleteWarning')}
	confirmLabel={i18n.t('common.delete')}
	confirmLoading={deleting}
	onconfirm={() => void handleDelete()}
	oncancel={() => (deleteTarget = null)}
/>

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
	<Modal title={i18n.t('tx.editTitle')} onclose={() => (editTarget = null)}>
		<TransactionForm
			{categories}
			{wallets}
			initial={editTarget}
			onsubmit={handleUpdate}
		/>
	</Modal>
{/if}

<ScanResiModal open={scanOpen} onclose={() => (scanOpen = false)} />
