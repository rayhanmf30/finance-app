<script lang="ts">
	import type { Category, Transaction } from '#lib/shared/models/domain';
	import { formatCurrency } from '#lib/shared/pipes/currency';
	import { formatDate } from '#lib/shared/pipes/date';
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';
	import ActionMenu, { type MenuItem } from '#lib/shared/components/ActionMenu.svelte';

	interface Props {
		transactions: Transaction[];
		categories: Category[];
		/** True saat memuat — header tabel tetap tampil, hanya body yang menampilkan indikator. */
		loading?: boolean;
		/** Tanpa ondelete/onedit → aksi tersebut tidak dirender (dashboard). */
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

	/** Aksi baris: lihat/edit/hapus — ikon saja, > 3 otomatis jadi menu titik tiga. */
	function rowActions(t: Transaction): MenuItem[] {
		const items: MenuItem[] = [];
		if (onview) items.push({ icon: 'eye', label: i18n.t('common.view'), onclick: () => onview(t) });
		if (onedit) items.push({ icon: 'edit', label: i18n.t('common.edit'), onclick: () => onedit(t) });
		if (ondelete) items.push({ icon: 'trash', label: i18n.t('common.delete'), danger: true, onclick: () => ondelete(t) });
		return items;
	}
</script>

<!-- Header tabel selalu tampil; hanya body yang berganti saat memuat/kosong/berisi. -->
<div class="overflow-x-auto">
	<table class="w-full text-left text-sm">
		<thead class="text-xs text-slate-500 dark:text-slate-400 dark:text-metadark uppercase">
			<tr>
				<th class="px-2 py-2">{i18n.t('tx.thTransaction')}</th>
				<th class="px-2 py-2 text-right">{i18n.t('tx.thAmount')}</th>
				<th class="px-2 py-2 text-right">{i18n.t('tx.thActions')}</th>
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
				<tr><td colspan="3" class="px-2 py-8 text-center text-slate-400 dark:text-metadark">{i18n.t('tx.noTransactions')}</td></tr>
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
							<ActionMenu items={rowActions(transaction)} />
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
