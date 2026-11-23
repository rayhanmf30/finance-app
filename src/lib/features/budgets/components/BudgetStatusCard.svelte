<script lang="ts">
	import type { BudgetStatusRow } from '#lib/shared/models/domain';
	import { formatCurrency } from '#lib/shared/pipes/currency';

	interface Props {
		rows: BudgetStatusRow[];
		loading?: boolean;
	}

	let { rows, loading = false }: Props = $props();

	const periodLabels: Record<string, string> = {
		DAILY: 'Harian',
		WEEKLY: 'Mingguan',
		MONTHLY: 'Bulanan',
		YEARLY: 'Tahunan'
	};

	const statusStyles: Record<string, string> = {
		SAFE: 'bg-emerald-50 text-emerald-700',
		WARNING: 'bg-amber-50 text-amber-700',
		EXCEEDED: 'bg-red-50 text-red-700'
	};

	const barStyles: Record<string, string> = {
		SAFE: 'bg-emerald-500',
		WARNING: 'bg-amber-500',
		EXCEEDED: 'bg-red-500'
	};
</script>

{#if loading}
	<div class="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-boxdark-2"></div>
{:else if rows.length === 0}
	<p class="py-6 text-center text-sm text-slate-400 dark:text-metadark">Belum ada aturan budget.</p>
{:else}
	<ul class="space-y-4">
		{#each rows as row (row.budgetId)}
			<li>
				<div class="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
					<span class="font-medium text-slate-700 dark:text-slate-200">
						{row.categoryName}
						<span class="text-xs font-normal text-slate-400 dark:text-metadark">
							({periodLabels[row.periodType]} · {row.periodKey})
						</span>
					</span>
					<span class="rounded-full px-2 py-0.5 text-xs font-semibold {statusStyles[row.status]}">
						{row.status === 'SAFE' ? 'AMAN' : row.status === 'WARNING' ? 'PERINGATAN' : 'TERLAMPAUI'}
					</span>
				</div>
				<div class="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-boxdark-2">
					<div
						class="h-full rounded-full transition-all {barStyles[row.status]}"
						style="width: {Math.min(Math.max(row.usagePercentage, 2), 100)}%"
					></div>
				</div>
				<div class="mt-1 flex flex-wrap justify-between gap-1 text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">
					<span>{formatCurrency(row.spentAmount)} / {formatCurrency(row.limitAmount)}</span>
					<span>
						{row.usagePercentage.toFixed(1)}%
						{row.remainingAmount >= 0
							? `· sisa ${formatCurrency(row.remainingAmount)}`
							: `· lebih ${formatCurrency(-row.remainingAmount)}`}
					</span>
				</div>
			</li>
		{/each}
	</ul>
{/if}
