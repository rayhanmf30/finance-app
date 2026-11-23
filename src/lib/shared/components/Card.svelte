<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		class?: string;
		children: Snippet;
	}

	let { title, class: className = '', children }: Props = $props();
</script>

<div class="rounded-xl bg-white dark:bg-boxdark-2 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 {className}">
	{#if title}
		<h3 class="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-metadark">{title}</h3>
	{/if}
	{@render children()}
</div>
