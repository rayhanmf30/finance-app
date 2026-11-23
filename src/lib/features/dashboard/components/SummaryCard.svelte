<script lang="ts">
	interface Props {
		label: string;
		value: string;
		tone?: 'neutral' | 'positive' | 'negative';
	}

	const tones = {
		neutral: 'text-slate-900 dark:text-white',
		positive: 'text-emerald-600',
		negative: 'text-red-600'
	};

	let { label, value, tone = 'neutral' }: Props = $props();
</script>

<div class="rounded-xl bg-white dark:bg-boxdark-2 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
	<p class="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-metadark">{label}</p>
	<p class="mt-2 text-2xl font-bold tracking-tight {tones[tone]}">{value}</p>
</div>
