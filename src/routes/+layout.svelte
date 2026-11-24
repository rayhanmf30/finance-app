<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import '../app.css';
	import { authService } from '#lib/core/auth/auth.service.svelte';
	import { themeService } from '#lib/core/theme/theme.service.svelte';
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';
	import Icon from '#lib/shared/components/Icon.svelte';
	import ToastHost from '#lib/shared/toast/ToastHost.svelte';

	let { children }: { children: Snippet } = $props();

	onMount(() => {
		authService.load();
		themeService.init();
		i18n.init();
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

	let sidebarOpen = $state(false);

	// Tutup drawer mobile tiap pindah halaman.
	$effect(() => {
		page.url.pathname;
		sidebarOpen = false;
	});

	async function handleLogout() {
		await authService.logout();
	}

	interface NavLink {
		href: string;
		labelKey: string;
		icon: 'dashboard' | 'transactions' | 'budget' | 'admin' | 'settings';
	}

	const links: NavLink[] = [
		{ href: '/', labelKey: 'nav.dashboard', icon: 'dashboard' },
		{ href: '/transactions', labelKey: 'nav.transactions', icon: 'transactions' },
		{ href: '/budgets', labelKey: 'nav.budget', icon: 'budget' }
	];

	const navLinks = $derived<NavLink[]>(links);

	const adminTabs: { id: string; labelKey: string }[] = [
		{ id: 'users', labelKey: 'admin.tab.users' },
		{ id: 'categories', labelKey: 'admin.tab.categories' },
		{ id: 'walletTypes', labelKey: 'admin.tab.walletTypes' },
		{ id: 'wallets', labelKey: 'admin.tab.wallets' }
	];

	const currentTab = $derived(
		adminTabs.find((t) => t.id === page.url.searchParams.get('tab'))?.id ?? 'users'
	);

	const isAdminPage = $derived(page.url.pathname.startsWith('/admin'));

	// ---- Tree Pengaturan (per-pengguna) ----
	const settingsTabs: { id: string; labelKey: string }[] = [
		{ id: 'categories', labelKey: 'set.tab.categories' },
		{ id: 'walletTypes', labelKey: 'set.tab.walletTypes' },
		{ id: 'wallets', labelKey: 'set.tab.wallets' }
	];

	const currentSettingsTab = $derived(
		settingsTabs.find((t) => t.id === page.url.searchParams.get('tab'))?.id ?? 'categories'
	);

	const isSettingsPage = $derived(page.url.pathname.startsWith('/pengaturan'));

	let settingsOpen = $state(true);

	const active = (href: string) =>
		href === '/'
			? page.url.pathname === '/'
			: page.url.pathname.startsWith(href);

	const initialValues: Record<NavLink['icon'], string> = {
		dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
		transactions: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l2.3 2.3a1 1 0 00.7.3H17a1 1 0 00.7-.3L20 10M9 19a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z',
		budget: 'M12 21a9 9 0 110-18 9 9 0 010 18zm0-3a6 6 0 100-12 6 6 0 000 12zm0-3a3 3 0 100-6 3 3 0 000 6z',
		admin: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
		settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z'
	};

	let adminOpen = $state(true);

	const activeNavLink = $derived(navLinks.find((l) => active(l.href)));
	const pageTitle = $derived(
		isAdminPage
			? `${i18n.t('nav.admin')} — ${i18n.t(adminTabs.find((t) => t.id === currentTab)?.labelKey ?? 'admin.tab.users')}`
			: isSettingsPage
				? `${i18n.t('nav.settings')} — ${i18n.t(settingsTabs.find((t) => t.id === currentSettingsTab)?.labelKey ?? 'set.tab.categories')}`
				: activeNavLink
					? i18n.t(activeNavLink.labelKey)
					: ''
	);
</script>

<svelte:head>
	<title>{pageTitle ? `${pageTitle} — FinanceApp` : 'FinanceApp'}</title>
</svelte:head>

{#if showApp}
	{#if isPublicPage}
		<!-- Halaman publik: tanpa shell sidebar -->
		<div class="min-h-screen">
			{@render children()}
		</div>
	{:else}
		<div class="min-h-screen">
			<!-- Overlay drawer mobile -->
			{#if sidebarOpen}
				<button
					type="button"
					aria-label={i18n.t('nav.closeMenu')}
					class="fixed inset-0 z-30 cursor-pointer bg-black/50 lg:hidden"
					onclick={() => (sidebarOpen = false)}
				></button>
			{/if}

			<!-- Sidebar (TailAdmin style) -->
			<aside
				class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-700/60 dark:bg-boxdark lg:translate-x-0
					max-lg:pt-[env(safe-area-inset-top)] {sidebarOpen ? 'translate-x-0' : '-translate-x-full'}"
			>
				<!-- Logo -->
				<div class="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 px-6 dark:border-slate-700/60">
					<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V6a3 3 0 00-3-3H6a3 3 0 00-3 3v10a3 3 0 003 3z" />
						</svg>
					</span>
					<span class="text-xl font-bold text-slate-900 dark:text-white">FinanceApp</span>
				</div>

				<!-- Menu -->
				<nav class="flex-1 space-y-2 overflow-y-auto px-4 py-6">
					<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">{i18n.t('nav.menu')}</p>
					{#each navLinks as link (link.href)}
						<a
							href={link.href}
							onclick={() => (sidebarOpen = false)}
							class="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors {active(link.href)
								? 'bg-indigo-600 text-white'
								: 'text-slate-600 hover:bg-slate-100 dark:text-metadark dark:hover:bg-boxdark-2 dark:hover:text-white'}"
						>
							<svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
								<path stroke-linecap="round" stroke-linejoin="round" d={initialValues[link.icon]} />
							</svg>
							{i18n.t(link.labelKey)}
						</a>
					{/each}

					<!-- Tree Pengaturan: kategori, tipe dompet & dompet milik pengguna login -->
					<div>
						<button
							type="button"
							class="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors {isSettingsPage
								? 'bg-indigo-600 text-white'
								: 'text-slate-600 hover:bg-slate-100 dark:text-metadark dark:hover:bg-boxdark-2 dark:hover:text-white'}"
							onclick={() => {
								settingsOpen = !settingsOpen;
								if (!isSettingsPage) goto('/pengaturan?tab=categories');
								else if (!settingsOpen && isSettingsPage) sidebarOpen = false;
							}}
						>
							<svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
								<path stroke-linecap="round" stroke-linejoin="round" d={initialValues.settings} />
							</svg>
							<span class="flex-1 text-left">{i18n.t('nav.settings')}</span>
							<svg
								class="h-4 w-4 transition-transform {settingsOpen ? 'rotate-90' : ''}"
								fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
							</svg>
						</button>

						{#if settingsOpen}
							<div class="ml-8 mt-1 space-y-1 border-l border-slate-200 pl-3 dark:border-slate-700">
								{#each settingsTabs as tab (tab.id)}
									<a
										href="/pengaturan?tab={tab.id}"
										onclick={() => (sidebarOpen = false)}
										class="block rounded-md px-3 py-1.5 text-sm transition-colors {isSettingsPage && currentSettingsTab === tab.id
											? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-boxdark-2 dark:text-white'
											: 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-metadark dark:hover:bg-boxdark-2 dark:hover:text-white'}"
									>
										{i18n.t(tab.labelKey)}
									</a>
								{/each}
							</div>
						{/if}
					</div>

					{#if authService.isAdmin}
						<div>
							<button
								type="button"
								class="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors {isAdminPage
									? 'bg-indigo-600 text-white'
									: 'text-slate-600 hover:bg-slate-100 dark:text-metadark dark:hover:bg-boxdark-2 dark:hover:text-white'}"
								onclick={() => {
									adminOpen = !adminOpen;
									if (!isAdminPage) goto('/admin?tab=users');
									else if (!adminOpen && isAdminPage) sidebarOpen = false;
								}}
							>
								<svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
									<path stroke-linecap="round" stroke-linejoin="round" d={initialValues.admin} />
								</svg>
								<span class="flex-1 text-left">{i18n.t('nav.admin')}</span>
								<svg
									class="h-4 w-4 transition-transform {adminOpen ? 'rotate-90' : ''}"
									fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
								</svg>
							</button>

							{#if adminOpen}
								<div class="ml-8 mt-1 space-y-1 border-l border-slate-200 pl-3 dark:border-slate-700">
									{#each adminTabs as tab (tab.id)}
										<a
											href="/admin?tab={tab.id}"
											onclick={() => (sidebarOpen = false)}
											class="block rounded-md px-3 py-1.5 text-sm transition-colors {isAdminPage && currentTab === tab.id
												? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-boxdark-2 dark:text-white'
												: 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-metadark dark:hover:bg-boxdark-2 dark:hover:text-white'}"
										>
											{i18n.t(tab.labelKey)}
										</a>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</nav>

				<!-- User di bawah sidebar -->
				<div class="shrink-0 border-t border-slate-200 p-4 dark:border-slate-700/60">
					<div class="flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-boxdark-2">
						<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-boxdark dark:text-indigo-300">
							{authService.currentUser?.name.slice(0, 1).toUpperCase()}
						</span>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-slate-900 dark:text-white">{authService.currentUser?.name}</p>
							<p class="truncate text-xs text-slate-400 dark:text-metadark">{authService.currentUser?.email}</p>
						</div>
					</div>
					<button
						type="button"
						aria-label={i18n.t('nav.logout')}
						title={i18n.t('nav.logout')}
						onclick={handleLogout}
						class="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-metadark dark:hover:bg-red-500/10 dark:hover:text-red-400"
					>
						<Icon name="logout" class="h-4 w-4" />
					</button>
				</div>
			</aside>

			<!-- Area konten -->
			<div class="flex min-h-screen flex-col lg:pl-64">
				<!-- Header sticky -->
				<header
					class="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 dark:border-slate-700/60 dark:bg-boxdark-2
						max-lg:pt-[env(safe-area-inset-top)]"
				>
					<div class="flex items-center gap-2">
						<!-- Hamburger (mobile) -->
						<button
							type="button"
							aria-label={i18n.t('nav.openMenu')}
							class="cursor-pointer rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-metadark dark:hover:bg-boxdark lg:hidden"
							onclick={() => (sidebarOpen = true)}
						>
							<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
							</svg>
						</button>
						<h1 class="text-base font-semibold text-slate-900 dark:text-white">{pageTitle}</h1>
					</div>

					<div class="flex items-center gap-2">
						<!-- Toggle bahasa (id ⇄ en) -->
						<button
							type="button"
							aria-label={i18n.locale === 'id' ? i18n.t('nav.toEnglish') : i18n.t('nav.toIndonesian')}
							title={i18n.locale === 'id' ? i18n.t('nav.toEnglish') : i18n.t('nav.toIndonesian')}
							class="cursor-pointer rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-metadark dark:hover:bg-boxdark dark:hover:text-white"
							onclick={() => i18n.toggle()}
						>
							<Icon name="globe" class="h-5 w-5" />
						</button>

						<!-- Toggle tema -->
						<button
							type="button"
							aria-label={themeService.current === 'dark' ? i18n.t('nav.toLight') : i18n.t('nav.toDark')}
							title={themeService.current === 'dark' ? i18n.t('nav.toLight') : i18n.t('nav.toDark')}
							class="cursor-pointer rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-metadark dark:hover:bg-boxdark dark:hover:text-white"
							onclick={() => themeService.toggle()}
						>
							<Icon name={themeService.current === 'dark' ? 'sun' : 'moon'} class="h-5 w-5" />
						</button>
					</div>
				</header>

				<main
					class="flex-1 px-4 py-6 sm:px-6"
					style="padding-bottom: max(1.5rem, env(safe-area-inset-bottom));"
				>
					{@render children()}
				</main>

				<footer class="border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-400 dark:border-slate-700/60 dark:text-metadark">
					{i18n.t('nav.footer')}
				</footer>
			</div>
		</div>
	{/if}
{:else}
	<div class="flex min-h-screen items-center justify-center">
		<p class="animate-pulse text-sm text-slate-400 dark:text-metadark">{i18n.t('common.loading')}</p>
	</div>
{/if}

<!-- Host toast global: semua notifikasi aplikasi muncul dari sini -->
<ToastHost />
