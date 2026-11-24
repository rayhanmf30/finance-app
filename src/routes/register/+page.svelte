<script lang="ts">
	import { goto } from '$app/navigation';
	import { authService } from '#lib/core/auth/auth.service.svelte';
	import { Button } from '#lib/shared/components';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let errorMessage = $state('');
	let submitting = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		if (!name.trim() || !email.trim() || !password) {
			errorMessage = 'Semua kolom wajib diisi.';
			return;
		}
		if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
			errorMessage = 'Password minimal 8 karakter, kombinasi huruf dan angka.';
			return;
		}
		submitting = true;
		try {
			await authService.register(name.trim(), email.trim(), password);
			await goto('/');
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Gagal mendaftar. Coba lagi.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Daftar — Finance App</title>
</svelte:head>

<div class="mx-auto mt-10 max-w-md">
	<div class="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-boxdark-2 p-6 shadow-sm sm:p-8">
		<div class="mb-6 text-center">
			<div class="text-3xl">💰</div>
			<h1 class="mt-2 text-xl font-bold text-slate-900 dark:text-white">Buat Akun Baru</h1>
			<p class="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-metadark">Anda akan mendapat dompet awal & kategori standar</p>
		</div>

		<form onsubmit={submit} class="space-y-4">
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Nama</span>
				<input
					type="text"
					required
					autocomplete="name"
					placeholder="Nama lengkap"
					bind:value={name}
					class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
				/>
			</label>

			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</span>
				<input
					type="email"
					required
					autocomplete="email"
					placeholder="nama@email.com"
					bind:value={email}
					class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
				/>
			</label>

			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Password</span>
				<input
					type="password"
					required
					autocomplete="new-password"
					placeholder="Minimal 8 karakter, huruf + angka"
					bind:value={password}
					class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
				/>
			</label>

			{#if errorMessage}
				<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
			{/if}

			<Button type="submit" loading={submitting}>
				{submitting ? 'Memproses…' : 'Daftar'}
			</Button>
		</form>

		<p class="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
			Sudah punya akun?
			<a href="/login" class="font-medium text-indigo-600 hover:text-indigo-700">Masuk</a>
		</p>
	</div>
</div>
