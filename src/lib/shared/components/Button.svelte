<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

	interface Props {
		variant?: Variant;
		type?: 'button' | 'submit';
		disabled?: boolean;
		/** True saat proses berjalan — tombol tampil spinner dan tidak dapat diklik. */
		loading?: boolean;
		onclick?: () => void;
		children: Snippet;
	}

	const variants: Record<Variant, string> = {
		primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
		secondary: 'bg-white dark:bg-boxdark-2 text-slate-700 dark:text-slate-200 ring-1 ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:bg-boxdark dark:hover:bg-boxdark-2',
		danger: 'bg-red-600 text-white hover:bg-red-700',
		ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
	};

	let { variant = 'primary', type = 'button', disabled = false, loading = false, onclick, children }: Props =
		$props();
</script>

<button
	{type}
	disabled={disabled || loading}
	{onclick}
	class="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 {variants[variant]}"
>
	{#if loading}
		<svg class="mr-1 inline h-4 w-4 animate-spin align-[-2px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
		</svg>
	{/if}
	{@render children()}
</button>
