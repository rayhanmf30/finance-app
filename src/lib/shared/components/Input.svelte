<script lang="ts">
	interface Props {
		label: string;
		type?: string;
		value: string | number;
		placeholder?: string;
		required?: boolean;
		min?: string | number;
		max?: string | number;
		step?: string | number;
	}

	let { label, type = 'text', value = $bindable(''), placeholder = '', required = false, min, max, step }: Props = $props();
</script>

<label class="block">
	<span class="mb-1 block text-sm font-medium text-slate-700">{label}</span>
	<input
		{type}
		{placeholder}
		{required}
		{min}
		{max}
		{step}
		bind:value
		class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
	/>
</label>
