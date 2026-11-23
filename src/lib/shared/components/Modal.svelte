<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		onclose: () => void;
		children: Snippet;
	}

	let { title, onclose, children }: Props = $props();

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
	role="presentation"
	onclick={(event) => {
		if (event.target === event.currentTarget) onclose();
	}}
>
	<div
		class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white dark:bg-boxdark-2 p-6 shadow-xl"
		role="dialog"
		aria-modal="true"
		aria-label={title}
	>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
			<button
				type="button"
				aria-label="Tutup"
				class="cursor-pointer rounded-lg p-1 text-slate-400 dark:text-metadark hover:bg-slate-100 dark:bg-boxdark-2 dark:hover:bg-boxdark hover:text-slate-600 dark:text-slate-300"
				onclick={onclose}
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
		{@render children()}
	</div>
</div>
