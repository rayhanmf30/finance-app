<script lang="ts">
	import type { Category, Transaction } from '#lib/shared/models/domain';
	import { formatCurrency } from '#lib/shared/pipes/currency';
	import { formatDate } from '#lib/shared/pipes/date';

	interface Props {
		transactions: Transaction[];
		categories: Category[];
		ondelete?: (id: string) => void;
	}

	let { transactions, categories, ondelete }: Props = $props();

	function categoryName(id: string | null): string {
		return categories.find((c) => c.id === id)?.name ?? '—';
	}

	function amountClass(type: Transaction['type']): string {
		if (type === 'INCOME') return 'text-emerald-600';
		if (type === 'TRANSFER') return 'text-slate-500 dark:text-slate-400 dark:text-metadark';
		return 'text-red-600';
	}

	function amountPrefix(type: Transaction['type']): string {
		if (type === 'INCOME') return '+ ';
		if (type === 'TRANSFER') return '⇄ ';
		return '− ';
	}
</script>

{#if transactions.length === 0}
	<p class="py-8 text-center text-sm text-slate-400 dark:text-metadark">Tidak ada transaksi.</p>
{:else}
	<ul class="divide-y divide-slate-100 dark:divide-slate-700/60">
		{#each transactions as transaction (transaction.id)}
			<li class="flex items-center justify-between gap-4 py-3">
				<div class="min-w-0">
					<p class="truncate text-sm font-medium text-slate-800">
						{transaction.note || categoryName(transaction.categoryId)}
					</p>
					<p class="text-xs text-slate-400 dark:text-metadark">
						{formatDate(transaction.transactionDate)} · {categoryName(transaction.categoryId)}
					</p>
				</div>
				<div class="flex items-center gap-3">
					<span class="text-sm font-semibold whitespace-nowrap {amountClass(transaction.type)}">
						{amountPrefix(transaction.type)}{formatCurrency(transaction.amount)}
					</span>
					{#if ondelete}
						<button
							type="button"
							aria-label="Hapus"
							class="cursor-pointer rounded-md p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600"
							onclick={() => ondelete?.(transaction.id)}
						>
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
						</button>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
{/if}
