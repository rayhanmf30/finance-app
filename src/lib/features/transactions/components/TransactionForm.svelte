<script lang="ts">
	import type { Category, Transaction, TransactionInput, TransactionType, Wallet } from '#lib/shared/models/domain';
	import { Button } from '#lib/shared/components/index';
	import Input from '#lib/shared/components/Input.svelte';
	import Select from '#lib/shared/components/Select.svelte';
	import WalletSelect from '#lib/shared/components/WalletSelect.svelte';
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';

	interface Props {
		categories: Category[];
		wallets: Wallet[];
		/** Boleh async — form menunggu sampai proses benar-benar selesai sebelum mengizinkan submit lagi. */
		onsubmit: (input: TransactionInput) => void | Promise<void>;
		/** Diisi saat mode edit transaksi (prefill nilai lama). */
		initial?: Transaction | null;
	}

	let { categories, wallets, onsubmit, initial = null }: Props = $props();

	// Prefill untuk mode edit sengaja dibaca sekali saat inisialisasi.
	// svelte-ignore state_referenced_locally
	let type = $state<TransactionType>(initial?.type ?? 'EXPENSE');
	// svelte-ignore state_referenced_locally
	let amount = $state<number>(initial?.amount ?? 0);
	// svelte-ignore state_referenced_locally
	let date = $state(initial ? initial.transactionDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
	// svelte-ignore state_referenced_locally
	let categoryId = $state(initial?.categoryId ?? '');
	// svelte-ignore state_referenced_locally
	let walletId = $state(initial?.walletId ?? '');
	// svelte-ignore state_referenced_locally
	let destinationWalletId = $state(initial?.destinationWalletId ?? '');
	// svelte-ignore state_referenced_locally
	let note = $state(initial?.note ?? '');

	$effect(() => {
		if (!walletId && wallets.length > 0) walletId = wallets[0].id;
	});

	// Pindah saldo: pilih otomatis dompet tujuan yang berbeda dari dompet sumber.
	$effect(() => {
		if (type !== 'TRANSFER') return;
		if (!destinationWalletId || destinationWalletId === walletId) {
			destinationWalletId = wallets.find((w) => w.id !== walletId)?.id ?? '';
		}
	});

	const visibleCategories = $derived(categories.filter((c) => c.type === type));
	const destinationOptions = $derived(
		wallets
			.filter((w) => w.id !== walletId)
			.map((w) => ({ value: w.id, label: w.typeLabel ? `${w.name} (${w.typeLabel})` : w.name }))
	);

	let submitting = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (submitting || amount <= 0 || !walletId) return;
		if (type === 'TRANSFER' && (!destinationWalletId || destinationWalletId === walletId)) return;

		submitting = true;
		try {
			await onsubmit({
				type,
				amount,
				walletId,
				destinationWalletId: type === 'TRANSFER' ? destinationWalletId : null,
				categoryId: type === 'TRANSFER' ? null : categoryId || null,
				transactionDate: new Date(`${date}T12:00:00`).toISOString(),
				note
			});
			// Input hanya dikosongkan setelah proses berhasil (mode tanpa prefill/navigasi).
			if (!initial) {
				amount = 0;
				note = '';
			}
		} finally {
			submitting = false;
		}
	}
</script>

<form onsubmit={submit} class="space-y-4">
	<div class="grid grid-cols-3 gap-2">
		<button
			type="button"
			class="cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors {type === 'EXPENSE'
				? 'border-red-500 bg-red-50 text-red-700'
				: 'border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 dark:text-metadark'}"
			onclick={() => (type = 'EXPENSE')}
		>
			{i18n.t('type.expense')}
		</button>
		<button
			type="button"
			class="cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors {type === 'INCOME'
				? 'border-emerald-500 bg-emerald-50 text-emerald-700'
				: 'border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 dark:text-metadark'}"
			onclick={() => (type = 'INCOME')}
		>
			{i18n.t('type.income')}
		</button>
		<button
			type="button"
			class="cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors {type === 'TRANSFER'
				? 'border-indigo-500 bg-indigo-50 text-indigo-700'
				: 'border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 dark:text-metadark'}"
			onclick={() => (type = 'TRANSFER')}
		>
			{i18n.t('type.transfer')}
		</button>
	</div>

	<Input label={i18n.t('tx.labelAmount')} type="number" min="1" step="any" bind:value={amount} required />
	<Input label={i18n.t('tx.labelDate')} type="date" bind:value={date} required />
	<WalletSelect wallets={wallets} bind:value={walletId} />
	{#if type === 'TRANSFER'}
		<Select
			label={i18n.t('tx.labelDestination')}
			required
			options={[
				{ value: '', label: i18n.t('tx.selectDestination') },
				...destinationOptions
			]}
			bind:value={destinationWalletId}
		/>
	{:else}
		<Select
			label={i18n.t('tx.labelCategory')}
			options={[
				{ value: '', label: i18n.t('tx.noCategory') },
				...visibleCategories.map((c) => ({ value: c.id, label: c.name }))
			]}
			bind:value={categoryId}
		/>
	{/if}
	<Input placeholder={i18n.t('tx.notePlaceholder')} label={`${i18n.t('tx.labelNote')} (${i18n.t('common.optional')})`} bind:value={note} />

	<div class="pt-2">
		<Button type="submit" variant="primary" loading={submitting}>
			{initial ? i18n.t('common.save') : type === 'TRANSFER' ? i18n.t('type.transfer') : i18n.t('scan.saveTransaction')}
		</Button>
	</div>
</form>
