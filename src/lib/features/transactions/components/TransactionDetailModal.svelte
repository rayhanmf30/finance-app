<script lang="ts">
	import { Button, Modal } from '#lib/shared/components/index';
	import type { Category, Transaction, Wallet } from '#lib/shared/models/domain';
	import { formatCurrency } from '#lib/shared/pipes/currency';
	import { formatDate } from '#lib/shared/pipes/date';

	interface Props {
		transaction: Transaction;
		wallets: Wallet[];
		categories: Category[];
		onclose: () => void;
		onedit?: (transaction: Transaction) => void;
	}

	let { transaction, wallets, categories, onclose, onedit }: Props = $props();

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
	{#if onedit && transaction.type !== 'TRANSFER'}
		<div class="mt-4 flex justify-end">
			<Button onclick={() => onedit?.(transaction)}>Edit Transaksi</Button>
		</div>
	{/if}
</Modal>
