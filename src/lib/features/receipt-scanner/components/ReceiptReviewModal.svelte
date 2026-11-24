<script lang="ts">
	import { untrack } from 'svelte';
	import type { Category, ReceiptExtraction, TransactionInput, Wallet } from '#lib/shared/models/domain';
	import { formatCurrency } from '#lib/shared/pipes/currency';
	import { Button, Modal } from '#lib/shared/components/index';
	import Input from '#lib/shared/components/Input.svelte';
	import Select from '#lib/shared/components/Select.svelte';
	import WalletSelect from '#lib/shared/components/WalletSelect.svelte';

	interface Props {
		extraction: ReceiptExtraction;
		previewUrl: string | null;
		categories: Category[];
		wallets: Wallet[];
		saving?: boolean;
		onsave: (input: Omit<TransactionInput, 'type'>) => void;
		onclose: () => void;
	}

	let {
		extraction,
		previewUrl,
		categories,
		wallets,
		saving = false,
		onsave,
		onclose
	}: Props = $props();

	let merchantName = $state(untrack(() => extraction.merchantName));
	let total = $state(untrack(() => extraction.total));
	let date = $state(untrack(() => extraction.transactionDate.slice(0, 10)));
	let categoryId = $state(untrack(() => extraction.suggestedCategoryId ?? ''));
	let walletId = $state('');

	$effect(() => {
		if (!walletId && wallets.length > 0) walletId = wallets[0].id;
	});

	const expenseCategories = $derived(categories.filter((c) => c.type === 'EXPENSE'));
	const itemsTotal = $derived(
		extraction.items.reduce(
			(sum, item) => sum + item.quantity * item.unitPrice - (item.discount ?? 0),
			0
		) +
			extraction.tax -
			extraction.discount
	);

	/** Semua barang struk disimpan sebagai satu transaksi beserta rinciannya (transaction_items). */
	function save() {
		const transactionDate = new Date(`${date}T12:00:00`).toISOString();

		onsave({
			walletId,
			categoryId: categoryId || null,
			amount: total,
			transactionDate,
			note: merchantName,
			items: extraction.items.map((item) => ({
				name: item.name,
				quantity: item.quantity,
				unitPrice: item.unitPrice,
				discount: item.discount ?? 0
			}))
		});
	}
</script>

<Modal title="Review Hasil Scan" onclose={onclose}>
	<div class="grid gap-5 sm:grid-cols-[1fr_1.2fr]">
		{#if previewUrl}
			<img
				src={previewUrl}
				alt="Pratinjau struk"
				class="max-h-72 w-full rounded-lg border border-slate-200 dark:border-slate-700/60 object-cover"
			/>
		{/if}

		<form class="space-y-3" onsubmit={(event) => { event.preventDefault(); save(); }}>
			<Input label="Merchant" bind:value={merchantName} />
			<Input label="Tanggal" type="date" bind:value={date} required />
			<Input label="Total" type="number" min="1" step="any" bind:value={total} required />

			<div class="rounded-lg bg-slate-50 dark:bg-boxdark p-3 text-xs text-slate-600 dark:text-slate-300">
				<p class="mb-2 font-semibold">Rincian barang ({extraction.items.length})</p>
				<table class="w-full text-left">
					<thead class="text-slate-400 dark:text-metadark">
						<tr>
							<th class="py-1">Barang</th>
							<th class="py-1 text-right">Qty</th>
							<th class="py-1 text-right">Harga</th>
							<th class="py-1 text-right">Diskon</th>
							<th class="py-1 text-right">Subtotal</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200 dark:divide-slate-700/60">
						{#each extraction.items as item, index (index)}
							<tr>
								<td class="py-1 pr-2">{item.name}</td>
								<td class="py-1 text-right">{item.quantity}×</td>
								<td class="py-1 text-right">{formatCurrency(item.unitPrice)}</td>
								<td class="py-1 text-right">{item.discount ? `− ${formatCurrency(item.discount)}` : '—'}</td>
								<td class="py-1 text-right font-medium">
									{formatCurrency(item.subtotal ?? item.quantity * item.unitPrice - (item.discount ?? 0))}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
				<p class="mt-2 flex justify-between border-t border-slate-200 dark:border-slate-700/60 pt-2 font-semibold">
					<span>Total item</span>
					<span>{formatCurrency(itemsTotal)}</span>
				</p>
			</div>

			<Select
				label="Kategori"
				options={expenseCategories.map((c) => ({ value: c.id, label: c.name }))}
				bind:value={categoryId}
			/>
			<WalletSelect wallets={wallets} bind:value={walletId} />

			<div class="pt-1">
				<Button type="submit" variant="primary" loading={saving}>
					{saving ? 'Menyimpan…' : 'Simpan Transaksi'}
				</Button>
			</div>
		</form>
	</div>
</Modal>
