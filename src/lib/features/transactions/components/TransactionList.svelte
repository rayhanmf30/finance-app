<script lang="ts">
	import type { Category, Transaction } from '#lib/shared/models/domain';
	import { formatCurrency } from '#lib/shared/pipes/currency';
	import { formatDate } from '#lib/shared/pipes/date';

	interface Props {
		transactions: Transaction[];
		categories: Category[];
		/** True saat memuat — header tabel tetap tampil, hanya body yang menampilkan indikator. */
		loading?: boolean;
		onview?: (transaction: Transaction) => void;
		onedit?: (transaction: Transaction) => void;
		ondelete?: (transaction: Transaction) => void;
	}

	let { transactions, categories, loading = false, onview, onedit, ondelete }: Props = $props();

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

<!-- Header tabel selalu tampil; hanya body yang berganti saat memuat/kosong/berisi. -->
<div class="overflow-x-auto">
	<table class="w-full text-left text-sm">
		<thead class="text-xs text-slate-500 dark:text-slate-400 dark:text-metadark uppercase">
			<tr>
				<th class="px-2 py-2">Transaksi</th>
				<th class="px-2 py-2 text-right">Nominal</th>
				<th class="px-2 py-2 text-right">Aksi</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
			{#if loading}
				<tr>
					<td colspan="3" class="px-2 py-6">
						<div class="space-y-2">
							{#each Array(3) as _, index (index)}
								<div class="h-6 animate-pulse rounded bg-slate-100 dark:bg-boxdark-2" style="width: {100 - index * 15}%"></div>
							{/each}
						</div>
					</td>
				</tr>
			{:else if transactions.length === 0}
				<tr><td colspan="3" class="px-2 py-8 text-center text-slate-400 dark:text-metadark">Tidak ada transaksi.</td></tr>
			{:else}
				{#each transactions as transaction (transaction.id)}
					<tr>
						<td class="px-2 py-3">
							<button
								type="button"
								class="block w-full cursor-pointer truncate text-left text-sm font-medium text-slate-800 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
								onclick={() => onview?.(transaction)}
							>
								{transaction.note || categoryName(transaction.categoryId)}
							</button>
							<p class="text-xs text-slate-400 dark:text-metadark">
								{formatDate(transaction.transactionDate)} · {categoryName(transaction.categoryId)}
							</p>
						</td>
						<td class="px-2 py-3 text-right text-sm font-semibold whitespace-nowrap {amountClass(transaction.type)}">
							{amountPrefix(transaction.type)}{formatCurrency(transaction.amount)}
						</td>
						<td class="px-2 py-3">
							<div class="flex items-center justify-end gap-1">
								<button
									type="button"
									aria-label="Lihat detail"
									class="cursor-pointer rounded-md p-1.5 text-slate-400 dark:text-metadark transition-colors hover:bg-slate-100 dark:hover:bg-boxdark hover:text-indigo-600 dark:hover:text-indigo-400"
									onclick={() => onview?.(transaction)}
								>
									<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								</button>
								{#if onedit && transaction.type !== 'TRANSFER'}
									<button
										type="button"
										aria-label="Edit"
										class="cursor-pointer rounded-md p-1.5 text-slate-400 dark:text-metadark transition-colors hover:bg-slate-100 dark:hover:bg-boxdark hover:text-indigo-600 dark:hover:text-indigo-400"
										onclick={() => onedit?.(transaction)}
									>
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
										</svg>
									</button>
								{/if}
								{#if ondelete}
									<button
										type="button"
										aria-label="Hapus"
										class="cursor-pointer rounded-md p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600"
										onclick={() => ondelete?.(transaction)}
									>
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									</button>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
