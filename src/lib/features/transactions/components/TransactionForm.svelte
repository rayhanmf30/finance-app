<script lang="ts">
	import type { Category, TransactionInput, TransactionType, Wallet } from '#lib/shared/models/domain';
	import { Button } from '#lib/shared/components/index';
	import Input from '#lib/shared/components/Input.svelte';
	import Select from '#lib/shared/components/Select.svelte';
	import WalletSelect from '#lib/shared/components/WalletSelect.svelte';

	interface Props {
		categories: Category[];
		wallets: Wallet[];
		onsubmit: (input: TransactionInput) => void;
	}

	let { categories, wallets, onsubmit }: Props = $props();

	let type = $state<TransactionType>('EXPENSE');
	let amount = $state<number>(0);
	let date = $state(new Date().toISOString().slice(0, 10));
	let categoryId = $state('');
	let walletId = $state('');
	let note = $state('');

	$effect(() => {
		if (!walletId && wallets.length > 0) walletId = wallets[0].id;
	});

	const visibleCategories = $derived(categories.filter((c) => c.type === type));

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (amount <= 0 || !walletId) return;

		onsubmit({
			type,
			amount,
			walletId,
			categoryId: categoryId || null,
			transactionDate: new Date(`${date}T12:00:00`).toISOString(),
			note
		});

		amount = 0;
		note = '';
	}
</script>

<form onsubmit={submit} class="space-y-4">
	<div class="grid grid-cols-2 gap-2">
		<button
			type="button"
			class="cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors {type === 'EXPENSE'
				? 'border-red-500 bg-red-50 text-red-700'
				: 'border-slate-200 text-slate-500'}"
			onclick={() => (type = 'EXPENSE')}
		>
			Pengeluaran
		</button>
		<button
			type="button"
			class="cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors {type === 'INCOME'
				? 'border-emerald-500 bg-emerald-50 text-emerald-700'
				: 'border-slate-200 text-slate-500'}"
			onclick={() => (type = 'INCOME')}
		>
			Pemasukan
		</button>
	</div>

	<Input label="Nominal" type="number" min="1" step="any" bind:value={amount} required />
	<Input label="Tanggal" type="date" bind:value={date} required />
	<WalletSelect wallets={wallets} bind:value={walletId} />
	<Select
		label="Kategori"
		options={[
			{ value: '', label: 'Tanpa kategori' },
			...visibleCategories.map((c) => ({ value: c.id, label: c.name }))
		]}
		bind:value={categoryId}
	/>
	<Input label="Catatan (opsional)" placeholder="Keterangan singkat" bind:value={note} />

	<div class="pt-2">
		<Button type="submit" variant="primary">Simpan Transaksi</Button>
	</div>
</form>
