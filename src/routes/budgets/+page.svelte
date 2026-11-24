<script lang="ts">
	import Input from '#lib/shared/components/Input.svelte';
	import IconButton from '#lib/shared/components/IconButton.svelte';
	import ConfirmModal from '#lib/shared/components/ConfirmModal.svelte';
	import ActionMenu from '#lib/shared/components/ActionMenu.svelte';
	import { budgetStore } from '#lib/features/budgets/budgets.store.svelte';
	import BudgetFormModal from '#lib/features/budgets/components/BudgetFormModal.svelte';
	import BudgetStatusCard from '#lib/features/budgets/components/BudgetStatusCard.svelte';
	import { transactionService } from '#lib/features/transactions/services/transaction.service';
	import type { BudgetStatusRow, Category } from '#lib/shared/models/domain';
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';
	import { formatCurrency } from '#lib/shared/pipes/currency';
	import { toast } from '#lib/shared/toast/toast.store.svelte';

	let categories = $state<Category[]>([]);
	let searching = $state(false);
	let searchInput = $state('');

	/** Pencarian hanya diterapkan setelah tombol Cari ditekan. */
	let query = $state('');

	let formOpen = $state(false);
	let editTarget = $state<BudgetStatusRow | null>(null);
	let saving = $state(false);

	let deleteTarget = $state<BudgetStatusRow | null>(null);
	let deleting = $state(false);

	$effect(() => {
		budgetStore.refresh();
		loadCategories();
	});

	async function loadCategories() {
		categories = await transactionService.getCategories();
	}

	/** Filter sisi klien via tombol Cari: header tabel tetap, body ikut hasil. */
	const filtered = $derived(
		query
			? budgetStore.rows.filter((row) =>
					(row.categoryNames.join(', ') || i18n.t('dash.globalCategory'))
						.toLowerCase()
						.includes(query.toLowerCase())
				)
			: budgetStore.rows
	);

	async function applySearch() {
		if (searching) return;
		searching = true;
		try {
			query = searchInput.trim();
		} finally {
			searching = false;
		}
	}

	function openCreate() {
		editTarget = null;
		formOpen = true;
	}

	function openEdit(row: BudgetStatusRow) {
		editTarget = row;
		formOpen = true;
	}

	function deleteTargetName(): string {
		if (!deleteTarget) return '';
		return deleteTarget.categoryNames.join(', ') || i18n.t('dash.globalCategory');
	}

	async function handleSave(input: Parameters<typeof budgetStore.create>[0]) {
		if (saving) return;
		saving = true;
		try {
			if (editTarget) {
				await budgetStore.update(editTarget.budgetId, input);
				toast.success(i18n.t('budget.updatedToast'));
			} else {
				await budgetStore.create(input);
				toast.success(i18n.t('budget.savedToast'));
			}
			formOpen = false;
			editTarget = null;
		} catch (err) {
			// Tampilkan pesan error asli dari server (mis. kode errors.E_*).
			toast.error(i18n.displayError(err));
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!deleteTarget || deleting) return;
		deleting = true;
		try {
			await budgetStore.remove(deleteTarget.budgetId);
			deleteTarget = null;
			toast.success(i18n.t('budget.deletedToast'));
		} catch (err) {
			toast.error(i18n.displayError(err));
		} finally {
			deleting = false;
		}
	}

	const statusStyles: Record<string, string> = {
		SAFE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
		WARNING: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
		EXCEEDED: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
	};

	function statusLabel(status: BudgetStatusRow['status']): string {
		return i18n.t('status.' + (status === 'SAFE' ? 'safe' : status === 'WARNING' ? 'warning' : 'exceeded'));
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
			{i18n.t('budget.menuTitle')}
		</h1>
		<IconButton
			icon="plus"
			size="md"
			variant="primary"
			label={i18n.t('budget.add')}
			onclick={openCreate}
		/>
	</div>

	<!-- Kartu status ringkas (bar & persentase) -->
	<section class="grid gap-4 lg:grid-cols-2">
		<div class="rounded-xl bg-white dark:bg-boxdark-2 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
			<BudgetStatusCard rows={budgetStore.rows} loading={budgetStore.loading} />
		</div>
	</section>

	<form
		class="flex flex-wrap items-end gap-2"
		onsubmit={(e) => {
			e.preventDefault();
			void applySearch();
		}}
	>
		<div class="min-w-48 flex-1">
			<Input
				label={i18n.t('tx.search')}
				type="search"
				placeholder={i18n.t('budget.searchPlaceholder')}
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

	<div class="rounded-xl bg-white px-5 py-2 shadow-sm ring-1 ring-slate-200 dark:bg-boxdark-2 dark:ring-slate-700">
		<table class="w-full text-left text-sm">
			<thead>
				<tr class="border-b border-slate-200 dark:border-slate-700/60">
					<th class="py-3 pr-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">
						{i18n.t('budget.thCategory')}
					</th>
					<th class="py-3 pr-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">
						{i18n.t('budget.thPeriod')}
					</th>
					<th class="py-3 pr-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">
						{i18n.t('budget.thLimit')}
					</th>
					<th class="py-3 pr-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">
						{i18n.t('budget.thSpent')}
					</th>
					<th class="py-3 pr-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">
						{i18n.t('budget.thRemaining')}
					</th>
					<th class="py-3 pr-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">
						{i18n.t('budget.thStatus')}
					</th>
					<th class="py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">
						{i18n.t('tx.thActions')}
					</th>
				</tr>
			</thead>
			<!-- Tabel selalu dirender: saat memuat hanya body yang diganti skeleton. -->
			<tbody class="divide-y divide-slate-100 dark:divide-slate-700/40">
				{#if budgetStore.loading}
					{#each Array(3) as _, index (index)}
						<tr>
							<td colspan="7" class="py-3">
								<div class="h-6 animate-pulse rounded bg-slate-100 dark:bg-boxdark" style="width: {100 - index * 15}%"></div>
							</td>
						</tr>
					{/each}
				{:else if filtered.length === 0}
					<tr>
						<td colspan="7" class="py-8 text-center text-slate-400 dark:text-metadark">
							{i18n.t('budget.noBudgets')}
						</td>
					</tr>
				{:else}
					{#each filtered as row (row.budgetId)}
						<tr class="transition-colors hover:bg-slate-50 dark:hover:bg-boxdark">
							<td class="py-3 pr-2 font-medium text-slate-800 dark:text-slate-100">
								{row.categoryNames.length > 0 ? row.categoryNames.join(', ') : i18n.t('dash.globalCategory')}
							</td>
							<td class="py-3 pr-2 text-slate-600 dark:text-slate-300">
								{i18n.t('period.' + row.periodType.toLowerCase())} · {row.periodKey}
							</td>
							<td class="py-3 pr-2 text-right text-slate-600 dark:text-slate-300">{formatCurrency(row.limitAmount)}</td>
							<td class="py-3 pr-2 text-right text-slate-600 dark:text-slate-300">{formatCurrency(row.spentAmount)}</td>
							<td class="py-3 pr-2 text-right {row.remainingAmount >= 0 ? 'text-slate-600 dark:text-slate-300' : 'text-red-500'}">
								{formatCurrency(row.remainingAmount)}
							</td>
							<td class="py-3 pr-2">
								<span class="rounded-full px-2 py-0.5 text-xs font-semibold {statusStyles[row.status]}">
									{statusLabel(row.status)}
								</span>
							</td>
							<td class="py-2">
								<div class="flex justify-end">
									<ActionMenu
										items={[
											{
												icon: 'edit',
												label: i18n.t('common.edit'),
												onclick: () => openEdit(row)
											},
											{
												icon: 'trash',
												label: i18n.t('common.delete'),
												danger: true,
												onclick: () => (deleteTarget = row)
											}
										]}
									/>
								</div>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

{#if formOpen}
	<BudgetFormModal
		{categories}
		initial={editTarget}
		saving={saving}
		onsave={(input) => void handleSave(input)}
		onclose={() => {
			formOpen = false;
			editTarget = null;
		}}
	/>
{/if}

<!-- Modal konfirmasi hapus \u2014 WAJIB dikonfirmasi sebelum menghapus. -->
<ConfirmModal
	open={deleteTarget !== null}
	title={i18n.t('confirm.title.deleteBudget')}
	message={i18n.t('confirm.deleteBudget', { name: deleteTargetName() })}
	warning={i18n.t('confirm.deleteBudgetWarn')}
	confirmLabel={i18n.t('common.delete')}
	confirmLoading={deleting}
	onconfirm={() => void handleDelete()}
	oncancel={() => (deleteTarget = null)}
/>
