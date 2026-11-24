<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ActionMenu, { type MenuItem } from '#lib/shared/components/ActionMenu.svelte';
	import AmountInput from '#lib/shared/components/AmountInput.svelte';
	import Button from '#lib/shared/components/Button.svelte';
	import ConfirmModal from '#lib/shared/components/ConfirmModal.svelte';
	import IconButton from '#lib/shared/components/IconButton.svelte';
	import { Modal } from '#lib/shared/components';
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';
	import { formatCurrency } from '#lib/shared/pipes/currency';
	import { toast } from '#lib/shared/toast/toast.store.svelte';
	import {
		settingsService,
		type MyCategory,
		type MyWalletType
	} from '#lib/features/settings/services/settings.service';
	import type { Wallet } from '#lib/shared/models/domain';

	type Tab = 'categories' | 'walletTypes' | 'wallets';

	const tabs: { id: Tab; labelKey: string }[] = [
		{ id: 'categories', labelKey: 'set.tab.categories' },
		{ id: 'walletTypes', labelKey: 'set.tab.walletTypes' },
		{ id: 'wallets', labelKey: 'set.tab.wallets' }
	];
	const VALID_TABS: Tab[] = ['categories', 'walletTypes', 'wallets'];

	const activeTab = $derived<Tab>(
		(VALID_TABS as string[]).includes(page.url.searchParams.get('tab') ?? '')
			? (page.url.searchParams.get('tab') as Tab)
			: 'categories'
	);

	function switchTab(tab: Tab) {
		void goto(`/pengaturan?tab=${tab}`, { reset: false });
	}

	// ---- Data per tab ----
	let categories = $state<MyCategory[]>([]);
	let walletTypes = $state<MyWalletType[]>([]);
	let wallets = $state<Wallet[]>([]);
	/** Gabungan tipe milik pengguna + global — sumber opsi select di modal dompet. */
	let walletTypesCache = $state<MyWalletType[]>([]);
	let loading = $state(true);

	// Pencarian hanya diterapkan setelah tombol Cari ditekan; header tabel tetap tampil.
	let searchInput = $state('');
	let searching = $state(false);
	let query = $state('');

	async function loadTab(tab: Tab, withQuery: string) {
		loading = true;
		try {
			if (tab === 'categories') {
				categories = await settingsService.listCategories(withQuery);
			} else if (tab === 'walletTypes') {
				walletTypes = await settingsService.listWalletTypes(withQuery);
			} else {
				wallets = await settingsService.listWallets();
			}
		} catch (err) {
			toast.error(i18n.displayError(err));
		} finally {
			loading = false;
		}
	}

	/** Muat cache tipe dompet gabungan (untuk select modal dompet); dipakai ulang bila sudah ada. */
	async function ensureTypesCache() {
		if (walletTypesCache.length > 0) return;
		try {
			walletTypesCache = await settingsService.listWalletTypes('');
		} catch {
			// biarkan kosong; pengguna masih bisa edit field lain
		}
	}

	// Muat ulang data tiap tab berubah (termasuk saat dibuka dari tree sidebar).
	let loadedTab = $state<Tab | null>(null);
	$effect(() => {
		if (loadedTab !== activeTab) {
			loadedTab = activeTab;
			query = '';
			searchInput = '';
			void loadTab(activeTab, '');
			if (activeTab === 'wallets') void ensureTypesCache();
		}
	});

	async function applySearch() {
		if (searching) return;
		searching = true;
		try {
			query = searchInput.trim();
			await loadTab(activeTab, query);
		} finally {
			searching = false;
		}
	}

	// ---- Modal create/edit ----
	let formOpen = $state(false);
	let editId = $state('');
	let saving = $state(false);

	// Form kategori
	let catName = $state('');
	let catType = $state<'INCOME' | 'EXPENSE'>('EXPENSE');
	let catParent = $state('');

	// Form tipe dompet
	let wtLabel = $state('');
	let wtCode = $state('');

	// Form dompet
	let wName = $state('');
	let wTypeCode = $state('');
	let wInitial = $state(0);
	let wInclude = $state(true);

	function resetForm() {
		catName = '';
		catType = 'EXPENSE';
		catParent = '';
		wtLabel = '';
		wtCode = '';
		wName = '';
		wTypeCode = '';
		wInitial = 0;
		wInclude = true;
		editId = '';
	}

	function openCreate() {
		resetForm();
		formOpen = true;
	}

	// svelte-ignore state_referenced_locally
	function openEditCategory(row: MyCategory) {
		resetForm();
		editId = row.id;
		catName = row.name;
		catType = row.type;
		catParent = row.parentId ?? '';
		formOpen = true;
	}

	// svelte-ignore state_referenced_locally
	function openEditWalletType(row: MyWalletType) {
		resetForm();
		editId = row.id;
		wtLabel = row.label;
		wtCode = row.code;
		formOpen = true;
	}

	// svelte-ignore state_referenced_locally
	function openEditWallet(row: Wallet) {
		resetForm();
		editId = row.id;
		wName = row.name;
		wTypeCode = row.typeCode ?? '';
		wInclude = row.isIncludedInTotal ?? true;
		formOpen = true;
	}

	const typeOptions = $derived(
		walletTypesCache.filter((t) => t.isActive).map((t) => ({ value: t.code, label: t.label }))
	);

	const parentOptions = $derived([
		{ value: '', label: i18n.t('admin.noParent') },
		...categories
			.filter((c) => c.id !== editId)
			.map((c) => ({ value: c.id, label: c.name }))
	]);

	async function handleSave() {
		if (saving) return;
		saving = true;
		try {
			if (activeTab === 'categories') {
				if (editId) {
					await settingsService.updateCategory(editId, { name: catName, type: catType });
					toast.success(i18n.t('admin.updatedCategory'));
				} else {
					await settingsService.createCategory({
						name: catName,
						type: catType,
						parentId: catParent || undefined
					});
					toast.success(i18n.t('admin.createdCategory'));
				}
				await loadTab('categories', query);
			} else if (activeTab === 'walletTypes') {
				if (editId) {
					await settingsService.updateWalletType(editId, {
						label: wtLabel,
						code: wtCode || undefined
					});
					toast.success(i18n.t('admin.updatedWalletType'));
				} else {
					await settingsService.createWalletType({
						label: wtLabel,
						code: wtCode || undefined
					});
					toast.success(i18n.t('admin.createdWalletType'));
				}
				await loadTab('walletTypes', query);
			} else {
				if (editId) {
					await settingsService.updateWallet(editId, {
						name: wName,
						type: wTypeCode,
						isIncludedInTotal: wInclude
					});
					toast.success(i18n.t('admin.updatedWallet'));
				} else {
					await settingsService.createWallet({
						name: wName,
						type: wTypeCode,
						initialBalance: wInitial,
						isIncludedInTotal: wInclude
					});
					toast.success(i18n.t('admin.createdWallet'));
				}
				await loadTab('wallets', '');
			}
			formOpen = false;
			editId = '';
		} catch (err) {
			// Modal tetap terbuka: input tidak kosong sebelum proses berhasil.
			toast.error(i18n.displayError(err));
		} finally {
			saving = false;
		}
	}

	// ---- Toggle aktif/nonaktif tipe dompet milik pengguna ----
	let togglingId = $state('');
	async function toggleWalletType(row: MyWalletType) {
		if (togglingId) return;
		togglingId = row.id;
		try {
			await settingsService.updateWalletType(row.id, { isActive: !row.isActive });
			toast.success(
				i18n.t('admin.toggledWalletType', {
					name: row.label,
					state: i18n.t(row.isActive ? 'admin.stateDeactivated' : 'admin.stateActivated')
				})
			);
			await loadTab('walletTypes', query);
		} catch (err) {
			toast.error(i18n.displayError(err));
		} finally {
			togglingId = '';
		}
	}

	// ---- Hapus (WAJIB lewat konfirmasi) ----
	let deleteTarget = $state<{ kind: Tab; id: string; name: string } | null>(null);
	let deleting = $state(false);

	function confirmTitle(): string {
		if (!deleteTarget) return '';
		if (deleteTarget.kind === 'categories') return i18n.t('confirm.title.deleteCategory');
		if (deleteTarget.kind === 'walletTypes') return i18n.t('confirm.title.deleteWalletType');
		return i18n.t('confirm.title.deleteWallet');
	}
	function confirmMessage(): string {
		if (!deleteTarget) return '';
		if (deleteTarget.kind === 'categories') {
			return i18n.t('confirm.deleteCategory', { name: deleteTarget.name });
		}
		if (deleteTarget.kind === 'walletTypes') {
			return i18n.t('confirm.deleteWalletType', { name: deleteTarget.name });
		}
		return i18n.t('confirm.deleteWallet', { name: deleteTarget.name });
	}
	function confirmWarning(): string {
		if (!deleteTarget) return '';
		if (deleteTarget.kind === 'categories') return i18n.t('confirm.deleteCategoryWarn');
		if (deleteTarget.kind === 'walletTypes') return i18n.t('confirm.deleteWalletTypeWarn');
		return i18n.t('confirm.deleteWalletWarn');
	}

	async function handleDelete() {
		if (!deleteTarget || deleting) return;
		deleting = true;
		try {
			if (deleteTarget.kind === 'categories') {
				await settingsService.deleteCategory(deleteTarget.id);
				await loadTab('categories', query);
			} else if (deleteTarget.kind === 'walletTypes') {
				await settingsService.deleteWalletType(deleteTarget.id);
				await loadTab('walletTypes', query);
			} else {
				await settingsService.deleteWallet(deleteTarget.id);
				await loadTab('wallets', '');
			}
			toast.success(i18n.t('set.deletedToast', { name: deleteTarget.name }));
			deleteTarget = null;
		} catch (err) {
			toast.error(i18n.displayError(err));
		} finally {
			deleting = false;
		}
	}

	// ---- Turunan tampilan ----
	const categoryFiltered = $derived(
		query
			? categories.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
			: categories
	);
	const walletTypeFiltered = $derived(
		query
			? walletTypes.filter(
					(t) =>
						t.code.toLowerCase().includes(query.toLowerCase()) ||
						t.label.toLowerCase().includes(query.toLowerCase())
				)
			: walletTypes
	);

	function formTitle(): string {
		const addKey =
			activeTab === 'categories'
				? 'admin.addCategoryTitle'
				: activeTab === 'walletTypes'
					? 'admin.addWalletTypeTitle'
					: 'admin.addWalletTitle';
		const editKey =
			activeTab === 'categories'
				? 'set.editCategoryTitle'
				: activeTab === 'walletTypes'
					? 'set.editWalletTypeTitle'
					: 'set.editWalletTitle';
		return i18n.t(editId ? editKey : addKey);
	}

	function typeLabel(type: string): string {
		return type === 'INCOME' ? i18n.t('type.income') : i18n.t('type.expense');
	}

	function menuItems(row: MyCategory | MyWalletType | Wallet, kind: Tab): MenuItem[] {
		const name =
			kind === 'categories'
				? (row as MyCategory).name
				: kind === 'walletTypes'
					? (row as MyWalletType).label
					: (row as Wallet).name;
		const items: MenuItem[] = [
			{
				icon: 'edit',
				label: i18n.t('common.edit'),
				onclick: () => {
					if (kind === 'categories') openEditCategory(row as MyCategory);
					else if (kind === 'walletTypes') openEditWalletType(row as MyWalletType);
					else openEditWallet(row as Wallet);
				}
			}
		];
		if (kind === 'walletTypes') {
			const wt = row as MyWalletType;
			items.push({
				icon: wt.isActive ? 'eyeOff' : 'check',
				label: i18n.t(wt.isActive ? 'admin.deactivate' : 'admin.activate'),
				disabled: togglingId === wt.id,
				onclick: () => void toggleWalletType(wt)
			});
		}
		items.push({
			icon: 'trash',
			label: i18n.t('common.delete'),
			danger: true,
			onclick: () => (deleteTarget = { kind, id: row.id, name })
		});
		return items;
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
			{i18n.t('set.title')}
		</h1>
		<IconButton
			icon="plus"
			size="md"
			variant="primary"
			label={i18n.t('common.add')}
			onclick={openCreate}
		/>
	</div>

	<!-- Tab pill (senada pola halaman admin) -->
	<div class="flex flex-wrap gap-2">
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				class="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors {activeTab === tab.id
					? 'bg-indigo-600 text-white'
					: 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-boxdark-2 dark:text-metadark dark:ring-slate-700 dark:hover:text-white'}"
				onclick={() => switchTab(tab.id)}
			>
				{i18n.t(tab.labelKey)}
			</button>
		{/each}
	</div>

	<!-- Pencarian: filter diterapkan hanya setelah tombol Cari ditekan. -->
	<form
		class="flex flex-wrap items-end gap-2"
		onsubmit={(e) => {
			e.preventDefault();
			void applySearch();
		}}
	>
		<div class="min-w-48 flex-1">
			<input
				type="search"
				placeholder={i18n.t('set.searchPlaceholder')}
				bind:value={searchInput}
				class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-boxdark-2 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
			/>
		</div>
		<IconButton
			type="submit"
			size="md"
			icon="search"
			label={i18n.t('common.search')}
			loading={searching}
		/>
	</form>

	<!-- Kategori -->
	{#if activeTab === 'categories'}
		<div class="rounded-xl bg-white px-5 py-2 shadow-sm ring-1 ring-slate-200 dark:bg-boxdark-2 dark:ring-slate-700">
			<table class="w-full text-left text-sm">
				<thead>
					<tr class="border-b border-slate-200 dark:border-slate-700/60">
						<th class="py-3 pr-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">{i18n.t('admin.thName')}</th>
						<th class="py-3 pr-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">{i18n.t('admin.thType')}</th>
						<th class="py-3 pr-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">{i18n.t('admin.thUsed')}</th>
						<th class="py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">{i18n.t('tx.thActions')}</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-700/40">
					{#if loading}
						{#each Array(3) as _, index (index)}
							<tr><td colspan="4" class="py-3"><div class="h-6 animate-pulse rounded bg-slate-100 dark:bg-boxdark" style="width: {100 - index * 15}%"></div></td></tr>
						{/each}
					{:else if categoryFiltered.length === 0}
						<tr><td colspan="4" class="py-8 text-center text-slate-400 dark:text-metadark">{i18n.t('set.noCategories')}</td></tr>
					{:else}
						{#each categoryFiltered as row (row.id)}
							<tr class="transition-colors hover:bg-slate-50 dark:hover:bg-boxdark">
								<td class="py-3 pr-2 font-medium text-slate-800 dark:text-slate-100">{row.name}</td>
								<td class="py-3 pr-2 text-slate-600 dark:text-slate-300">{typeLabel(row.type)}</td>
								<td class="py-3 pr-2 text-slate-600 dark:text-slate-300">
									{i18n.t('admin.txCount', { t: row.transactionCount })}
									{#if row.childCount > 0}
										· {i18n.t('admin.childCount', { c: row.childCount })}
									{/if}
								</td>
								<td class="py-2">
									<div class="flex justify-end">
										<ActionMenu items={menuItems(row, 'categories')} />
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	{:else if activeTab === 'walletTypes'}
		<div class="rounded-xl bg-white px-5 py-2 shadow-sm ring-1 ring-slate-200 dark:bg-boxdark-2 dark:ring-slate-700">
			<table class="w-full text-left text-sm">
				<thead>
					<tr class="border-b border-slate-200 dark:border-slate-700/60">
						<th class="py-3 pr-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">{i18n.t('admin.thCode')}</th>
						<th class="py-3 pr-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">{i18n.t('admin.thLabel')}</th>
						<th class="py-3 pr-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">{i18n.t('admin.thUsed')}</th>
						<th class="py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">{i18n.t('tx.thActions')}</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-700/40">
					{#if loading}
						{#each Array(3) as _, index (index)}
							<tr><td colspan="4" class="py-3"><div class="h-6 animate-pulse rounded bg-slate-100 dark:bg-boxdark" style="width: {100 - index * 15}%"></div></td></tr>
						{/each}
					{:else if walletTypeFiltered.length === 0}
						<tr><td colspan="4" class="py-8 text-center text-slate-400 dark:text-metadark">{i18n.t('set.noWalletTypes')}</td></tr>
					{:else}
						{#each walletTypeFiltered as row (row.id)}
							<tr class="transition-colors hover:bg-slate-50 dark:hover:bg-boxdark">
								<td class="py-3 pr-2 font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">{row.code}</td>
								<td class="py-3 pr-2 text-slate-600 dark:text-slate-300">
									{row.label}
									{#if row.isGlobal}
										<span class="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-boxdark dark:text-metadark">
											{i18n.t('set.globalBadge')}
										</span>
									{/if}
								</td>
								<td class="py-3 pr-2 text-slate-600 dark:text-slate-300">
									{i18n.t('admin.walletCount', { w: row.walletCount })}
								</td>
								<td class="py-2">
									<div class="flex justify-end">
										{#if !row.isGlobal}
											<ActionMenu items={menuItems(row, 'walletTypes')} />
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="rounded-xl bg-white px-5 py-2 shadow-sm ring-1 ring-slate-200 dark:bg-boxdark-2 dark:ring-slate-700">
			<table class="w-full text-left text-sm">
				<thead>
					<tr class="border-b border-slate-200 dark:border-slate-700/60">
						<th class="py-3 pr-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">{i18n.t('admin.thName')}</th>
						<th class="py-3 pr-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">{i18n.t('admin.thType')}</th>
						<th class="py-3 pr-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">{i18n.t('admin.thBalance')}</th>
						<th class="py-3 pr-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">{i18n.t('admin.thTotalStatus')}</th>
						<th class="py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-metadark">{i18n.t('tx.thActions')}</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-700/40">
					{#if loading}
						{#each Array(3) as _, index (index)}
							<tr><td colspan="5" class="py-3"><div class="h-6 animate-pulse rounded bg-slate-100 dark:bg-boxdark" style="width: {100 - index * 15}%"></div></td></tr>
						{/each}
					{:else if wallets.length === 0}
						<tr><td colspan="5" class="py-8 text-center text-slate-400 dark:text-metadark">{i18n.t('set.noWallets')}</td></tr>
					{:else}
						{#each wallets as row (row.id)}
							<tr class="transition-colors hover:bg-slate-50 dark:hover:bg-boxdark">
								<td class="py-3 pr-2 font-medium text-slate-800 dark:text-slate-100">{row.name}</td>
								<td class="py-3 pr-2 text-slate-600 dark:text-slate-300">{row.typeLabel ?? ''}</td>
								<td class="py-3 pr-2 text-right text-slate-600 dark:text-slate-300">{formatCurrency(row.currentBalance, row.currency)}</td>
								<td class="py-3 pr-2 text-slate-600 dark:text-slate-300">
									{row.isIncludedInTotal ? i18n.t('admin.inTotal') : i18n.t('admin.notInTotal')}
								</td>
								<td class="py-2">
									<div class="flex justify-end">
										<ActionMenu items={menuItems(row, 'wallets')} />
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Modal tambah/edit (satu modal, field menyesuaikan tab aktif) -->
{#if formOpen}
	<Modal title={formTitle()} onclose={() => (formOpen = false)}>
		<form
			class="space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				void handleSave();
			}}
		>
			{#if activeTab === 'categories'}
				<label class="block">
					<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.categoryName')}</span>
					<input
						type="text"
						required
						minlength="2"
						maxlength="100"
						bind:value={catName}
						class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
					/>
				</label>
				<label class="block">
					<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.categoryType')}</span>
					<select
						bind:value={catType}
						class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white dark:bg-boxdark-2"
					>
						<option value="EXPENSE">{i18n.t('type.expense')}</option>
						<option value="INCOME">{i18n.t('type.income')}</option>
					</select>
				</label>
				<label class="block">
					<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.parentCategory')} ({i18n.t('common.optional')})</span>
					<select
						bind:value={catParent}
						disabled={editId !== ''}
						class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white dark:bg-boxdark-2"
					>
						{#each parentOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</label>
			{:else if activeTab === 'walletTypes'}
				<label class="block">
					<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.walletTypeLabel')}</span>
					<input
						type="text"
						required
						minlength="2"
						maxlength="50"
						bind:value={wtLabel}
						class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
					/>
				</label>
				<label class="block">
					<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.walletCode')} ({i18n.t('common.optional')})</span>
					<input
						type="text"
						maxlength="20"
						placeholder="MIS. INVESTASI"
						bind:value={wtCode}
						class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
					/>
				</label>
			{:else}
				<label class="block">
					<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.walletName')}</span>
					<input
						type="text"
						required
						minlength="2"
						maxlength="100"
						bind:value={wName}
						class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
					/>
				</label>
				<label class="block">
					<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('admin.walletType')}</span>
					<select
						bind:value={wTypeCode}
						required
						class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white dark:bg-boxdark-2"
					>
						<option value="" disabled>{i18n.t('admin.selectType')}</option>
						{#each typeOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</label>
				{#if !editId}
					<AmountInput label={i18n.t('admin.initialBalance')} bind:value={wInitial} id="set-w-initial" />
				{/if}
				<label class="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
					<input type="checkbox" bind:checked={wInclude} class="h-4 w-4 cursor-pointer rounded border-slate-300 dark:border-slate-600" />
					{i18n.t('admin.includeTotal')}
				</label>
			{/if}

			<div class="flex justify-end gap-2 pt-2">
				<Button variant="ghost" onclick={() => (formOpen = false)}>{i18n.t('common.cancel')}</Button>
				<Button type="submit" loading={saving}>{i18n.t('common.save')}</Button>
			</div>
		</form>
	</Modal>
{/if}

<!-- Modal konfirmasi hapus — WAJIB dikonfirmasi sebelum menghapus. -->
<ConfirmModal
	open={deleteTarget !== null}
	title={confirmTitle()}
	message={confirmMessage()}
	warning={confirmWarning()}
	confirmLabel={i18n.t('common.delete')}
	confirmLoading={deleting}
	onconfirm={() => void handleDelete()}
	oncancel={() => (deleteTarget = null)}
/>
