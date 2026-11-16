<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import '../app.css';
	import { authService } from '#lib/core/auth/auth.service.svelte';

	let { children }: { children: Snippet } = $props();

	onMount(() => {
		if (import.meta.env.PROD && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js');
		}
	});

	interface NavLink {
		href: string;
		label: string;
	}

	const links: NavLink[] = [
		{ href: '/', label: 'Dashboard' },
		{ href: '/transactions', label: 'Transaksi' }
	];

	const active = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<svelte:head>
	<title>Finance App</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-4xl flex-col px-4">
	<header class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4">
		<a href="/" class="text-lg font-bold text-indigo-600">💰 FinanceApp</a>
		<nav class="flex flex-wrap items-center gap-1">
			{#each links as link (link.href)}
				<a
					href={link.href}
					class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {active(link.href)
						? 'bg-indigo-50 text-indigo-700'
						: 'text-slate-600 hover:bg-slate-200'}"
				>
					{link.label}
				</a>
			{/each}
			<a
				href="/scan"
				class="ml-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
			>
				Scan Resi
			</a>
			{#if authService.currentUser}
				<span class="ml-3 hidden text-xs text-slate-400 sm:inline">
					{authService.currentUser.name}
				</span>
			{/if}
		</nav>
	</header>

	<main
		class="flex-1 py-4"
		style="padding-bottom: max(1rem, env(safe-area-inset-bottom));"
	>
		{@render children()}
	</main>

	<footer class="py-6 text-center text-xs text-slate-400">
		FinanceApp — pencatatan arus kas harian
	</footer>
</div>
