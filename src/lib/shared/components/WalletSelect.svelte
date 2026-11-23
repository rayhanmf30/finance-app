<script lang="ts">
	import type { Wallet } from '#lib/shared/models/domain';
	import { walletTypeLabel } from '#lib/core/auth/auth.service.svelte';

	interface Props {
		label?: string;
		wallets: Wallet[];
		value: string;
	}

	let { label = 'Dompet', wallets, value = $bindable('') }: Props = $props();

	// Kelompokkan dompet berdasarkan tipe (dinamis dari wallet_types).
	const groups = $derived.by(() => {
		const map = new Map<string, Wallet[]>();
		for (const w of wallets) {
			const list = map.get(w.type) ?? [];
			list.push(w);
			map.set(w.type, list);
		}
		return [...map.entries()].map(([type, list]) => ({
			label: walletTypeLabel(type),
			wallets: list
		}));
	});
</script>

<label class="block">
	<span class="mb-1 block text-sm font-medium text-slate-700">{label}</span>
	<select
		bind:value
		class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
	>
		{#each groups as group (group.label)}
			<optgroup label={group.label}>
				{#each group.wallets as w (w.id)}
					<option value={w.id}>{w.name}</option>
				{/each}
			</optgroup>
		{/each}
	</select>
</label>
