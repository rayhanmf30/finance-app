<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';
	import type { IconName } from './icon-paths';

	type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

	interface Props {
		variant?: Variant;
		type?: 'button' | 'submit';
		disabled?: boolean;
		/** True saat proses berjalan — tombol tampil spinner dan tidak dapat diklik. */
		loading?: boolean;
		/** Bila diisi, tombol menampilkan ikon (standar UI: simbol alih-alih teks). */
		icon?: IconName;
		/** aria-label/title — wajib bila memakai ikon tanpa teks. */
		label?: string;
		onclick?: () => void;
		children?: Snippet;
	}

	const variants: Record<Variant, string> = {
		primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
		secondary:
			'bg-white dark:bg-boxdark-2 text-slate-700 dark:text-slate-200 ring-1 ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:bg-boxdark dark:hover:bg-boxdark-2',
		danger: 'bg-red-600 text-white hover:bg-red-700',
		ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
	};

	let {
		variant = 'primary',
		type = 'button',
		disabled = false,
		loading = false,
		icon = undefined,
		label = '',
		onclick,
		children
	}: Props = $props();
</script>

<button
	{type}
	disabled={disabled || loading}
	{onclick}
	aria-label={label || undefined}
	title={label || undefined}
	class="inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 {variants[variant]}"
>
	{#if loading}
		<svg class="inline h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
		</svg>
	{:else if icon}
		<Icon name={icon} />
	{/if}
	{#if children && (!icon || loading)}
		{@render children()}
	{/if}
</button>
