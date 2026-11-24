<script lang="ts">
	import Icon from '#lib/shared/components/Icon.svelte';
	import IconButton from '#lib/shared/components/IconButton.svelte';
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';
	import { toast, type ToastType } from './toast.store.svelte';

	/**
	 * Host toast global — dipasang sekali di +layout.svelte.
	 * Semua notifikasi (sukses, gagal, info, peringatan) muncul sebagai
	 * tumpukan di kanan-atas, otomatis hilang, dan bisa ditutup manual.
	 */
	const styles: Record<ToastType, string> = {
		success: 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/40 dark:text-emerald-300',
		error: 'bg-red-50 border-red-300 text-red-800 dark:bg-red-500/10 dark:border-red-500/40 dark:text-red-300',
		info: 'bg-indigo-50 border-indigo-300 text-indigo-800 dark:bg-indigo-500/10 dark:border-indigo-500/40 dark:text-indigo-300',
		warning: 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/40 dark:text-amber-300'
	};

	const iconColors: Record<ToastType, string> = {
		success: 'text-emerald-600 dark:text-emerald-400',
		error: 'text-red-600 dark:text-red-400',
		info: 'text-indigo-600 dark:text-indigo-400',
		warning: 'text-amber-600 dark:text-amber-400'
	};

	const icons: Record<ToastType, 'check' | 'x' | 'info' | 'warning'> = {
		success: 'check',
		error: 'x',
		info: 'info',
		warning: 'warning'
	};
</script>

<aside
	class="pointer-events-none fixed right-3 top-3 z-[60] flex w-80 max-w-[calc(100vw-1.5rem)] flex-col gap-2 max-lg:top-[calc(0.75rem+env(safe-area-inset-top))]"
>
	{#each toast.items as item (item.id)}
		<div
			role="status"
			aria-live="polite"
			class="pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-lg {styles[item.type]}"
		>
			<Icon name={icons[item.type]} class="mt-0.5 h-4 w-4 shrink-0 {iconColors[item.type]}" weight={2.4} />
			<p class="min-w-0 flex-1 whitespace-pre-line break-words text-sm font-medium">{item.message}</p>
			<IconButton
				icon="x"
				label={i18n.t('toast.dismiss')}
				variant="default"
				onclick={() => toast.dismiss(item.id)}
			/>
		</div>
	{/each}
</aside>
