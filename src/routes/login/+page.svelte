<script lang="ts">
	import { goto } from '$app/navigation';
	import { authService } from '#lib/core/auth/auth.service.svelte';
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';
	import { IconButton } from '#lib/shared/components';

	let email = $state('');
	let password = $state('');
	let errorMessage = $state('');
	let submitting = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		submitting = true;
		try {
			await authService.login(email, password);
			await goto('/');
		} catch (err) {
			errorMessage = err instanceof Error ? i18n.displayError(err) : i18n.t('auth.loginFailed');
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>{i18n.t('auth.pageLogin')} — Finance App</title>
</svelte:head>

<div class="mx-auto mt-10 max-w-md">
	<div class="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-boxdark-2 p-6 shadow-sm sm:p-8">
		<div class="mb-6 text-center">
			<div class="text-3xl">💰</div>
			<h1 class="mt-2 text-xl font-bold text-slate-900 dark:text-white">{i18n.t('auth.loginHeading')}</h1>
			<p class="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-metadark">{i18n.t('auth.loginSubtitle')}</p>
		</div>

		<form onsubmit={submit} class="space-y-4">
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('auth.email')}</span>
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
				<span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{i18n.t('auth.password')}</span>
				<input
					type="password"
					required
					autocomplete="current-password"
					placeholder="••••••••"
					bind:value={password}
					class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
				/>
			</label>

			{#if errorMessage}
				<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
			{/if}

			<IconButton
				type="submit"
				variant="primary"
				icon="logout"
				size="md"
				label={submitting ? i18n.t('common.processing') : i18n.t('auth.login')}
				loading={submitting}
			/>
		</form>

		<p class="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
			{i18n.t('auth.noAccount')}
			<a href="/register" class="font-medium text-indigo-600 hover:text-indigo-700">{i18n.t('auth.register')}</a>
		</p>
	</div>
</div>
