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
		onsave: (inputs: Omit<TransactionInput, 'type'>[]) => void;
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

	let mode = $state<'single' | 'items'>('single');
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
		extraction.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) +
			extraction.tax -
			extraction.discount
	);

	function save() {
		const transactionDate = new Date(`${date}T12:00:00`).toISOString();

		if (mode === 'single') {
			onsave([
				{
					walletId,
					categoryId: categoryId || null,
					amount: total,
					transactionDate,
					note: merchantName
				}
			]);
			return;
		}

		onsave(
			extraction.items.map((item) => ({
				walletId,
				categoryId: categoryId || null,
				amount: item.quantity * item.unitPrice,
				transactionDate,
				note: `${merchantName} — ${item.name}`
			}))
		);
	}
</script>

<Modal title="Review Hasil Scan" onclose={onclose}>
	<div class="grid gap-5 sm:grid-cols-[1fr_1.2fr]">
		{#if previewUrl}
			<img
				src={previewUrl}
				alt="Pratinjau struk"
				class="max-h-72 w-full rounded-lg border border-slate-200 object-cover"
			/>
		{/if}

		<form class="space-y-3" onsubmit={(event) => { event.preventDefault(); save(); }}>
			<div class="mb-1 grid grid-cols-2 gap-2">
				<button
					type="button"
					class="cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-medium {mode === 'single'
						? 'border-indigo-500 bg-indigo-50 text-indigo-700'
						: 'border-slate-200 text-slate-500'}"
					onclick={() => (mode = 'single')}
				>
					Satu transaksi
				</button>
				<button
					type="button"
					class="cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-medium {mode === 'items'
						? 'border-indigo-500 bg-indigo-50 text-indigo-700'
						: 'border-slate-200 text-slate-500'}"
					onclick={() => (mode = 'items')}
				>
					Pecah per item
				</button>
			</div>

			<Input label="Merchant" bind:value={merchantName} />
			<Input label="Tanggal" type="date" bind:value={date} required />

			{#if mode === 'single'}
				<Input label="Total" type="number" min="1" step="any" bind:value={total} required />
			{:else}
				<div class="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
					<p class="mb-2 font-semibold">Rincian item ({extraction.items.length})</p>
					<ul class="space-y-1">
						{#each extraction.items as item (item.name)}
							<li class="flex justify-between">
								<span>{item.name} × {item.quantity}</span>
								<span>{formatCurrency(item.quantity * item.unitPrice)}</span>
							</li>
						{/each}
					</ul>
					<p class="mt-2 flex justify-between border-t border-slate-200 pt-2 font-semibold">
						<span>Total item</span>
						<span>{formatCurrency(itemsTotal)}</span>
					</p>
				</div>
			{/if}

			<Select
				label="Kategori"
				options={expenseCategories.map((c) => ({ value: c.id, label: c.name }))}
				bind:value={categoryId}
			/>
			<WalletSelect wallets={wallets} bind:value={walletId} />

			<div class="pt-1">
				<Button type="submit" variant="primary" disabled={saving}>
					{saving ? 'Menyimpan…' : 'Simpan Transaksi'}
				</Button>
			</div>
		</form>
	</div>
</Modal>
