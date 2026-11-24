<script lang="ts">
	import Icon from './Icon.svelte';
	import IconButton from './IconButton.svelte';
	import type { IconName } from './icon-paths';
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';

	/**
	 * Aksi baris tabel. Aturan baku (lihat CONTRIBUTING.md):
	 * - tombol aksi tabel selalu ikon (dengan aria-label);
	 * - bila jumlah aksi terlihat > 3, dirender sebagai menu titik tiga (),
	 *   dan seluruh aksi muncul di dropdown yang terbuka KE ATAS saat ikon diklik,
	 *   agar tidak terpotong tepi bawah tabel.
	 */
	export interface MenuItem {
		icon: IconName;
		label: string;
		onclick: () => void;
		danger?: boolean;
		disabled?: boolean;
	}

	interface Props {
		items: MenuItem[];
	}

	let { items }: Props = $props();

	let open = $state(false);

	const visible = $derived(items);
	/** Lebih dari 3 aksi → pakai menu titik tiga. */
	const useKebab = $derived(visible.length > 3);

	function run(item: MenuItem) {
		open = false;
		item.onclick();
	}

	function onWindowClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (open && !target.closest('[data-action-menu]')) open = false;
	}
</script>

<svelte:window onclick={onWindowClick} />

<div class="relative flex items-center justify-end" data-action-menu>
	{#if useKebab}
		<IconButton icon="dots" label={i18n.t('common.actions')} variant="default" onclick={() => (open = !open)} />
		{#if open}
			<div
				class="absolute bottom-full z-10 mb-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700/60 dark:bg-boxdark-2"
				role="menu"
			>
				{#each visible as item (item.label)}
					<button
						type="button"
						role="menuitem"
						disabled={item.disabled}
						class="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 {item.danger
							? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10'
							: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-boxdark'}"
						onclick={() => run(item)}
					>
						<Icon name={item.icon} class="h-4 w-4 shrink-0" />
						{item.label}
					</button>
				{/each}
			</div>
		{/if}
	{:else}
		{#each visible as item (item.label)}
			<IconButton icon={item.icon} label={item.label} variant={item.danger ? 'danger' : 'default'} disabled={item.disabled} onclick={() => run(item)} />
		{/each}
	{/if}
</div>
