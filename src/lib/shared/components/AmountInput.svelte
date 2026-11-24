<script lang="ts">
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';

	/**
	 * Input nominal dengan pemisah ribuan otomatis (contoh: 10.000 / 100.000).
	 * Tampilan memakai format locale id-ID (titik sebagai pemisah ribuan);
	 * `bind:value` tetap menghasilkan angka murni (number) untuk dikirim ke API.
	 */
	interface Props {
		label?: string;
		/** Nilai numerik murni (tanpa separator) — dua arah. */
		value?: number;
		min?: number;
		max?: number;
		required?: boolean;
		disabled?: boolean;
		placeholder?: string;
		/** id elemen input (untuk label for & aksesibilitas). */
		id?: string;
	}

	let { label, value = $bindable(0), min = 0, max = Number.MAX_SAFE_INTEGER, required = false, disabled = false, placeholder, id }: Props = $props();

	const fallbackUid = `amt-${Math.random().toString(36).slice(2, 10)}`;
	const uid = $derived(id ?? fallbackUid);

	let display = $state<string>(formatFrom(value));

	function grouped(digits: string): string {
		if (!digits) return '';
		const trimmed = digits.replace(/^0+(?=\d)/, '');
		return Number(trimmed).toLocaleString('id-ID');
	}

	function formatFrom(n: number): string {
		if (!Number.isFinite(n) || n <= 0) return '';
		return n.toLocaleString('id-ID');
	}

	function handleInput(event: Event) {
		const inputEl = event.currentTarget as HTMLInputElement;
		const digits = inputEl.value.replace(/\D/g, '').slice(0, 15);
		const parsed = digits ? parseInt(digits, 10) : 0;
		value = Math.min(Math.max(parsed, min), max);
		display = grouped(digits);
		// Tulis kembali tampilan ternormalisasi (mis. "0001000" -> "1.000").
		if (inputEl.value !== display) inputEl.value = display;
	}

	function handleBlur() {
		// Tampilkan "0" bila diisi tapi bernilai nol, agar jelas field terisi.
		if (display === '' && value > 0) display = formatFrom(value);
	}
</script>

<div>
	{#if label}
		<label for={uid} class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">
			{label}{#if required}<span class="text-red-500"> *</span>{/if}
		</label>
	{/if}
	<input
		id={uid}
		type="text"
		inputmode="numeric"
		autocomplete="off"
		{required}
		{disabled}
		placeholder={placeholder ?? '10.000'}
		bind:value={display}
		oninput={handleInput}
		onblur={handleBlur}
		class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-boxdark px-3 py-2 text-right text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
	/>
</div>
