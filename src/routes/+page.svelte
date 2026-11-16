<script lang="ts">
	import { formatCurrency } from '#lib/shared/pipes/currency';
	import { formatMonthYear } from '#lib/shared/pipes/date';
	import { dashboardStore } from '#lib/features/dashboard/dashboard.store.svelte';
	import SummaryCard from '#lib/features/dashboard/components/SummaryCard.svelte';
	import CashflowChart from '#lib/features/dashboard/components/CashflowChart.svelte';
	import { transactionStore } from '#lib/features/transactions/transaction.store.svelte';
	import TransactionList from '#lib/features/transactions/components/TransactionList.svelte';
	import { transactionService } from '#lib/features/transactions/services/transaction.service';

	$effect(() => {
		dashboardStore.refresh();
		transactionStore.refresh();
	});

	const recent = $derived(transactionStore.transactions.slice(0, 5));
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-bold text-slate-900">Ringkasan {formatMonthYear(dashboardStore.month)}</h1>
		<a
			href="/scan"
			class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
		>
			📷 Scan Resi
		</a>
	</div>

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
			<h3 class="mb-4 text-sm font-semibold text-slate-500">Pengeluaran per Kategori</h3>
			<CashflowChart breakdown={dashboardStore.breakdown} />
		</section>

		<section class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
			<div class="mb-2 flex items-center justify-between">
				<h3 class="text-sm font-semibold text-slate-500">Transaksi Terakhir</h3>
				<a href="/transactions" class="text-xs font-medium text-indigo-600 hover:underline">
					Lihat semua
				</a>
			</div>
			<TransactionList
				transactions={recent}
				categories={transactionService.getCategories()}
			/>
		</section>
	</div>
</div>
