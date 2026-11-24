<script lang="ts">
	import Icon from './Icon.svelte';
	import type { IconName } from './icon-paths';

	interface Props {
		/** Nama ikon (wajib — tombol selalu berbasis simbol, label di aria-label/title). */
		icon: IconName;
		/** Label aksesibilitas + tooltip; wajib karena tombol ikon tanpa teks. */
		label: string;
		variant?: 'default' | 'danger' | 'primary';
		type?: 'button' | 'submit';
		/** sm: tombol aksi baris tabel; md: tombol utama (submit form, header). */
		size?: 'sm' | 'md';
		disabled?: boolean;
		loading?: boolean;
		onclick?: () => void;
	}

	let { icon, label, variant = 'default', type = 'button', size = 'sm', disabled = false, loading = false, onclick }: Props = $props();

	const variants = {
		default: 'text-slate-400 dark:text-metadark hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-boxdark dark:hover:text-indigo-400',
		primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
		danger: 'text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10'
	};
</script>

<button
	{type}
	aria-label={label}
	title={label}
	disabled={disabled || loading}
	{onclick}
	class="cursor-pointer rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 {size === 'md' ? 'px-4 py-2.5' : 'p-1.5 rounded-md'} {variants[variant]}"
>
	{#if loading}
		<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
		</svg>
	{:else}
		<Icon name={icon} />
	{/if}
</button>
