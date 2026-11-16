<script lang="ts">
	import type { BudgetInput, BudgetPeriodType, Category } from '#lib/shared/models/domain';
	import { Button, Modal } from '#lib/shared/components/index';
	import Input from '#lib/shared/components/Input.svelte';
	import Select from '#lib/shared/components/Select.svelte';

	interface Props {
		categories: Category[];
		saving?: boolean;
		onsave: (input: BudgetInput) => void;
		onclose: () => void;
	}

	let { categories, saving = false, onsave, onclose }: Props = $props();

	let categoryId = $state('');
	let periodType = $state<BudgetPeriodType>('MONTHLY');
	let limitAmount = $state<number>(0);
	let warningThresholdPct = $state<number>(80);

	const periodOptions: { value: BudgetPeriodType; label: string }[] = [
		{ value: 'DAILY', label: 'Harian' },
		{ value: 'WEEKLY', label: 'Mingguan' },
		{ value: 'MONTHLY', label: 'Bulanan' },
		{ value: 'YEARLY', label: 'Tahunan' }
	];

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (limitAmount <= 0) return;
		onsave({
			categoryId: categoryId || null,
			periodType,
			limitAmount,
			warningThresholdPct
		});
	}
</script>

<Modal title="Atur Budget" onclose={onclose}>
	<form class="space-y-4" onsubmit={submit}>
		<Select
			label="Kategori"
			options={[
				{ value: '', label: 'Total semua pengeluaran (global)' },
				...categories
					.filter((c) => c.type === 'EXPENSE')
					.map((c) => ({ value: c.id, label: c.name }))
			]}
			bind:value={categoryId}
		/>
		<Select label="Periode" options={periodOptions} bind:value={periodType} />
		<Input label="Limit (Rp)" type="number" min="1" step="any" bind:value={limitAmount} required />
		<Input
			label="Threshold peringatan (%)"
			type="number"
			min="1"
			max="100"
			bind:value={warningThresholdPct}
			required
		/>

		<div class="pt-2">
			<Button type="submit" variant="primary" disabled={saving}>
				{saving ? 'Menyimpan…' : 'Simpan Budget'}
			</Button>
		</div>
	</form>
</Modal>
