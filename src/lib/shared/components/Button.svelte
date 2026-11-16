<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

	interface Props {
		variant?: Variant;
		type?: 'button' | 'submit';
		disabled?: boolean;
		onclick?: () => void;
		children: Snippet;
	}

	const variants: Record<Variant, string> = {
		primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
		secondary: 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50',
		danger: 'bg-red-600 text-white hover:bg-red-700',
		ghost: 'text-slate-600 hover:bg-slate-200'
	};

	let { variant = 'primary', type = 'button', disabled = false, onclick, children }: Props =
		$props();
</script>

<button
	{type}
	{disabled}
	{onclick}
	class="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 {variants[variant]}"
>
	{@render children()}
</button>
