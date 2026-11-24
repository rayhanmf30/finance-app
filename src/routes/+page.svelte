<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatCurrency } from '#lib/shared/pipes/currency';
	import { formatMonthYear } from '#lib/shared/pipes/date';
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';
	import type { Category } from '#lib/shared/models/domain';
	import { dashboardStore } from '#lib/features/dashboard/dashboard.store.svelte';
	import SummaryCard from '#lib/features/dashboard/components/SummaryCard.svelte';
	import CashflowChart from '#lib/features/dashboard/components/CashflowChart.svelte';
	import { transactionStore } from '#lib/features/transactions/transaction.store.svelte';
	import { transactionService } from '#lib/features/transactions/services/transaction.service';
	import { budgetStore } from '#lib/features/budgets/budgets.store.svelte';
	import BudgetStatusCard from '#lib/features/budgets/components/BudgetStatusCard.svelte';
	import { IconButton } from '#lib/shared/components/index';
	import TransactionList from '#lib/features/transactions/components/TransactionList.svelte';
	import ScanResiModal from '#lib/features/receipt-scanner/ScanResiModal.svelte';

	let categories = $state<Category[]>([]);
	let scanOpen = $state(false);

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

</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
			{i18n.t('dash.title')} {formatMonthYear(dashboardStore.month)}
		</h1>
		<!-- Scan resi dibuka sebagai modal di dashboard (route /scan sudah tidak ada). -->
		<IconButton variant="primary" icon="scan" size="md" label={i18n.t('dash.scanReceipt')} onclick={() => (scanOpen = true)} />
	</div>


	{#if dashboardStore.loading}
		<div class="grid gap-4 sm:grid-cols-3">
			{#each Array(3) as _, index (index)}
				<div class="h-24 animate-pulse rounded-xl bg-slate-200"></div>
			{/each}
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-3">
			<SummaryCard label={i18n.t('dash.totalBalance')} value={formatCurrency(dashboardStore.totalBalance)} />
			<SummaryCard
				label={i18n.t('dash.incomeThisMonth')}
				value={formatCurrency(dashboardStore.summary.totalIncome)}
				tone="positive"
			/>
			<SummaryCard
				label={i18n.t('dash.expenseThisMonth')}
				value={formatCurrency(dashboardStore.summary.totalExpense)}
				tone="negative"
			/>
		</div>
	{/if}

	<div class="grid gap-4 lg:grid-cols-2">
		<section class="rounded-xl bg-white dark:bg-boxdark-2 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-metadark">{i18n.t('dash.budgetStatus')}</h3>
				<IconButton variant="primary" icon="plus" label={i18n.t('dash.setupBudget')} onclick={() => goto('/budgets')} />
			</div>
			<BudgetStatusCard rows={budgetStore.rows} loading={budgetStore.loading} />
		</section>

		<section class="rounded-xl bg-white dark:bg-boxdark-2 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
			<h3 class="mb-4 text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-metadark">{i18n.t('dash.expenseByCategory')}</h3>
			<CashflowChart breakdown={dashboardStore.breakdown} />
		</section>
	</div>

	<section class="rounded-xl bg-white dark:bg-boxdark-2 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
		<div class="mb-2 flex items-center justify-between">
			<h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-metadark">{i18n.t('dash.recent')}</h3>
			<a href="/transactions" class="text-xs font-medium text-indigo-600 hover:underline">
				{i18n.t('dash.viewAll')}
			</a>
		</div>
		<TransactionList transactions={recent} {categories} />
	</section>
</div>

<ScanResiModal open={scanOpen} onclose={() => (scanOpen = false)} />
