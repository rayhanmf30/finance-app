<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		class?: string;
		children: Snippet;
	}

	let { title, class: className = '', children }: Props = $props();
</script>

<div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 {className}">
	{#if title}
		<h3 class="mb-3 text-sm font-semibold text-slate-500">{title}</h3>
	{/if}
	{@render children()}
</div>
