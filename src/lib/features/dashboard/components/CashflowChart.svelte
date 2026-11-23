<script lang="ts">
	import type { CategoryBreakdown } from '#lib/shared/models/domain';
	import { formatCurrency } from '#lib/shared/pipes/currency';

	interface Props {
		breakdown: CategoryBreakdown[];
	}

	let { breakdown }: Props = $props();
</script>

{#if breakdown.length === 0}
	<p class="py-8 text-center text-sm text-slate-400 dark:text-metadark">Belum ada pengeluaran bulan ini.</p>
{:else}
	<div class="space-y-4">
		{#each breakdown as item (item.categoryId)}
			<div>
				<div class="mb-1 flex items-center justify-between text-sm">
					<span class="font-medium text-slate-700 dark:text-slate-200">{item.categoryName}</span>
					<span class="text-slate-500 dark:text-slate-400 dark:text-metadark">
						{formatCurrency(item.total)} · {item.percentage.toFixed(1)}%
					</span>
				</div>
				<div class="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-boxdark-2">
					<div
						class="h-full rounded-full transition-all"
						style="width: {Math.max(item.percentage, 2)}%; background-color: {item.color}"
					></div>
				</div>
			</div>
		{/each}
	</div>
{/if}
