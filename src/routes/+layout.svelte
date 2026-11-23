<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import '../app.css';
	import { authService } from '#lib/core/auth/auth.service.svelte';

	let { children }: { children: Snippet } = $props();

	onMount(() => {
		authService.load();
		if (import.meta.env.PROD && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js');
		}
	});

	const isPublicPage = $derived(
		page.url.pathname.startsWith('/login') || page.url.pathname.startsWith('/register')
	);
	const showApp = $derived(isPublicPage || (authService.loaded && authService.currentUser));

	// Redirect ke halaman login bila belum login dan membuka halaman privat.
	$effect(() => {
		if (authService.loaded && !authService.currentUser && !isPublicPage) {
			goto('/login', { replaceState: true });
		}
	});

	async function handleLogout() {
		await authService.logout();
	}

	interface NavLink {
		href: string;
		label: string;
	}

	const links: NavLink[] = [
		{ href: '/', label: 'Dashboard' },
		{ href: '/transactions', label: 'Transaksi' }
	];

	const navLinks = $derived(
		authService.isAdmin ? [...links, { href: '/admin', label: 'Admin' }] : links
	);

	const active = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<svelte:head>
	<title>Finance App</title>
</svelte:head>

{#if showApp}
	<div class="mx-auto flex min-h-screen max-w-4xl flex-col px-4">
		<header class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4">
			<a href="/" class="text-lg font-bold text-indigo-600">💰 FinanceApp</a>
			<nav class="flex flex-wrap items-center gap-1">
				{#if authService.currentUser}
					{#each navLinks as link (link.href)}
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
					<span class="ml-3 hidden text-xs text-slate-400 sm:inline">
						{authService.currentUser.name}
					</span>
					<button
						type="button"
						onclick={handleLogout}
						class="ml-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
					>
						Keluar
					</button>
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
{:else}
	<div class="flex min-h-screen items-center justify-center">
		<p class="animate-pulse text-sm text-slate-400">Memuat…</p>
	</div>
{/if}
