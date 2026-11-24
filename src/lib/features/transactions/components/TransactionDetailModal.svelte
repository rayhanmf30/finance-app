<script lang="ts">
	import { Button, Modal } from '#lib/shared/components/index';
	import type { Category, Transaction, Wallet } from '#lib/shared/models/domain';
	import { formatCurrency } from '#lib/shared/pipes/currency';
	import { formatDate } from '#lib/shared/pipes/date';

	interface Props {
		transaction: Transaction;
		wallets: Wallet[];
		categories: Category[];
		/** Rincian barang dimuat dari API oleh halaman; fallback ke item pada transaction. */
		items?: Transaction['items'] | null;
		itemsLoading?: boolean;
		onclose: () => void;
		onedit?: (transaction: Transaction) => void;
	}

	let { transaction, wallets, categories, items = undefined, itemsLoading = false, onclose, onedit }: Props = $props();

	const displayItems = $derived(items ?? transaction.items ?? []);

	const walletName = $derived(wallets.find((w) => w.id === transaction.walletId)?.name ?? '—');
	const destinationName = $derived(
		wallets.find((w) => w.id === transaction.destinationWalletId)?.name ?? null
	);
	const categoryName = $derived(categories.find((c) => c.id === transaction.categoryId)?.name ?? null);

	const typeLabel = $derived(
		transaction.type === 'INCOME' ? 'Pemasukan' : transaction.type === 'TRANSFER' ? 'Transfer' : 'Pengeluaran'
	);

	const rows: { label: string; value: string }[] = $derived.by(() => {
		const list = [
			{ label: 'Tipe', value: typeLabel },
			{ label: 'Nominal', value: formatCurrency(transaction.amount) },
			{ label: 'Tanggal', value: formatDate(transaction.transactionDate) },
			{ label: 'Dompet', value: walletName }
		];
		if (destinationName) list.push({ label: 'Dompet tujuan', value: destinationName });
		if (categoryName) list.push({ label: 'Kategori', value: categoryName });
		list.push({ label: 'Catatan', value: transaction.note || '—' });
		return list;
	});
</script>

<Modal title="Detail Transaksi" {onclose}>
	<dl class="divide-y divide-slate-100 dark:divide-slate-700/60">
		{#each rows as row (row.label)}
			<div class="flex justify-between gap-4 py-2.5 text-sm">
				<dt class="text-slate-500 dark:text-slate-400">{row.label}</dt>
				<dd class="text-right font-medium text-slate-900 dark:text-white">{row.value}</dd>
			</div>
		{/each}
	</dl>
	{#if itemsLoading}
		<p class="mt-4 text-sm text-slate-500 dark:text-slate-400">Memuat rincian barang…</p>
	{:else if displayItems.length > 0}
		<div class="mt-4 rounded-lg bg-slate-50 dark:bg-boxdark p-3">
			<p class="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 dark:text-metadark">Rincian barang ({displayItems.length})</p>
			<table class="w-full text-left text-xs">
				<thead class="text-slate-400 dark:text-metadark">
					<tr>
						<th class="py-1">Barang</th>
						<th class="py-1 text-right">Qty</th>
						<th class="py-1 text-right">Harga</th>
						<th class="py-1 text-right">Diskon</th>
						<th class="py-1 text-right">Subtotal</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
					{#each displayItems as item, index (index)}
						<tr>
							<td class="py-1 pr-2">{item.name}</td>
							<td class="py-1 text-right">{item.quantity}×</td>
							<td class="py-1 text-right">{formatCurrency(item.unitPrice)}</td>
							<td class="py-1 text-right">{item.discount ? `− ${formatCurrency(item.discount)}` : '—'}</td>
							<td class="py-1 text-right font-medium">{formatCurrency(item.quantity * item.unitPrice - (item.discount ?? 0))}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	{#if onedit}
		<div class="mt-4 flex justify-end">
			<Button onclick={() => onedit?.(transaction)}>Edit Transaksi</Button>
		</div>
	{/if}
</Modal>
