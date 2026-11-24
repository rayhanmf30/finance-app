<script lang="ts">
	import { untrack } from 'svelte';
	import type { Category, ReceiptExtraction, TransactionInput, Wallet } from '#lib/shared/models/domain';
	import { formatCurrency } from '#lib/shared/pipes/currency';
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';
	import { Button } from '#lib/shared/components/index';
	import Input from '#lib/shared/components/Input.svelte';
	import Select from '#lib/shared/components/Select.svelte';
	import WalletSelect from '#lib/shared/components/WalletSelect.svelte';

	interface Props {
		extraction: ReceiptExtraction;
		previewUrl: string | null;
		categories: Category[];
		wallets: Wallet[];
		saving?: boolean;
		/** Pesan error saat menyimpan (ditampilkan di atas form agar tidak hilang). */
		error?: string | null;
		onsave: (input: Omit<TransactionInput, 'type'>) => void;
	}

	let { extraction, previewUrl, categories, wallets, saving = false, error = null, onsave }: Props = $props();

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

<div class="grid gap-5 sm:grid-cols-[1fr_1.2fr]">
	{#if previewUrl}
		<img
			src={previewUrl}
			alt={i18n.t('scan.preview')}
			class="max-h-72 w-full rounded-lg border border-slate-200 dark:border-slate-700/60 object-cover"
		/>
	{:else}
		<div class="flex max-h-72 items-center justify-center rounded-lg bg-slate-50 dark:bg-boxdark text-4xl">🧾</div>
	{/if}

	<form class="space-y-3" onsubmit={(event) => { event.preventDefault(); save(); }}>
		{#if error}
			<p class="whitespace-pre-line rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
		{/if}

		<Input label={i18n.t('scan.merchant')} bind:value={merchantName} />
		<Input label={i18n.t('scan.date')} type="date" bind:value={date} required />
		<Input label={i18n.t('scan.total')} type="number" min="1" step="any" bind:value={total} required />

		<div class="rounded-lg bg-slate-50 dark:bg-boxdark p-3 text-xs text-slate-600 dark:text-slate-300">
			<p class="mb-2 font-semibold">{i18n.t('scan.itemsCount', { count: extraction.items.length })}</p>
			<table class="w-full text-left">
				<thead class="text-slate-400 dark:text-metadark">
					<tr>
						<th class="py-1">{i18n.t('common.item')}</th>
						<th class="py-1 text-right">{i18n.t('common.qty')}</th>
						<th class="py-1 text-right">{i18n.t('common.price')}</th>
						<th class="py-1 text-right">{i18n.t('common.discount')}</th>
						<th class="py-1 text-right">{i18n.t('common.subtotal')}</th>
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
				<span>{i18n.t('scan.total')}</span>
				<span>{formatCurrency(itemsTotal)}</span>
			</p>
		</div>

		<Select
			label={i18n.t('scan.category')}
			options={expenseCategories.map((c) => ({ value: c.id, label: c.name }))}
			bind:value={categoryId}
		/>
		<WalletSelect wallets={wallets} bind:value={walletId} />

		<div class="pt-1">
			<Button type="submit" variant="primary" icon="save" label={i18n.t('scan.saveTransaction')} loading={saving}>
				{i18n.t('scan.saveTransaction')}
			</Button>
		</div>
	</form>
</div>
