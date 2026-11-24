<script lang="ts">
	import type { BudgetInput, BudgetPeriodType, Category } from '#lib/shared/models/domain';
	import { Button, Modal } from '#lib/shared/components/index';
	import Input from '#lib/shared/components/Input.svelte';
	import Select from '#lib/shared/components/Select.svelte';
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';

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
		{ value: 'DAILY', label: i18n.t('period.daily') },
		{ value: 'WEEKLY', label: i18n.t('period.weekly') },
		{ value: 'MONTHLY', label: i18n.t('period.monthly') },
		{ value: 'YEARLY', label: i18n.t('period.yearly') }
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

<Modal title={i18n.t('dash.setupBudget')} onclose={onclose}>
	<form class="space-y-4" onsubmit={submit}>
		<Select
			label={i18n.t('tx.labelCategory')}
			options={[
				{ value: '', label: i18n.t('dash.globalCategory') },
				...categories
					.filter((c) => c.type === 'EXPENSE')
					.map((c) => ({ value: c.id, label: c.name }))
			]}
			bind:value={categoryId}
		/>
		<Select label={i18n.t('tx.labelDate')} options={periodOptions} bind:value={periodType} />
		<Input label={i18n.t('tx.labelAmount')} type="number" min="1" step="any" bind:value={limitAmount} required />
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
