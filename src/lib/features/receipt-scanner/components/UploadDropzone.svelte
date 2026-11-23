<script lang="ts">
	interface Props {
		disabled?: boolean;
		onfile: (file: File) => void;
	}

	let { disabled = false, onfile }: Props = $props();

	let dragging = $state(false);
	let error = $state<string | null>(null);
	let input: HTMLInputElement | null = $state(null);

	const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
	const MAX_SIZE_MB = 5;

	function handleFiles(files: FileList | null) {
		error = null;
		const file = files?.[0];
		if (!file) return;

		if (!ACCEPTED_TYPES.includes(file.type)) {
			error = 'Format harus .jpg, .png, atau .webp.';
			return;
		}
		if (file.size > MAX_SIZE_MB * 1024 * 1024) {
			error = 'Ukuran maksimal 5MB.';
			return;
		}
		onfile(file);
	}

	function drop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		if (!disabled) handleFiles(event.dataTransfer?.files ?? null);
	}
</script>

<div
	role="button"
	tabindex="0"
	class="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors {dragging
		? 'border-indigo-500 bg-indigo-50'
		: 'border-slate-300 dark:border-slate-600 bg-white dark:bg-boxdark-2 hover:border-indigo-400 hover:bg-slate-50 dark:bg-boxdark dark:hover:bg-boxdark-2'} {disabled
		? 'pointer-events-none opacity-60'
		: ''}"
	ondragover={(event) => {
		event.preventDefault();
		dragging = true;
	}}
	ondragleave={() => (dragging = false)}
	ondrop={drop}
	onclick={() => input?.click()}
	onkeydown={(event) => event.key === 'Enter' && input?.click()}
>
	<svg class="h-10 w-10 text-slate-400 dark:text-metadark" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
		<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
	</svg>
	<p class="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
		Tarik & lepas foto struk di sini, atau klik untuk memilih file
	</p>
	<p class="mt-1 text-xs text-slate-400 dark:text-metadark">.jpg, .png, .webp — maksimal 5MB</p>
	{#if error}
		<p class="mt-2 text-xs font-medium text-red-600">{error}</p>
	{/if}
	<input
		bind:this={input}
		type="file"
		accept={ACCEPTED_TYPES.join(',')}
		class="hidden"
		onchange={(event) => handleFiles(event.currentTarget.files)}
	/>
</div>
