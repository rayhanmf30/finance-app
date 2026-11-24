<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authService } from '#lib/core/auth/auth.service.svelte';
	import { adminService } from '#lib/features/admin/admin.service';
	import { Button, Card, Modal } from '#lib/shared/components';
	import { formatCurrency } from '#lib/shared/pipes/currency';
	import type { AdminCategory, AdminUser, AdminWallet, WalletTypeInfo } from '#lib/shared/models/domain';

	type Tab = 'users' | 'categories' | 'walletTypes' | 'wallets';

	const tabs: { id: Tab; label: string }[] = [
		{ id: 'users', label: 'Akun' },
		{ id: 'categories', label: 'Kategori' },
		{ id: 'walletTypes', label: 'Tipe Dompet' },
		{ id: 'wallets', label: 'Dompet' }
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

	// ---- Tipe Dompet ----
	let walletTypes = $state<WalletTypeInfo[]>([]);
	let walletModalMode = $state<'add' | 'edit' | null>(null);
	let walletForm = $state<{ code: string; label: string }>({ code: '', label: '' });

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

	const systemCategories = $derived(categories.filter((c) => c.ownerId === null));

	function flash(message: string) {
		notice = message;
		error = '';
		setTimeout(() => (notice = ''), 4000);
	}

	function showError(err: unknown) {
		error = err instanceof Error ? err.message : 'Terjadi kesalahan.';
	}

	async function loadUsers() {
		users = await adminService.listUsers(searchQuery);
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
		}, `Akun ${target.name} berhasil diblokir.`);
	}

	function unblock(u: AdminUser) {
		void withAction(async () => {
			await adminService.updateUser(u.id, { isBlocked: false });
			await loadUsers();
		}, `Blokir ${u.name} dibuka.`);
	}

	function setRole(u: AdminUser, role: 'user' | 'admin') {
		if (acting) return;
		const verb = role === 'admin' ? 'dijadikan admin' : 'dicabut akses adminnya';
		void withAction(async () => {
			await adminService.updateUser(u.id, { role });
			await loadUsers();
		}, `${u.name} ${verb}.`);
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
			error = 'Password minimal 8 karakter dan mengandung huruf serta angka.';
			return;
		}
		passwordTarget = null;
		void withAction(async () => {
			await adminService.changePassword(target.id, newPassword);
			newPassword = '';
		}, `Password akun ${target.name} berhasil diganti.`);
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
		}, mode === 'add' ? 'Kategori berhasil ditambahkan.' : 'Kategori berhasil diperbarui.');
	}

	function deleteCategory(c: AdminCategory) {
		if (acting) return;
		void withAction(async () => {
			await adminService.deleteCategory(c.id);
			await loadCategories();
		}, `Kategori "${c.name}" berhasil dihapus.`);
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
		}, mode === 'add' ? 'Tipe dompet berhasil ditambahkan.' : 'Tipe dompet berhasil diperbarui.');
	}

	function toggleWalletActive(w: WalletTypeInfo) {
		void withAction(async () => {
			await adminService.updateWalletType(w.code, { isActive: !w.isActive });
			await loadWalletTypes();
		}, `Tipe dompet "${w.label}" ${w.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`);
	}

	function deleteWalletType(w: WalletTypeInfo) {
		if (acting) return;
		void withAction(async () => {
			await adminService.deleteWalletType(w.code);
			await loadWalletTypes();
		}, `Tipe dompet "${w.label}" berhasil dihapus.`);
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
			error = 'Saldo awal wajib angka >= 0.';
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
		}, mode === 'add' ? 'Dompet berhasil ditambahkan.' : 'Dompet berhasil diperbarui.');
	}

	function deleteAdminWallet(w: AdminWallet) {
		if (acting) return;
		void withAction(async () => {
			await adminService.deleteWallet(w.id);
			await loadAdminWallets();
		}, `Dompet "${w.name}" berhasil dihapus.`);
	}
</script>

<svelte:head><title>Admin — FinanceApp</title></svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
			Panel Admin — {tabs.find((t) => t.id === activeTab)?.label ?? 'Akun'}
		</h1>
	</div>

	{#if notice}
		<div class="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</div>
	{/if}
	{#if error}
		<div class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
	{/if}

	{#if loading}
		<p class="text-sm text-slate-500 dark:text-slate-400 dark:text-metadark">Memuat…</p>
	{:else if activeTab === 'users'}
		<Card>
			<form
				class="mb-4 flex flex-wrap gap-2"
				onsubmit={(e) => {
					e.preventDefault();
					void loadUsers();
				}}
			>
				<input
					type="search"
					placeholder="Cari nama atau email…"
					bind:value={searchQuery}
					class="min-w-52 flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
				/>
				<Button type="submit" variant="secondary">Cari</Button>
			</form>
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="text-xs text-slate-500 dark:text-slate-400 dark:text-metadark uppercase">
						<tr>
							<th class="px-2 py-2">Pengguna</th>
							<th class="px-2 py-2">Role</th>
							<th class="px-2 py-2">Data</th>
							<th class="px-2 py-2">Status</th>
							<th class="px-2 py-2 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
						{#each users as u (u.id)}
							{@const isSelf = u.id === authService.currentUser?.id}
							<tr>
								<td class="px-2 py-3">
									<p class="font-medium text-slate-900 dark:text-white">{u.name}{isSelf ? ' (Anda)' : ''}</p>
									<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">{u.email}</p>
								</td>
								<td class="px-2 py-3">
									<span
										class="rounded-full px-2 py-0.5 text-xs font-semibold {u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 dark:bg-boxdark-2 text-slate-600 dark:text-slate-300'}"
									>
										{u.role === 'admin' ? 'Admin' : 'User'}
									</span>
								</td>
								<td class="px-2 py-3 text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">
									{u.transactionCount} transaksi · {u.walletCount} dompet · {u.budgetCount} budget
								</td>
								<td class="px-2 py-3">
									{#if u.isBlocked}
										<span class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Diblokir</span>
										<p class="mt-1 text-xs text-red-500">{u.blockReason}</p>
									{:else}
										<span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Aktif</span>
									{/if}
								</td>
								<td class="px-2 py-3">
									<div class="flex flex-wrap justify-end gap-1">
										{#if isSelf}
											<span class="px-2 text-xs text-slate-400 dark:text-metadark">—</span>
										{:else if u.isBlocked}
											<Button variant="secondary" onclick={() => unblock(u)}>Buka Blokir</Button>
										{:else}
											<Button variant="danger" onclick={() => openBlockModal(u)}>Blokir</Button>
										{/if}
										{#if !isSelf && u.role === 'admin'}
											<Button variant="ghost" onclick={() => setRole(u, 'user')}>Cabut Admin</Button>
										{:else if !isSelf}
											<Button variant="ghost" onclick={() => setRole(u, 'admin')}>Jadikan Admin</Button>
										{/if}
									</div>
								</td>
							</tr>
						{:else}
							<tr><td colspan="5" class="px-2 py-6 text-center text-slate-500 dark:text-slate-400 dark:text-metadark">Tidak ada pengguna.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card>
	{:else if activeTab === 'categories'}
		<Card>
			<div class="mb-4 flex justify-end">
				<Button onclick={openCategoryAdd}>+ Tambah Kategori</Button>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="text-xs text-slate-500 dark:text-slate-400 dark:text-metadark uppercase">
						<tr>
							<th class="px-2 py-2">Nama</th>
							<th class="px-2 py-2">Tipe</th>
							<th class="px-2 py-2">Pemilik</th>
							<th class="px-2 py-2">Dipakai</th>
							<th class="px-2 py-2 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
						{#each categories as c (c.id)}
							{@const isSystem = c.ownerId === null}
							<tr>
								<td class="flex items-center gap-2 px-2 py-3">
									<span class="h-3 w-3 shrink-0 rounded-full" style="background: {c.color ?? '#94a3b8'}"></span>
									<span class="font-medium text-slate-900 dark:text-white {isSystem ? '' : 'pl-4'}">{c.name}</span>
								</td>
								<td class="px-2 py-3 text-xs text-slate-600 dark:text-slate-300">{c.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}</td>
								<td class="px-2 py-3 text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">{isSystem ? 'Sistem (seditable)' : 'Pengguna (read-only)'}</td>
								<td class="px-2 py-3 text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">
									{c.transactionCount} transaksi · {c.childCount} sub-kategori
								</td>
								<td class="px-2 py-3">
									<div class="flex flex-wrap justify-end gap-1">
										{#if isSystem}
											<Button variant="secondary" onclick={() => openCategoryEdit(c)}>Edit</Button>
											<Button
												variant="danger"
												disabled={acting || c.transactionCount > 0 || c.childCount > 0}
												onclick={() => deleteCategory(c)}
											>
												Hapus
											</Button>
										{:else}
											<span class="px-2 text-xs text-slate-400 dark:text-metadark">—</span>
										{/if}
									</div>
								</td>
							</tr>
						{:else}
							<tr><td colspan="5" class="px-2 py-6 text-center text-slate-500 dark:text-slate-400 dark:text-metadark">Belum ada kategori.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card>
	{:else if activeTab === 'walletTypes'}
		<Card>
			<div class="mb-4 flex justify-end">
				<Button onclick={openWalletAdd}>+ Tambah Tipe Dompet</Button>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="text-xs text-slate-500 dark:text-slate-400 dark:text-metadark uppercase">
						<tr>
							<th class="px-2 py-2">Kode</th>
							<th class="px-2 py-2">Label</th>
							<th class="px-2 py-2">Status</th>
							<th class="px-2 py-2">Dipakai</th>
							<th class="px-2 py-2 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
						{#each walletTypes as w (w.code)}
							<tr>
								<td class="px-2 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">{w.code}</td>
								<td class="px-2 py-3 font-medium text-slate-900 dark:text-white">{w.label}</td>
								<td class="px-2 py-3">
									<span class="rounded-full px-2 py-0.5 text-xs font-semibold {w.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600 dark:text-slate-300'}">
										{w.isActive ? 'Aktif' : 'Nonaktif'}
									</span>
								</td>
								<td class="px-2 py-3 text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">{w.walletCount} dompet</td>
								<td class="px-2 py-3">
									<div class="flex flex-wrap justify-end gap-1">
										<Button variant="secondary" onclick={() => openWalletEdit(w)}>Edit</Button>
										<Button variant="ghost" onclick={() => toggleWalletActive(w)}>
											{w.isActive ? 'Nonaktifkan' : 'Aktifkan'}
										</Button>
										<Button variant="danger" disabled={acting || w.walletCount > 0} onclick={() => deleteWalletType(w)}>
											Hapus
										</Button>
									</div>
								</td>
							</tr>
						{:else}
							<tr><td colspan="5" class="px-2 py-6 text-center text-slate-500 dark:text-slate-400 dark:text-metadark">Belum ada tipe dompet.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card>
	{:else}
		<Card>
			<div class="mb-4 flex justify-end">
				<Button onclick={openDompetAdd}>+ Tambah Dompet</Button>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="text-xs text-slate-500 dark:text-slate-400 dark:text-metadark uppercase">
						<tr>
							<th class="px-2 py-2">Dompet</th>
							<th class="px-2 py-2">Pemilik</th>
							<th class="px-2 py-2">Tipe</th>
							<th class="px-2 py-2">Saldo</th>
							<th class="px-2 py-2">Dipakai</th>
							<th class="px-2 py-2 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
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
									<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">{w.isIncludedInTotal ? 'Dihitung di total' : 'Tidak dihitung'}</p>
								</td>
								<td class="px-2 py-3 text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">{w.transactionCount} transaksi</td>
								<td class="px-2 py-3">
									<div class="flex flex-wrap justify-end gap-1">
										<Button variant="secondary" onclick={() => openDompetEdit(w)}>Edit</Button>
										<Button variant="danger" disabled={acting || w.transactionCount > 0} onclick={() => deleteAdminWallet(w)}>
											Hapus
										</Button>
									</div>
								</td>
							</tr>
						{:else}
							<tr><td colspan="6" class="px-2 py-6 text-center text-slate-500 dark:text-slate-400 dark:text-metadark">Belum ada dompet.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card>
	{/if}
</div>

<!-- Modal blokir akun -->
{#if blockTarget}
	<Modal title="Blokir akun {blockTarget.name}" onclose={() => (blockTarget = null)}>
		<form
			class="space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				confirmBlock();
			}}
		>
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Alasan pemblokiran (opsional)</span>
				<textarea
					rows="3"
					bind:value={blockReason}
					placeholder="Contoh: tindakan mencurigakan"
					class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
				></textarea>
			</label>
			<p class="text-sm text-slate-500 dark:text-slate-400 dark:text-metadark">Pengguna yang diblokir tidak bisa login atau memakai API sampai blokir dibuka.</p>
			<div class="flex justify-end gap-2">
				<Button variant="ghost" onclick={() => (blockTarget = null)}>Batal</Button>
				<Button type="submit" variant="danger" disabled={acting}>Blokir</Button>
			</div>
		</form>
	</Modal>
{/if}

<!-- Modal ganti password -->
{#if passwordTarget}
	<Modal title="Ganti password akun {passwordTarget.name}" onclose={() => (passwordTarget = null)}>
		<form
			class="space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				submitPassword();
			}}
		>
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Password baru</span>
				<div class="relative">
					<input
						type={showPassword ? 'text' : 'password'}
						bind:value={newPassword}
						required
						minlength="8"
						autocomplete="new-password"
						placeholder="Min. 8 karakter, huruf + angka"
						class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 pr-16 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
					/>
					<button
						type="button"
						class="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
						onclick={() => (showPassword = !showPassword)}
					>
						{showPassword ? 'Sembunyi' : 'Lihat'}
					</button>
				</div>
			</label>
			<p class="text-sm text-slate-500 dark:text-slate-400 dark:text-metadark">
				Password baru segera aktif tanpa perlu password lama. Sampaikan password ini kepada pengguna lewat jalur aman.
			</p>
			<div class="flex justify-end gap-2">
				<Button variant="ghost" onclick={() => (passwordTarget = null)}>Batal</Button>
				<Button type="submit" disabled={acting}>Simpan Password</Button>
			</div>
		</form>
	</Modal>
{/if}

<!-- Modal kategori -->
{#if categoryModalMode}
	<Modal title={categoryModalMode === 'add' ? 'Tambah Kategori Sistem' : 'Edit Kategori Sistem'} onclose={() => (categoryModalMode = null)}>
		<form
			class="space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				submitCategory();
			}}
		>
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Nama</span>
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
						<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Tipe</span>
						<select
							bind:value={categoryForm.type}
							class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
						>
							<option value="EXPENSE">Pengeluaran</option>
							<option value="INCOME">Pemasukan</option>
						</select>
					</label>
					<label class="block">
						<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Kategori induk</span>
						<select
							bind:value={categoryForm.parentId}
							class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
						>
							<option value="">— Tidak ada —</option>
							{#each systemCategories.filter((p) => !p.parentId && p.type === categoryForm.type) as p (p.id)}
								<option value={p.id}>{p.name}</option>
							{/each}
						</select>
					</label>
				</div>
			{/if}
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Warna</span>
				<input type="color" bind:value={categoryForm.color} class="h-10 w-20 cursor-pointer rounded border border-slate-300 dark:border-slate-600" />
			</label>
			<div class="flex justify-end gap-2">
				<Button variant="ghost" onclick={() => (categoryModalMode = null)}>Batal</Button>
				<Button type="submit" disabled={acting}>Simpan</Button>
			</div>
		</form>
	</Modal>
{/if}

<!-- Modal tipe dompet -->
{#if walletModalMode}
	<Modal title={walletModalMode === 'add' ? 'Tambah Tipe Dompet' : 'Edit Tipe Dompet'} onclose={() => (walletModalMode = null)}>
		<form
			class="space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				submitWallet();
			}}
		>
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Kode {walletModalMode === 'add' ? '(mis. INVESTASI)' : ''}</span>
				<input
					type="text"
					required
					bind:value={walletForm.code}
					disabled={walletModalMode === 'edit'}
					class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none disabled:bg-slate-100 dark:bg-boxdark-2"
				/>
			</label>
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Label tampilan</span>
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
				<Button variant="ghost" onclick={() => (walletModalMode = null)}>Batal</Button>
				<Button type="submit" disabled={acting}>Simpan</Button>
			</div>
		</form>
	</Modal>
{/if}

<!-- Modal dompet -->
{#if dompetModalMode}
	<Modal title={dompetModalMode === 'add' ? 'Tambah Dompet' : 'Edit Dompet'} onclose={() => (dompetModalMode = null)}>
		<form
			class="space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				submitDompet();
			}}
		>
			{#if dompetModalMode === 'add'}
				<label class="block">
					<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Pemilik</span>
					<select
						bind:value={dompetForm.userId}
						required
						class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
					>
						<option value="" disabled>— Pilih pengguna —</option>
						{#each users as u (u.id)}
							<option value={u.id}>{u.name} ({u.email})</option>
						{/each}
					</select>
				</label>
			{:else}
				<p class="rounded-lg bg-slate-50 dark:bg-boxdark-2 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 dark:text-metadark">
					Pemilik dompet tidak dapat diubah; saldo ikut ke kelola lewat transaksi agar selalu konsisten dengan riwayat.
				</p>
			{/if}
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Nama dompet</span>
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
					<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Tipe dompet</span>
					<select
						bind:value={dompetForm.type}
						required
						class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
					>
						<option value="" disabled>— Pilih tipe —</option>
						{#each walletTypes.filter((t) => t.isActive) as t (t.code)}
							<option value={t.code}>{t.label}</option>
						{/each}
					</select>
				</label>
				<label class="block">
					<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Mata uang</span>
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
					<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Saldo awal</span>
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
				Ikut dihitung dalam total saldo dashboard
			</label>
			<div class="flex justify-end gap-2">
				<Button variant="ghost" onclick={() => (dompetModalMode = null)}>Batal</Button>
				<Button type="submit" disabled={acting}>Simpan</Button>
			</div>
		</form>
	</Modal>
{/if}
