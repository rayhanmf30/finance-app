<script lang="ts">
	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		label: string;
		options: Option[];
		value: string;
		required?: boolean;
	}

	let { label, options, value = $bindable(''), required = false }: Props = $props();
</script>

<label class="block">
	<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
	<select
		bind:value
		{required}
		class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-boxdark-2 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
	>
		{#each options as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
</label>
