<script lang="ts">
	import type { BudgetInput, BudgetPeriodType, BudgetStatusRow, Category } from '#lib/shared/models/domain';
	import { Button, Modal } from '#lib/shared/components/index';
	import AmountInput from '#lib/shared/components/AmountInput.svelte';
	import Input from '#lib/shared/components/Input.svelte';
	import Select from '#lib/shared/components/Select.svelte';
	import Icon from '#lib/shared/components/Icon.svelte';
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';

	interface Props {
		categories: Category[];
		/** Diisi saat mode edit (prefill nilai lama); null/undefined = mode tambah. */
		initial?: BudgetStatusRow | null;
		saving?: boolean;
		onsave: (input: BudgetInput) => void | Promise<void>;
		onclose: () => void;
	}

	let { categories, initial = null, saving = false, onsave, onclose }: Props = $props();

	// Prefill mode edit dibaca sekali saat inisialisasi (untrack).
	// svelte-ignore state_referenced_locally
	let selectedIds = $state<string[]>(initial ? [...initial.categoryIds] : []);
	// svelte-ignore state_referenced_locally
	let periodType = $state<BudgetPeriodType>(initial?.periodType ?? 'MONTHLY');
	// svelte-ignore state_referenced_locally
	let limitAmount = $state<number>(initial?.limitAmount ?? 0);
	// svelte-ignore state_referenced_locally
	let warningThresholdPct = $state<number>(initial?.warningThresholdPct ?? 80);

	const isEdit = $derived(initial !== null);

	const expenseCategories = $derived(categories.filter((c) => c.type === 'EXPENSE'));

	const periodOptions: { value: BudgetPeriodType; label: string }[] = [
		{ value: 'DAILY', label: i18n.t('period.daily') },
		{ value: 'WEEKLY', label: i18n.t('period.weekly') },
		{ value: 'MONTHLY', label: i18n.t('period.monthly') },
		{ value: 'YEARLY', label: i18n.t('period.yearly') }
	];

	function toggleCategory(id: string) {
		if (saving) return;
		selectedIds = selectedIds.includes(id)
			? selectedIds.filter((v) => v !== id)
			: [...selectedIds, id];
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return; // anti double-klik: abaikan klik saat proses berjalan
		if (limitAmount <= 0) return;
		void onsave({ categoryIds: selectedIds, periodType, limitAmount, warningThresholdPct });
	}
</script>

<Modal title={isEdit ? i18n.t('budget.editTitle') : i18n.t('dash.setupBudget')} onclose={onclose}>
	<form class="space-y-4" onsubmit={submit}>
		<fieldset disabled={saving}>
			<legend class="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
				{i18n.t('budget.categories')}
			</legend>
			<div
				class="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700 dark:bg-boxdark"
			>
				{#each expenseCategories as category (category.id)}
					<label
						class="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-slate-100 {selectedIds.includes(
							category.id
						)
							? 'bg-slate-100 dark:bg-boxdark-2'
							: ''} dark:text-slate-200 dark:hover:bg-boxdark-2"
					>
						<input
							type="checkbox"
							class="h-4 w-4 cursor-pointer accent-indigo-600"
							checked={selectedIds.includes(category.id)}
							onchange={() => toggleCategory(category.id)}
						/>
						<span class="flex-1">{category.name}</span>
						{#if selectedIds.includes(category.id)}
							<Icon name="check" class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
						{/if}
					</label>
				{/each}
			</div>
			<p class="mt-1 text-xs text-slate-400 dark:text-metadark">
				{selectedIds.length === 0
					? i18n.t('budget.globalHint')
					: `${i18n.t('budget.selectedCount')} ${selectedIds.length}`}
			</p>
		</fieldset>

		<Select label={i18n.t('budget.period')} options={periodOptions} bind:value={periodType} />
		<!-- Nominal: AmountInput dengan separator ribuan; nilai terkirim tetap number. -->
		<AmountInput label={i18n.t('tx.labelAmount')} bind:value={limitAmount} min={1} required />
		<Input
			label={i18n.t('budget.threshold')}
			type="number"
			min="1"
			max="100"
			bind:value={warningThresholdPct}
			required
		/>

		<div class="pt-2">
			<Button type="submit" variant="primary" loading={saving}>
				{saving ? i18n.t('scan.saving') : i18n.t('common.save')}
			</Button>
		</div>
	</form>
</Modal>
