<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authService } from '#lib/core/auth/auth.service.svelte';
	import { adminService } from '#lib/features/admin/admin.service';
	import { Button, Card, Modal } from '#lib/shared/components';
	import ActionMenu, { type MenuItem } from '#lib/shared/components/ActionMenu.svelte';
	import ConfirmModal from '#lib/shared/components/ConfirmModal.svelte';
	import IconButton from '#lib/shared/components/IconButton.svelte';
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';
	import { formatCurrency } from '#lib/shared/pipes/currency';
	import type { AdminCategory, AdminUser, AdminWallet, WalletTypeInfo } from '#lib/shared/models/domain';

	type Tab = 'users' | 'categories' | 'walletTypes' | 'wallets';

	const tabs: { id: Tab; labelKey: string }[] = [
		{ id: 'users', labelKey: 'admin.tab.users' },
		{ id: 'categories', labelKey: 'admin.tab.categories' },
		{ id: 'walletTypes', labelKey: 'admin.tab.walletTypes' },
		{ id: 'wallets', labelKey: 'admin.tab.wallets' }
	];

	const VALID_TABS: Tab[] = ['users', 'categories', 'walletTypes', 'wallets'];

	const activeTab = $derived<Tab>(
		(VALID_TABS as string[]).includes(page.url.searchParams.get('tab') ?? '') && VALID_TABS.includes(page.url.searchParams.get('tab') as Tab)
			? (page.url.searchParams.get('tab') as Tab)
			: 'users'
	);
	let loading = $state(true);
	let acting = $state(false);
	let error = $state('');
	let notice = $state('');

	// ---- Akun ----
	let users = $state<AdminUser[]>([]);
	let searchQuery = $state('');
	let searchingUser = $state(false);
	let accountModalMode = $state<'add' | 'edit' | null>(null);
	let accountForm = $state<{ id: string; name: string; email: string; password: string; role: 'user' | 'admin' }>(
		{ id: '', name: '', email: '', password: '', role: 'user' }
	);
	let deleteTarget = $state<AdminUser | null>(null);
	let deletingUser = $state(false);
	let blockTarget = $state<AdminUser | null>(null);
	let blockReason = $state('');
	let passwordTarget = $state<AdminUser | null>(null);
	let newPassword = $state('');
	let showPassword = $state(false);

	// ---- Kategori ----
	let categories = $state<AdminCategory[]>([]);
	let categoryModalMode = $state<'add' | 'edit' | null>(null);
	let categoryForm = $state<{ id: string; name: string; type: 'INCOME' | 'EXPENSE'; color: string; parentId: string }>(
		{ id: '', name: '', type: 'EXPENSE', color: '#64748b', parentId: '' }
	);
	let categoryDeleteTarget = $state<AdminCategory | null>(null);
	let categorySearchInput = $state('');
	let searchingCategory = $state(false);

	// ---- Tipe Dompet ----
	let walletTypes = $state<WalletTypeInfo[]>([]);
	let walletModalMode = $state<'add' | 'edit' | null>(null);
	let walletForm = $state<{ code: string; label: string }>({ code: '', label: '' });
	let walletTypeDeleteTarget = $state<WalletTypeInfo | null>(null);
	let walletTypeSearchInput = $state('');
	let searchingWalletType = $state(false);

	// ---- Dompet (tabel wallets) ----
	let adminWallets = $state<AdminWallet[]>([]);
	let dompetModalMode = $state<'add' | 'edit' | null>(null);
	let dompetForm = $state<{
		id: string;
		userId: string;
		name: string;
		type: string;
		currency: string;
		initialBalance: string;
		isIncludedInTotal: boolean;
	}>({ id: '', userId: '', name: '', type: '', currency: 'IDR', initialBalance: '0', isIncludedInTotal: true });
	let dompetDeleteTarget = $state<AdminWallet | null>(null);
	let dompetSearchInput = $state('');
	let searchingDompet = $state(false);

	const systemCategories = $derived(categories.filter((c) => c.ownerId === null));

	function flash(message: string) {
		notice = message;
		error = '';
		setTimeout(() => (notice = ''), 4000);
	}

	function showError(err: unknown) {
		error = err instanceof Error ? err.message || i18n.t('errors.generic') : i18n.t('errors.generic');
	}

	async function loadUsers() {
		users = await adminService.listUsers(searchQuery);
	}

	/**
	 * Pencarian per tab hanya diterapkan setelah tombol Cari ditekan
	 * (kebiasaan halaman Transaksi). Saat mencari, header tabel tetap tampil
	 * dan hanya body yang menjadi skeleton.
	 */
	async function applyUserSearch() {
		if (searchingUser) return;
		searchingUser = true;
		try {
			users = await adminService.listUsers(searchQuery);
		} catch (err) {
			showError(err);
		} finally {
			searchingUser = false;
		}
	}

	async function applyCategorySearch() {
		if (searchingCategory) return;
		searchingCategory = true;
		try {
			categories = await adminService.listCategories(categorySearchInput);
		} catch (err) {
			showError(err);
		} finally {
			searchingCategory = false;
		}
	}

	async function applyWalletTypeSearch() {
		if (searchingWalletType) return;
		searchingWalletType = true;
		try {
			walletTypes = await adminService.listWalletTypes(walletTypeSearchInput);
		} catch (err) {
			showError(err);
		} finally {
			searchingWalletType = false;
		}
	}

	async function applyDompetSearch() {
		if (searchingDompet) return;
		searchingDompet = true;
		try {
			adminWallets = await adminService.listWallets(dompetSearchInput);
		} catch (err) {
			showError(err);
		} finally {
			searchingDompet = false;
		}
	}

	async function loadCategories() {
		categories = await adminService.listCategories();
	}

	async function loadWalletTypes() {
		walletTypes = await adminService.listWalletTypes();
	}

	async function loadAdminWallets() {
		adminWallets = await adminService.listWallets();
	}

	async function loadTab(tab: Tab) {
		try {
			error = '';
			if (tab === 'users') await loadUsers();
			else if (tab === 'categories') await loadCategories();
			else if (tab === 'wallets') await loadAdminWallets();
			else await loadWalletTypes();
		} catch (err) {
			showError(err);
		} finally {
			loading = false;
		}
	}

	// Muat ulang data tiap tab berubah (termasuk saat dibuka dari tree sidebar).
	$effect(() => {
		if (!authService.isAdmin) {
			void goto('/');
			return;
		}
		const tab = activeTab;
		loading = true;
		void loadTab(tab);
	});

	async function withAction(fn: () => Promise<void>, successMessage: string) {
		if (acting) return;
		acting = true;
		error = '';
		try {
			await fn();
			flash(successMessage);
		} catch (err) {
			showError(err);
		} finally {
			acting = false;
		}
	}

	// ---- Akun actions ----
	function openBlockModal(u: AdminUser) {
		blockTarget = u;
		blockReason = '';
	}

	function confirmBlock() {
		if (!blockTarget) return;
		const target = blockTarget;
		blockTarget = null;
		void withAction(async () => {
			await adminService.updateUser(target.id, { isBlocked: true, blockReason });
			await loadUsers();
		}, i18n.t('admin.blockedAccount', { name: target.name }));
	}

	function unblock(u: AdminUser) {
		void withAction(async () => {
			await adminService.updateUser(u.id, { isBlocked: false });
			await loadUsers();
		}, i18n.t('admin.unblockedAccount', { name: u.name }));
	}

	function setRole(u: AdminUser, role: 'user' | 'admin') {
		if (acting) return;
		const action = role === 'admin' ? i18n.t('admin.roleMadeAdmin') : i18n.t('admin.roleRevoked');
		void withAction(async () => {
			await adminService.updateUser(u.id, { role });
			await loadUsers();
		}, i18n.t('admin.roleChanged', { name: u.name, action }));
	}

	function openPasswordModal(u: AdminUser) {
		passwordTarget = u;
		newPassword = '';
		showPassword = false;
	}

	function submitPassword() {
		if (acting || !passwordTarget) return;
		const target = passwordTarget;
		if (
			newPassword.length < 8 ||
			!/[a-zA-Z]/.test(newPassword) ||
			!/[0-9]/.test(newPassword)
		) {
			error = i18n.t('admin.pwRule');
			return;
		}
		passwordTarget = null;
		void withAction(async () => {
			await adminService.changePassword(target.id, newPassword);
			newPassword = '';
		}, i18n.t('admin.passwordChanged', { name: target.name }));
	}

	/** Aksi baris akun: 5 aksi → otomatis menu titik tiga via ActionMenu. */
	function userActions(u: AdminUser): MenuItem[] {
		return [
			u.isBlocked
				? { icon: 'unlock', label: i18n.t('admin.unblock'), onclick: () => unblock(u) }
				: { icon: 'ban', label: i18n.t('admin.block'), danger: true, onclick: () => openBlockModal(u) },
			u.role === 'admin'
				? { icon: 'shield', label: i18n.t('admin.revokeAdmin'), onclick: () => setRole(u, 'user') }
				: { icon: 'shield', label: i18n.t('admin.makeAdmin'), onclick: () => setRole(u, 'admin') },
			{ icon: 'edit', label: i18n.t('common.edit'), onclick: () => openAccountEdit(u) },
			{ icon: 'key', label: i18n.t('admin.changePassword'), onclick: () => openPasswordModal(u) },
			{ icon: 'trash', label: i18n.t('common.delete'), danger: true, disabled: acting, onclick: () => (deleteTarget = u) }
		];
	}

	// ---- Akun: tambah / edit / hapus ----
	function openAccountAdd() {
		accountForm = { id: '', name: '', email: '', password: '', role: 'user' };
		accountModalMode = 'add';
	}

	function openAccountEdit(u: AdminUser) {
		accountForm = { id: u.id, name: u.name, email: u.email, password: '', role: u.role };
		accountModalMode = 'edit';
	}

	function submitAccount() {
		if (acting) return;
		const form = { ...accountForm };
		const mode = accountModalMode;
		if (
			mode === 'add' &&
			(form.password.length < 8 || !/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password))
		) {
			error = i18n.t('admin.pwRule');
			return;
		}
		void withAction(async () => {
			if (mode === 'add') {
				await adminService.createUser({
					name: form.name,
					email: form.email,
					password: form.password,
					role: form.role
				});
			} else {
				await adminService.updateUser(form.id, { name: form.name, email: form.email });
			}
			accountModalMode = null;
			await loadUsers();
		}, mode === 'add' ? i18n.t('admin.createdAccount') : i18n.t('admin.updatedAccount'));
	}

	/** Hapus akun WAJIB lewat konfirmasi (ConfirmModal). */
	function confirmDeleteUser() {
		if (!deleteTarget || deletingUser) return;
		const target = deleteTarget;
		deletingUser = true;
		void withAction(async () => {
			await adminService.deleteUser(target.id);
			deleteTarget = null;
			await loadUsers();
		}, i18n.t('admin.deletedAccount', { name: target.name })).finally(() => (deletingUser = false));
	}

	// ---- Kategori actions ----
	function openCategoryAdd() {
		categoryForm = { id: '', name: '', type: 'EXPENSE', color: '#64748b', parentId: '' };
		categoryModalMode = 'add';
	}

	function openCategoryEdit(c: AdminCategory) {
		categoryForm = { id: c.id, name: c.name, type: c.type, color: c.color ?? '#64748b', parentId: c.parentId ?? '' };
		categoryModalMode = 'edit';
	}

	function submitCategory() {
		if (acting) return;
		const form = { ...categoryForm };
		const mode = categoryModalMode;
		void withAction(async () => {
			if (mode === 'add') {
				await adminService.createCategory({
					name: form.name,
					type: form.type,
					color: form.color,
					parentId: form.parentId || undefined
				});
			} else {
				await adminService.updateCategory(form.id, { name: form.name, color: form.color });
			}
			categoryModalMode = null;
			await loadCategories();
		}, mode === 'add' ? i18n.t('admin.createdCategory') : i18n.t('admin.updatedCategory'));
	}

	function requestDeleteCategory(c: AdminCategory) {
		categoryDeleteTarget = c;
	}

	function confirmDeleteCategory() {
		if (!categoryDeleteTarget || acting) return;
		const target = categoryDeleteTarget;
		categoryDeleteTarget = null;
		void withAction(async () => {
			await adminService.deleteCategory(target.id);
			await loadCategories();
		}, i18n.t('admin.deletedCategory', { name: target.name }));
	}

	// ---- Tipe dompet actions ----
	function openWalletAdd() {
		walletForm = { code: '', label: '' };
		walletModalMode = 'add';
	}

	function openWalletEdit(w: WalletTypeInfo) {
		walletForm = { code: w.code, label: w.label };
		walletModalMode = 'edit';
	}

	function submitWallet() {
		if (acting) return;
		const code = walletForm.code.trim().toUpperCase();
		const label = walletForm.label.trim();
		const mode = walletModalMode;
		void withAction(async () => {
			if (mode === 'add') {
				await adminService.createWalletType(code, label);
			} else {
				await adminService.updateWalletType(code, { label });
			}
			walletModalMode = null;
			await loadWalletTypes();
		}, mode === 'add' ? i18n.t('admin.createdWalletType') : i18n.t('admin.updatedWalletType'));
	}

	function toggleWalletActive(w: WalletTypeInfo) {
		const state = w.isActive ? i18n.t('admin.stateDeactivated') : i18n.t('admin.stateActivated');
		void withAction(async () => {
			await adminService.updateWalletType(w.code, { isActive: !w.isActive });
			await loadWalletTypes();
		}, i18n.t('admin.toggledWalletType', { name: w.label, state }));
	}

	function requestDeleteWalletType(w: WalletTypeInfo) {
		walletTypeDeleteTarget = w;
	}

	function confirmDeleteWalletType() {
		if (!walletTypeDeleteTarget || acting) return;
		const target = walletTypeDeleteTarget;
		walletTypeDeleteTarget = null;
		void withAction(async () => {
			await adminService.deleteWalletType(target.code);
			await loadWalletTypes();
		}, i18n.t('admin.deletedWalletType', { name: target.label }));
	}

	// ---- Dompet (tabel wallets) actions ----
	function openDompetAdd() {
		dompetForm = { id: '', userId: '', name: '', type: '', currency: 'IDR', initialBalance: '0', isIncludedInTotal: true };
		// Referensi pemilik & tipe dompet dibutuhkan di modal.
		if (users.length === 0) void loadUsers();
		if (walletTypes.length === 0) void loadWalletTypes();
		dompetModalMode = 'add';
	}

	function openDompetEdit(w: AdminWallet) {
		dompetForm = {
			id: w.id,
			userId: w.ownerId,
			name: w.name,
			type: w.type,
			currency: w.currency,
			initialBalance: String(w.currentBalance),
			isIncludedInTotal: w.isIncludedInTotal
		};
		if (walletTypes.length === 0) void loadWalletTypes();
		dompetModalMode = 'edit';
	}

	function submitDompet() {
		if (acting) return;
		const form = { ...dompetForm };
		const mode = dompetModalMode;
		const initialBalance = Number(form.initialBalance);
		if (!Number.isFinite(initialBalance) || initialBalance < 0) {
			error = i18n.t('admin.balanceRule');
			return;
		}
		void withAction(async () => {
			if (mode === 'add') {
				await adminService.createWallet({
					userId: form.userId,
					name: form.name,
					type: form.type,
					currency: form.currency,
					initialBalance
				});
			} else {
				await adminService.updateWallet(form.id, {
					name: form.name,
					type: form.type,
					currency: form.currency,
					isIncludedInTotal: form.isIncludedInTotal
				});
			}
			dompetModalMode = null;
			await loadAdminWallets();
		}, mode === 'add' ? i18n.t('admin.createdWallet') : i18n.t('admin.updatedWallet'));
	}

	function requestDeleteAdminWallet(w: AdminWallet) {
		dompetDeleteTarget = w;
	}

	function confirmDeleteAdminWallet() {
		if (!dompetDeleteTarget || acting) return;
		const target = dompetDeleteTarget;
		dompetDeleteTarget = null;
		void withAction(async () => {
			await adminService.deleteWallet(target.id);
			await loadAdminWallets();
		}, i18n.t('admin.deletedWallet', { name: target.name }));
	}
</script>

<svelte:head><title>{i18n.t('admin.title')} — FinanceApp</title></svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
			{i18n.t('admin.title')} — {i18n.t(tabs.find((t) => t.id === activeTab)?.labelKey ?? 'admin.tab.users')}
		</h1>
	</div>

	{#if notice}
		<div class="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</div>
	{/if}
	{#if error}
		<div class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
	{/if}

	{#if activeTab === 'users'}
		<Card>
			<form
				class="mb-4 flex flex-wrap items-end gap-2"
				onsubmit={(e) => {
					e.preventDefault();
					void applyUserSearch();
				}}
			>
				<input
					type="search"
					placeholder={i18n.t('admin.userSearchPlaceholder')}
					bind:value={searchQuery}
					class="min-w-52 flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
				/>
				<IconButton type="submit" size="md" icon="search" label={i18n.t('common.search')} loading={searchingUser} />
				<IconButton size="md" variant="primary" icon="plus" label={i18n.t('admin.addAccount')} onclick={openAccountAdd} />
			</form>
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="text-xs text-slate-500 dark:text-slate-400 dark:text-metadark uppercase">
						<tr>
							<th class="px-2 py-2">{i18n.t('admin.thUser')}</th>
							<th class="px-2 py-2">{i18n.t('admin.thRole')}</th>
							<th class="px-2 py-2">{i18n.t('admin.thData')}</th>
							<th class="px-2 py-2">{i18n.t('admin.thStatus')}</th>
							<th class="px-2 py-2 text-right">{i18n.t('common.actions')}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
						{#if loading || searchingUser}
							<tr><td colspan="5" class="px-2 py-4"><div class="space-y-2">{#each Array(4) as _, index (index)}<div class="h-6 animate-pulse rounded bg-slate-100 dark:bg-boxdark-2" style="width: {100 - index * 12}%"></div>{/each}</div></td></tr>
						{:else}
						{#each users as u (u.id)}
							{@const isSelf = u.id === authService.currentUser?.id}
							<tr>
								<td class="px-2 py-3">
									<p class="font-medium text-slate-900 dark:text-white">{u.name}{isSelf ? ` ${i18n.t('admin.self')}` : ''}</p>
									<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">{u.email}</p>
								</td>
								<td class="px-2 py-3">
									<span
										class="rounded-full px-2 py-0.5 text-xs font-semibold {u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 dark:bg-boxdark-2 text-slate-600 dark:text-slate-300'}"
									>
										{u.role === 'admin' ? i18n.t('admin.roleAdmin') : i18n.t('admin.roleUser')}
									</span>
								</td>
								<td class="px-2 py-3 text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">
									{i18n.t('admin.userStats', { t: u.transactionCount, w: u.walletCount, b: u.budgetCount })}
								</td>
								<td class="px-2 py-3">
									{#if u.isBlocked}
										<span class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">{i18n.t('status.blocked')}</span>
										<p class="mt-1 text-xs text-red-500">{u.blockReason}</p>
									{:else}
										<span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{i18n.t('status.active')}</span>
									{/if}
								</td>
								<td class="px-2 py-3">
									<div class="flex justify-end">
										{#if isSelf}
											<span class="px-2 text-xs text-slate-400 dark:text-metadark">—</span>
										{:else}
											<ActionMenu items={userActions(u)} />
										{/if}
									</div>
								</td>
							</tr>
						{:else}
							<tr><td colspan="5" class="px-2 py-6 text-center text-slate-500 dark:text-slate-400 dark:text-metadark">{i18n.t('admin.noUsers')}</td></tr>
						{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</Card>
	{:else if activeTab === 'categories'}
		<Card>
			<form
				class="mb-4 flex flex-wrap items-end gap-2"
				onsubmit={(e) => {
					e.preventDefault();
					void applyCategorySearch();
				}}
			>
				<input
					type="search"
					placeholder={i18n.t('admin.searchCategory')}
					bind:value={categorySearchInput}
					class="min-w-52 flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
				/>
				<IconButton type="submit" size="md" icon="search" label={i18n.t('common.search')} loading={searchingCategory} />
				<IconButton size="md" variant="primary" icon="plus" label={i18n.t('admin.addCategory')} onclick={openCategoryAdd} />
			</form>
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="text-xs text-slate-500 dark:text-slate-400 dark:text-metadark uppercase">
						<tr>
							<th class="px-2 py-2">{i18n.t('admin.thName')}</th>
							<th class="px-2 py-2">{i18n.t('admin.thType')}</th>
							<th class="px-2 py-2">{i18n.t('admin.thOwner')}</th>
							<th class="px-2 py-2">{i18n.t('admin.thUsed')}</th>
							<th class="px-2 py-2 text-right">{i18n.t('common.actions')}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
						{#if loading || searchingCategory}
							<tr><td colspan="5" class="px-2 py-4"><div class="space-y-2">{#each Array(4) as _, index (index)}<div class="h-6 animate-pulse rounded bg-slate-100 dark:bg-boxdark-2" style="width: {100 - index * 12}%"></div>{/each}</div></td></tr>
						{:else}
						{#each categories as c (c.id)}
							{@const isSystem = c.ownerId === null}
							<tr>
								<td class="flex items-center gap-2 px-2 py-3">
									<span class="h-3 w-3 shrink-0 rounded-full" style="background: {c.color ?? '#94a3b8'}"></span>
									<span class="font-medium text-slate-900 dark:text-white {isSystem ? '' : 'pl-4'}">{c.name}</span>
								</td>
								<td class="px-2 py-3 text-xs text-slate-600 dark:text-slate-300">
									{c.type === 'INCOME' ? i18n.t('type.income') : i18n.t('type.expense')}
								</td>
								<td class="px-2 py-3 text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">
									{isSystem ? i18n.t('admin.systemOwner') : i18n.t('admin.userOwner')}
								</td>
								<td class="px-2 py-3 text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">
									{i18n.t('admin.categoryStats', { t: c.transactionCount, c: c.childCount })}
								</td>
								<td class="px-2 py-3">
									<div class="flex justify-end">
										{#if isSystem}
											<ActionMenu
												items={[
													{ icon: 'edit', label: i18n.t('common.edit'), onclick: () => openCategoryEdit(c) },
													{
														icon: 'trash',
														label: i18n.t('common.delete'),
														danger: true,
														disabled: acting || c.transactionCount > 0 || c.childCount > 0,
														onclick: () => requestDeleteCategory(c)
													}
												]}
											/>
										{:else}
											<span class="px-2 text-xs text-slate-400 dark:text-metadark">—</span>
										{/if}
									</div>
								</td>
							</tr>
						{:else}
							<tr><td colspan="5" class="px-2 py-6 text-center text-slate-500 dark:text-slate-400 dark:text-metadark">{i18n.t('admin.noCategories')}</td></tr>
						{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</Card>
	{:else if activeTab === 'walletTypes'}
		<Card>
			<form
				class="mb-4 flex flex-wrap items-end gap-2"
				onsubmit={(e) => {
					e.preventDefault();
					void applyWalletTypeSearch();
				}}
			>
				<input
					type="search"
					placeholder={i18n.t('admin.searchWalletType')}
					bind:value={walletTypeSearchInput}
					class="min-w-52 flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
				/>
				<IconButton type="submit" size="md" icon="search" label={i18n.t('common.search')} loading={searchingWalletType} />
				<IconButton size="md" variant="primary" icon="plus" label={i18n.t('admin.addWalletType')} onclick={openWalletAdd} />
			</form>
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="text-xs text-slate-500 dark:text-slate-400 dark:text-metadark uppercase">
						<tr>
							<th class="px-2 py-2">{i18n.t('admin.thCode')}</th>
							<th class="px-2 py-2">{i18n.t('admin.thLabel')}</th>
							<th class="px-2 py-2">{i18n.t('admin.thStatus')}</th>
							<th class="px-2 py-2">{i18n.t('admin.thUsed')}</th>
							<th class="px-2 py-2 text-right">{i18n.t('common.actions')}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
						{#if loading || searchingWalletType}
							<tr><td colspan="5" class="px-2 py-4"><div class="space-y-2">{#each Array(4) as _, index (index)}<div class="h-6 animate-pulse rounded bg-slate-100 dark:bg-boxdark-2" style="width: {100 - index * 12}%"></div>{/each}</div></td></tr>
						{:else}
						{#each walletTypes as w (w.code)}
							<tr>
								<td class="px-2 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">{w.code}</td>
								<td class="px-2 py-3 font-medium text-slate-900 dark:text-white">{w.label}</td>
								<td class="px-2 py-3">
									<span class="rounded-full px-2 py-0.5 text-xs font-semibold {w.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600 dark:text-slate-300'}">
										{w.isActive ? i18n.t('status.active') : i18n.t('status.inactive')}
									</span>
								</td>
								<td class="px-2 py-3 text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">
									{i18n.t('admin.walletCount', { w: w.walletCount })}
								</td>
								<td class="px-2 py-3">
									<div class="flex justify-end">
										<ActionMenu
											items={[
												{ icon: 'edit', label: i18n.t('common.edit'), onclick: () => openWalletEdit(w) },
												{
													icon: w.isActive ? 'x' : 'check',
													label: w.isActive ? i18n.t('admin.deactivate') : i18n.t('admin.activate'),
													disabled: acting,
													onclick: () => toggleWalletActive(w)
												},
												{
													icon: 'trash',
													label: i18n.t('common.delete'),
													danger: true,
													disabled: acting || w.walletCount > 0,
													onclick: () => requestDeleteWalletType(w)
												}
											]}
										/>
									</div>
								</td>
							</tr>
						{:else}
							<tr><td colspan="5" class="px-2 py-6 text-center text-slate-500 dark:text-slate-400 dark:text-metadark">{i18n.t('admin.noWalletTypes')}</td></tr>
						{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</Card>
	{:else}
		<Card>
			<form
				class="mb-4 flex flex-wrap items-end gap-2"
				onsubmit={(e) => {
					e.preventDefault();
					void applyDompetSearch();
				}}
			>
				<input
					type="search"
					placeholder={i18n.t('admin.searchWallet')}
					bind:value={dompetSearchInput}
					class="min-w-52 flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
				/>
				<IconButton type="submit" size="md" icon="search" label={i18n.t('common.search')} loading={searchingDompet} />
				<IconButton size="md" variant="primary" icon="plus" label={i18n.t('admin.addWallet')} onclick={openDompetAdd} />
			</form>
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="text-xs text-slate-500 dark:text-slate-400 dark:text-metadark uppercase">
						<tr>
							<th class="px-2 py-2">{i18n.t('admin.thWallet')}</th>
							<th class="px-2 py-2">{i18n.t('admin.thOwner')}</th>
							<th class="px-2 py-2">{i18n.t('admin.thType')}</th>
							<th class="px-2 py-2">{i18n.t('admin.thBalance')}</th>
							<th class="px-2 py-2">{i18n.t('admin.thUsed')}</th>
							<th class="px-2 py-2 text-right">{i18n.t('common.actions')}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
						{#if loading || searchingDompet}
							<tr><td colspan="6" class="px-2 py-4"><div class="space-y-2">{#each Array(4) as _, index (index)}<div class="h-6 animate-pulse rounded bg-slate-100 dark:bg-boxdark-2" style="width: {100 - index * 12}%"></div>{/each}</div></td></tr>
						{:else}
						{#each adminWallets as w (w.id)}
							<tr>
								<td class="px-2 py-3">
									<p class="font-medium text-slate-900 dark:text-white">{w.name}</p>
									<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">{w.currency}</p>
								</td>
								<td class="px-2 py-3">
									<p class="text-slate-700 dark:text-slate-200">{w.ownerName}</p>
									<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">{w.ownerEmail}</p>
								</td>
								<td class="px-2 py-3 text-xs text-slate-600 dark:text-slate-300">{w.typeLabel ?? w.type}</td>
								<td class="px-2 py-3">
									<p class="font-medium text-slate-900 dark:text-white">{formatCurrency(w.currentBalance, w.currency)}</p>
									<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">
										{w.isIncludedInTotal ? i18n.t('admin.inTotal') : i18n.t('admin.notInTotal')}
									</p>
								</td>
								<td class="px-2 py-3 text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">
									{i18n.t('admin.txCount', { t: w.transactionCount })}
								</td>
								<td class="px-2 py-3">
									<div class="flex justify-end">
										<ActionMenu
											items={[
												{ icon: 'edit', label: i18n.t('common.edit'), onclick: () => openDompetEdit(w) },
												{
													icon: 'trash',
													label: i18n.t('common.delete'),
													danger: true,
													disabled: acting || w.transactionCount > 0,
													onclick: () => requestDeleteAdminWallet(w)
												}
											]}
										/>
									</div>
								</td>
							</tr>
						{:else}
							<tr><td colspan="6" class="px-2 py-6 text-center text-slate-500 dark:text-slate-400 dark:text-metadark">{i18n.t('admin.noWallets')}</td></tr>
						{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</Card>
	{/if}
</div>

<!-- Modal blokir akun -->
{#if blockTarget}
	<Modal title={i18n.t('admin.blockTitle', { name: blockTarget.name })} onclose={() => (blockTarget = null)}>
		<form
			class="space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				confirmBlock();
			}}
		>
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.blockReason')}</span>
				<textarea
					rows="3"
					bind:value={blockReason}
					placeholder={i18n.t('admin.blockPlaceholder')}
					class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
				></textarea>
			</label>
			<p class="text-sm text-slate-500 dark:text-slate-400 dark:text-metadark">{i18n.t('admin.blockNote')}</p>
			<div class="flex justify-end gap-2">
				<Button variant="ghost" onclick={() => (blockTarget = null)}>{i18n.t('common.cancel')}</Button>
				<Button type="submit" variant="danger" loading={acting}>{i18n.t('admin.block')}</Button>
			</div>
		</form>
	</Modal>
{/if}

<!-- Modal ganti password -->
{#if passwordTarget}
	<Modal title={i18n.t('admin.passwordTitle', { name: passwordTarget.name })} onclose={() => (passwordTarget = null)}>
		<form
			class="space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				submitPassword();
			}}
		>
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.newPassword')}</span>
				<div class="relative">
					<input
						type={showPassword ? 'text' : 'password'}
						bind:value={newPassword}
						required
						minlength="8"
						autocomplete="new-password"
						placeholder={i18n.t('admin.pwPlaceholderNew')}
						class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 pr-16 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
					/>
					<button
						type="button"
						aria-label={showPassword ? i18n.t('admin.pwHide') : i18n.t('admin.pwShow')}
						title={showPassword ? i18n.t('admin.pwHide') : i18n.t('admin.pwShow')}
						class="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded px-2 py-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
						onclick={() => (showPassword = !showPassword)}
					>
						{#if showPassword}
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
						{:else}
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm5.542 0C19.268 7.943 15.478 5 11 5 6.523 5 2.732 7.943 1.458 12c1.274 4.057 5.065 7 9.542 7 4.477 0 8.27-2.943 9.542-7z" /></svg>
						{/if}
					</button>
				</div>
			</label>
			<p class="text-sm text-slate-500 dark:text-slate-400 dark:text-metadark">{i18n.t('admin.pwNoteNew')}</p>
			<div class="flex justify-end gap-2">
				<Button variant="ghost" onclick={() => (passwordTarget = null)}>{i18n.t('common.cancel')}</Button>
				<Button type="submit" loading={acting}>{i18n.t('admin.savePw')}</Button>
			</div>
		</form>
	</Modal>
{/if}

<!-- Modal kategori -->
{#if categoryModalMode}
	<Modal title={categoryModalMode === 'add' ? i18n.t('admin.addCategoryTitle') : i18n.t('admin.editCategoryTitle')} onclose={() => (categoryModalMode = null)}>
		<form
			class="space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				submitCategory();
			}}
		>
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.categoryName')}</span>
				<input
					type="text"
					required
					minlength="2"
					maxlength="100"
					bind:value={categoryForm.name}
					class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
				/>
			</label>
			{#if categoryModalMode === 'add'}
				<div class="grid grid-cols-2 gap-3">
					<label class="block">
						<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.categoryType')}</span>
						<select
							bind:value={categoryForm.type}
							class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
						>
							<option value="EXPENSE">{i18n.t('type.expense')}</option>
							<option value="INCOME">{i18n.t('type.income')}</option>
						</select>
					</label>
					<label class="block">
						<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.parentCategory')}</span>
						<select
							bind:value={categoryForm.parentId}
							class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
						>
							<option value="">{i18n.t('admin.noParent')}</option>
							{#each systemCategories.filter((p) => !p.parentId && p.type === categoryForm.type) as p (p.id)}
								<option value={p.id}>{p.name}</option>
							{/each}
						</select>
					</label>
				</div>
			{/if}
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.color')}</span>
				<input type="color" bind:value={categoryForm.color} class="h-10 w-20 cursor-pointer rounded border border-slate-300 dark:border-slate-600" />
			</label>
			<div class="flex justify-end gap-2">
				<Button variant="ghost" onclick={() => (categoryModalMode = null)}>{i18n.t('common.cancel')}</Button>
				<Button type="submit" loading={acting}>{i18n.t('common.save')}</Button>
			</div>
		</form>
	</Modal>
{/if}

<!-- Modal tipe dompet -->
{#if walletModalMode}
	<Modal title={walletModalMode === 'add' ? i18n.t('admin.addWalletTypeTitle') : i18n.t('admin.editWalletTypeTitle')} onclose={() => (walletModalMode = null)}>
		<form
			class="space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				submitWallet();
			}}
		>
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
					{i18n.t('admin.walletCode')} {walletModalMode === 'add' ? i18n.t('admin.addWalletCodeHint') : ''}
				</span>
				<input
					type="text"
					required
					bind:value={walletForm.code}
					disabled={walletModalMode === 'edit'}
					class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none disabled:bg-slate-100 dark:bg-boxdark-2"
				/>
			</label>
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.walletTypeLabel')}</span>
				<input
					type="text"
					required
					minlength="2"
					maxlength="50"
					bind:value={walletForm.label}
					class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
				/>
			</label>
			<div class="flex justify-end gap-2">
				<Button variant="ghost" onclick={() => (walletModalMode = null)}>{i18n.t('common.cancel')}</Button>
				<Button type="submit" loading={acting}>{i18n.t('common.save')}</Button>
			</div>
		</form>
	</Modal>
{/if}

<!-- Modal dompet -->
{#if dompetModalMode}
	<Modal title={dompetModalMode === 'add' ? i18n.t('admin.addWalletTitle') : i18n.t('admin.editWalletTitle')} onclose={() => (dompetModalMode = null)}>
		<form
			class="space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				submitDompet();
			}}
		>
			{#if dompetModalMode === 'add'}
				<label class="block">
					<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.thOwner')}</span>
					<select
						bind:value={dompetForm.userId}
						required
						class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
					>
						<option value="" disabled>{i18n.t('admin.selectOwner')}</option>
						{#each users as u (u.id)}
							<option value={u.id}>{u.name} ({u.email})</option>
						{/each}
					</select>
				</label>
			{:else}
				<p class="rounded-lg bg-slate-50 dark:bg-boxdark-2 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">
					{i18n.t('admin.ownerLockedNote')}
				</p>
			{/if}
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.walletName')}</span>
				<input
					type="text"
					required
					minlength="2"
					maxlength="100"
					bind:value={dompetForm.name}
					class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
				/>
			</label>
			<div class="grid grid-cols-2 gap-3">
				<label class="block">
					<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.walletType')}</span>
					<select
						bind:value={dompetForm.type}
						required
						class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
					>
						<option value="" disabled>{i18n.t('admin.selectType')}</option>
						{#each walletTypes.filter((t) => t.isActive) as t (t.code)}
							<option value={t.code}>{t.label}</option>
						{/each}
					</select>
				</label>
				<label class="block">
					<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.currency')}</span>
					<input
						type="text"
						required
						minlength="3"
						maxlength="3"
						bind:value={dompetForm.currency}
						class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
					/>
				</label>
			</div>
			{#if dompetModalMode === 'add'}
				<label class="block">
					<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.initialBalance')}</span>
					<input
						type="number"
						step="0.01"
						min="0"
						bind:value={dompetForm.initialBalance}
						class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
					/>
				</label>
			{/if}
			<label class="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
				<input type="checkbox" bind:checked={dompetForm.isIncludedInTotal} class="h-4 w-4 cursor-pointer rounded border-slate-300 dark:border-slate-600" />
				{i18n.t('admin.includeTotal')}
			</label>
			<div class="flex justify-end gap-2">
				<Button variant="ghost" onclick={() => (dompetModalMode = null)}>{i18n.t('common.cancel')}</Button>
				<Button type="submit" loading={acting}>{i18n.t('common.save')}</Button>
			</div>
		</form>
	</Modal>
{/if}

<!-- Modal tambah/edit akun -->
{#if accountModalMode}
	<Modal title={accountModalMode === 'add' ? i18n.t('admin.addAccountTitle') : i18n.t('admin.editAccountTitle')} onclose={() => (accountModalMode = null)}>
		<form
			class="space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				submitAccount();
			}}
		>
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.accountName')}</span>
				<input
					type="text"
					required
					minlength="2"
					maxlength="150"
					bind:value={accountForm.name}
					class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
				/>
			</label>
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</span>
				<input
					type="email"
					required
					bind:value={accountForm.email}
					class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
				/>
			</label>
			{#if accountModalMode === 'add'}
				<div class="grid grid-cols-2 gap-3">
					<label class="block">
						<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Password</span>
						<input
							type="password"
							required
							minlength="8"
							autocomplete="new-password"
							placeholder={i18n.t('admin.pwPlaceholderNew')}
							bind:value={accountForm.password}
							class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
						/>
					</label>
					<label class="block">
						<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.thRole')}</span>
						<select
							bind:value={accountForm.role}
							class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
						>
							<option value="user">{i18n.t('admin.roleUser')}</option>
							<option value="admin">{i18n.t('admin.roleAdmin')}</option>
						</select>
					</label>
				</div>
			{/if}
			{#if accountModalMode === 'add'}
				<p class="text-sm text-slate-500 dark:text-slate-400 dark:text-metadark">{i18n.t('admin.addWalletPwNote')}</p>
			{:else}
				<p class="text-sm text-slate-500 dark:text-slate-400 dark:text-metadark">{i18n.t('admin.editAccountNote')}</p>
			{/if}
			<div class="flex justify-end gap-2">
				<Button variant="ghost" onclick={() => (accountModalMode = null)}>{i18n.t('common.cancel')}</Button>
				<Button type="submit" loading={acting}>{i18n.t('common.save')}</Button>
			</div>
		</form>
	</Modal>
{/if}

<!-- Konfirmasi hapus akun — WAJIB dikonfirmasi sebelum menghapus. -->
<ConfirmModal
	open={deleteTarget !== null}
	title={i18n.t('confirm.title.deleteAccount', { name: deleteTarget?.name ?? '' })}
	message={i18n.t('confirm.deleteAccount', { name: deleteTarget?.name ?? '', email: deleteTarget?.email ?? '' })}
	warning={i18n.t('confirm.deleteAccountWarn')}
	confirmLabel={i18n.t('common.delete')}
	confirmLoading={deletingUser}
	onconfirm={() => confirmDeleteUser()}
	oncancel={() => (deleteTarget = null)}
/>

<!-- Konfirmasi hapus kategori -->
<ConfirmModal
	open={categoryDeleteTarget !== null}
	title={i18n.t('confirm.title.deleteCategory')}
	message={i18n.t('confirm.deleteCategory', { name: categoryDeleteTarget?.name ?? '' })}
	warning={i18n.t('confirm.deleteCategoryWarn')}
	confirmLabel={i18n.t('common.delete')}
	confirmLoading={acting}
	onconfirm={() => confirmDeleteCategory()}
	oncancel={() => (categoryDeleteTarget = null)}
/>

<!-- Konfirmasi hapus tipe dompet -->
<ConfirmModal
	open={walletTypeDeleteTarget !== null}
	title={i18n.t('confirm.title.deleteWalletType')}
	message={i18n.t('confirm.deleteWalletType', { name: walletTypeDeleteTarget?.label ?? '' })}
	warning={i18n.t('confirm.deleteWalletTypeWarn')}
	confirmLabel={i18n.t('common.delete')}
	confirmLoading={acting}
	onconfirm={() => confirmDeleteWalletType()}
	oncancel={() => (walletTypeDeleteTarget = null)}
/>

<!-- Konfirmasi hapus dompet -->
<ConfirmModal
	open={dompetDeleteTarget !== null}
	title={i18n.t('confirm.title.deleteWallet')}
	message={i18n.t('confirm.deleteWallet', { name: dompetDeleteTarget?.name ?? '' })}
	warning={i18n.t('confirm.deleteWalletWarn')}
	confirmLabel={i18n.t('common.delete')}
	confirmLoading={acting}
	onconfirm={() => confirmDeleteAdminWallet()}
	oncancel={() => (dompetDeleteTarget = null)}
/>
