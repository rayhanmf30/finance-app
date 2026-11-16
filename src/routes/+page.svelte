<script lang="ts">
	import { formatCurrency } from '#lib/shared/pipes/currency';
	import { formatMonthYear } from '#lib/shared/pipes/date';
	import type { BudgetInput, Category } from '#lib/shared/models/domain';
	import { dashboardStore } from '#lib/features/dashboard/dashboard.store.svelte';
	import SummaryCard from '#lib/features/dashboard/components/SummaryCard.svelte';
	import CashflowChart from '#lib/features/dashboard/components/CashflowChart.svelte';
	import { transactionStore } from '#lib/features/transactions/transaction.store.svelte';
	import { transactionService } from '#lib/features/transactions/services/transaction.service';
	import { budgetStore } from '#lib/features/budgets/budgets.store.svelte';
	import BudgetStatusCard from '#lib/features/budgets/components/BudgetStatusCard.svelte';
	import BudgetFormModal from '#lib/features/budgets/components/BudgetFormModal.svelte';
	import { Button } from '#lib/shared/components/index';
	import TransactionList from '#lib/features/transactions/components/TransactionList.svelte';

	let categories = $state<Category[]>([]);
	let showBudgetForm = $state(false);
	let savingBudget = $state(false);
	let budgetError = $state<string | null>(null);

	$effect(() => {
		dashboardStore.refresh();
		transactionStore.refresh();
		budgetStore.refresh();
		loadCategories();
	});

	async function loadCategories() {
		categories = await transactionService.getCategories();
	}

	const recent = $derived(transactionStore.transactions.slice(0, 5));

	async function handleSaveBudget(input: BudgetInput) {
		savingBudget = true;
		budgetError = null;
		try {
			await budgetStore.create(input);
			showBudgetForm = false;
		} catch {
			budgetError = 'Gagal menyimpan budget.';
		} finally {
			savingBudget = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-xl font-bold text-slate-900 sm:text-2xl">
			Ringkasan {formatMonthYear(dashboardStore.month)}
		</h1>
		<a
			href="/scan"
			class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
		>
			📷 Scan Resi
		</a>
	</div>

	{#if dashboardStore.error}
		<p class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{dashboardStore.error}</p>
	{/if}

	{#if dashboardStore.loading}
		<div class="grid gap-4 sm:grid-cols-3">
			{#each Array(3) as _, index (index)}
				<div class="h-24 animate-pulse rounded-xl bg-slate-200"></div>
			{/each}
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-3">
			<SummaryCard label="Total Saldo" value={formatCurrency(dashboardStore.totalBalance)} />
			<SummaryCard
				label="Pemasukan Bulan Ini"
				value={formatCurrency(dashboardStore.summary.totalIncome)}
				tone="positive"
			/>
			<SummaryCard
				label="Pengeluaran Bulan Ini"
				value={formatCurrency(dashboardStore.summary.totalExpense)}
				tone="negative"
			/>
		</div>
	{/if}

	<div class="grid gap-4 lg:grid-cols-2">
		<section class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-sm font-semibold text-slate-500">Status Anggaran</h3>
				<Button variant="secondary" onclick={() => (showBudgetForm = true)}>+ Atur Budget</Button>
			</div>
			{#if budgetStore.error}
				<p class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{budgetStore.error}</p>
			{/if}
			<BudgetStatusCard rows={budgetStore.rows} loading={budgetStore.loading} />
		</section>

		<section class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
			<h3 class="mb-4 text-sm font-semibold text-slate-500">Pengeluaran per Kategori</h3>
			<CashflowChart breakdown={dashboardStore.breakdown} />
		</section>
	</div>

	<section class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
		<div class="mb-2 flex items-center justify-between">
			<h3 class="text-sm font-semibold text-slate-500">Transaksi Terakhir</h3>
			<a href="/transactions" class="text-xs font-medium text-indigo-600 hover:underline">
				Lihat semua
			</a>
		</div>
		<TransactionList transactions={recent} {categories} />
	</section>
</div>

{#if showBudgetForm}
	<BudgetFormModal
		{categories}
		saving={savingBudget}
		onsave={handleSaveBudget}
		onclose={() => (showBudgetForm = false)}
	/>
{/if}
