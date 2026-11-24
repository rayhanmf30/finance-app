<script lang="ts">
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';
	import Icon from './Icon.svelte';

	/**
	 * DatePicker dengan gaya HeroUI (heroui.com) — HeroUI adalah library React
	 * (React Aria), sehingga komponen ini di-replikasi di Svelte:
	 * - Field tersegmentasi `dd / mm / yyyy` yang bisa diketik langsung
	 *   (auto-advance antar segmen, Backspace kembali segmen sebelumnya);
	 * - Tombol ikon kalender di ujung kanan membuka popover bulan grid;
	 * - Popover: header chevron prev/next + judul bulan (Intl sesuai locale),
	 *   minggu mulai Senin, hari ini bertanda titik, terpilih lingkaran penuh.
	 * `bind:value` memakai format YYYY-MM-DD (sama seperti input date native).
	 * Grid kalender dibuat pada jam 12:00 agar kebal pergeseran zona waktu.
	 */
	interface Props {
		label?: string;
		/** Nilai terpilih dalam format YYYY-MM-DD — dua arah. */
		value?: string;
		required?: boolean;
		disabled?: boolean;
		/** id elemen (untuk label for & aksesibilitas). */
		id?: string;
	}

	let { label, value = $bindable(''), required = false, disabled = false, id }: Props = $props();

	const fallbackUid = `dp-${Math.random().toString(36).slice(2, 10)}`;
	const uid = $derived(id ?? fallbackUid);

	let open = $state(false);
	let viewYear = $state(0);
	let viewMonth = $state(1); // 1-12

	/* ---- Segmen dd / mm / yyyy (gaya DateField HeroUI) ---- */
	let dd = $state('');
	let mm = $state('');
	let yy = $state('');
	let ddInput: HTMLInputElement | undefined;
	let mmInput: HTMLInputElement | undefined;
	let yyInput: HTMLInputElement | undefined;
	/** Nilai terakhir yang sudah disinkronkan ke segmen (mencegah overwrite saat mengetik). */
	let lastSynced = $state('');
	/** Segmen yang diminta pengguna tapi belum valid (ditandai merah). */
	let invalidSeg = $state(false);

	// Sinkronkan segmen saat berubah dari luar (populasi modal / pilih kalender).
	$effect(() => {
		if (value === lastSynced) return;
		lastSynced = value;
		const picked = value ? value.split('-').map(Number) : null;
		if (picked && picked[0]) {
			dd = String(picked[2]).padStart(2, '0');
			mm = String(picked[1]).padStart(2, '0');
			yy = String(picked[0]);
		}
	});

	function daysInMonth(y: number, m: number): number {
		return new Date(y, m, 0).getDate();
	}

	function parseSegments(): string | null {
		if (dd.length < 2 || mm.length < 2 || yy.length < 4) return null;
		const d = Number(dd);
		const m = Number(mm);
		const y = Number(yy);
		if (m < 1 || m > 12 || y < 1000) return null;
		if (d < 1 || d > daysInMonth(y, m)) return null;
		return toIso(new Date(y, m - 1, d, 12));
	}

	function commitIfValid(): boolean {
		const iso = parseSegments();
		if (iso) {
			value = iso;
			invalidSeg = false;
			return true;
		}
		return false;
	}

	function markInvalid(part: 'dd' | 'mm' | 'yy') {
		invalidSeg = true;
		if (part === 'dd') dd = '';
		else if (part === 'mm') mm = '';
		else yy = '';
	}

	function handleSeg(part: 'dd' | 'mm' | 'yy', event: Event) {
		const el = event.currentTarget as HTMLInputElement;
		const maxLen = part === 'yy' ? 4 : 2;
		const digits = el.value.replace(/\D/g, '').slice(0, maxLen);
		el.value = digits;
		if (part === 'dd') dd = digits;
		else if (part === 'mm') mm = digits;
		else yy = digits;

		invalidSeg = false;
		const num = Number(digits);
		const dayLimit = daysInMonth(yy.length === 4 ? Number(yy) : 2100, mm ? Number(mm) : 1);
		if (digits.length === maxLen) {
			const overflow = (part === 'dd' && (num < 1 || num > 31 || num > dayLimit))
				|| (part === 'mm' && (num < 1 || num > 12));
			if (overflow) {
				markInvalid(part);
				return;
			}
			// Auto-advance ke segmen berikutnya.
			if (part === 'dd') mmInput?.focus();
			else if (part === 'mm') yyInput?.focus();
		}
		commitIfValid();
	}

	function handleSegKey(part: 'dd' | 'mm' | 'yy', event: KeyboardEvent) {
		if (event.key === 'Escape') {
			open = false;
			return;
		}
		const seg = (part === 'dd' ? dd : part === 'mm' ? mm : yy);
		if (event.key === 'Backspace' && seg === '') {
			event.preventDefault();
			if (part === 'mm') ddInput?.focus();
			else if (part === 'yy') mmInput?.focus();
		}
	}

	function onPaste(event: ClipboardEvent) {
		// Tempel bebas: ekstrak semua angka lalu isi segmen secukupnya.
		const digits = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '');
		if (digits.length < 3) return;
		event.preventDefault();
		dd = digits.slice(0, 2).padStart(2, '0');
		mm = digits.slice(2, 4).padStart(2, '0');
		yy = digits.slice(4, 8);
		lastSynced = '';
		commitIfValid();
	}

	/* ---- Popover bulan grid ---- */

	/** Nama bulan via Intl mengikuti locale aktif. */
	const monthTitle = $derived(
		open
			? new Intl.DateTimeFormat(i18n.intlLocale, { month: 'long', year: 'numeric' }).format(
					new Date(viewYear, viewMonth - 1, 1, 12)
				)
			: ''
	);

	/** Label hari Senin-Minggu (basis 2023-01-02 = Senin) via Intl. */
	const weekdayLabels = $derived.by(() => {
		const fmt = new Intl.DateTimeFormat(i18n.intlLocale, { weekday: 'short' });
		return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2023, 0, 2 + i, 12)));
	});

	interface DayCell {
		day: number;
		iso: string;
		inMonth: boolean;
		isToday: boolean;
		isSelected: boolean;
	}

	const cells = $derived.by<DayCell[]>(() => {
		if (!open) return [];
		const first = new Date(viewYear, viewMonth - 1, 1, 12);
		// Offset agar minggu dimulai Senin.
		const offset = (first.getDay() + 6) % 7;
		const grid: DayCell[] = [];
		const todayIso = toIso(new Date());
		const selectedIso = value;
		for (let i = 0; i < 42; i++) {
			const d = new Date(viewYear, viewMonth - 1, 1 - offset + i, 12);
			const iso = toIso(d);
			grid.push({
				day: d.getDate(),
				iso,
				inMonth: d.getMonth() === viewMonth - 1,
				isToday: iso === todayIso,
				isSelected: iso === selectedIso
			});
		}
		return grid;
	});

	function toIso(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	/** Buka popover: selalu segarkan tampilan bulan dari value (atau hari ini). */
	function toggleOpen() {
		if (disabled) return;
		if (open) {
			open = false;
			return;
		}
		const base = value ? value.split('-').map(Number) : null;
		const now = new Date();
		viewYear = base && base[0] ? base[0] : now.getFullYear();
		viewMonth = base && base[1] ? base[1] : now.getMonth() + 1;
		open = true;
	}

	function prevMonth() {
		if (viewMonth === 1) {
			viewYear -= 1;
			viewMonth = 12;
		} else {
			viewMonth -= 1;
		}
	}

	function nextMonth() {
		if (viewMonth === 12) {
			viewYear += 1;
			viewMonth = 1;
		} else {
			viewMonth += 1;
		}
	}

	/** Pilih tanggal: tulis value (YYYY-MM-DD) lalu tutup popover. */
	function pick(cell: DayCell) {
		value = cell.iso;
		lastSynced = '';
		invalidSeg = false;
		open = false;
	}

	function onWindowClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (open && !target.closest(`[data-datepicker="${uid}"]`)) open = false;
	}
</script>

<svelte:window onclick={onWindowClick} />

<div data-datepicker={uid} class="relative">
	{#if label}
		<label for={uid} class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">
			{label}{#if required}<span class="text-red-500"> *</span>{/if}
		</label>
	{/if}

	<div
		id={uid}
		class="flex w-full items-center justify-between gap-2 rounded-lg border-2 border-slate-200 bg-white px-2.5 py-1.5 transition-all {invalidSeg
			? 'border-red-500'
			: 'border-slate-300 hover:border-slate-400 focus-within:border-indigo-500 focus-within:hover:border-indigo-500'} dark:bg-boxdark {invalidSeg
			? 'dark:border-red-500'
			: 'dark:border-slate-600 dark:hover:border-slate-500 dark:focus-within:border-indigo-500'} {disabled
			? 'cursor-not-allowed opacity-60'
			: ''}"
	>
		<!-- Field tersegmentasi dd / mm / yyyy (bisa diketik langsung) -->
		<!-- Klik area kosong field fokus ke segmen pertama; tempel tanggal dibaca dari paste. -->
		<div class="flex flex-1 items-center gap-0.5 text-sm text-slate-900 dark:text-white" onpaste={onPaste}>
			<input
				bind:this={ddInput}
				type="text"
				inputmode="numeric"
				autocomplete="off"
				placeholder="dd"
				aria-label="tanggal (dd)"
				{disabled}
				value={dd}
				class="w-6 bg-transparent text-center text-sm caret-indigo-600 outline-none {dd
					? 'text-slate-900 dark:text-white'
					: 'placeholder:text-slate-400 dark:placeholder:text-slate-600'}"
				oninput={(e) => handleSeg('dd', e)}
				onkeydown={(e) => handleSegKey('dd', e)}
			/>
			<span class="text-slate-400 dark:text-slate-600">/</span>
			<input
				bind:this={mmInput}
				type="text"
				inputmode="numeric"
				autocomplete="off"
				placeholder="mm"
				aria-label="bulan (mm)"
				{disabled}
				value={mm}
				class="w-6 bg-transparent text-center text-sm caret-indigo-600 outline-none {mm
					? 'text-slate-900 dark:text-white'
					: 'placeholder:text-slate-400 dark:placeholder:text-slate-600'}"
				oninput={(e) => handleSeg('mm', e)}
				onkeydown={(e) => handleSegKey('mm', e)}
			/>
			<span class="text-slate-400 dark:text-slate-600">/</span>
			<input
				bind:this={yyInput}
				type="text"
				inputmode="numeric"
				autocomplete="off"
				placeholder="yyyy"
				aria-label="tahun (yyyy)"
				{disabled}
				value={yy}
				class="w-10 bg-transparent text-center text-sm caret-indigo-600 outline-none {yy
					? 'text-slate-900 dark:text-white'
					: 'placeholder:text-slate-400 dark:placeholder:text-slate-600'}"
				oninput={(e) => handleSeg('yy', e)}
				onkeydown={(e) => handleSegKey('yy', e)}
			/>
		</div>

		<!-- Tombol selector kalender (gaya selectorButton HeroUI: bulat, light) -->
		<button
			type="button"
			aria-label={i18n.t('datepicker.openCalendar')}
			title={i18n.t('datepicker.openCalendar')}
			{disabled}
			class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed dark:text-slate-500 dark:hover:bg-boxdark dark:hover:text-slate-300"
			onclick={toggleOpen}
		>
			<Icon name="calendar" class="h-4 w-4" />
		</button>
	</div>

	{#if open}
		<div
			class="absolute left-0 top-full z-30 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700/60 dark:bg-boxdark-2"
		>
			<!-- Header: navigasi bulan (gaya header Calendar HeroUI) -->
			<div class="mb-2 flex items-center justify-between">
				<button
					type="button"
					aria-label={i18n.t('datepicker.prevMonth')}
					title={i18n.t('datepicker.prevMonth')}
					class="cursor-pointer rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:text-metadark dark:hover:bg-boxdark dark:hover:text-white"
					onclick={prevMonth}
				>
					<Icon name="chevronLeft" class="h-4 w-4" />
				</button>
				<span class="text-sm font-semibold text-slate-800 dark:text-white">{monthTitle}</span>
				<button
					type="button"
					aria-label={i18n.t('datepicker.nextMonth')}
					title={i18n.t('datepicker.nextMonth')}
					class="cursor-pointer rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:text-metadark dark:hover:bg-boxdark dark:hover:text-white"
					onclick={nextMonth}
				>
					<Icon name="chevronRight" class="h-4 w-4" />
				</button>
			</div>

			<!-- Header hari (Senin-Minggu) -->
			<div class="grid grid-cols-7 gap-1">
				{#each weekdayLabels as wd (wd)}
					<span class="py-1 text-center text-xs font-semibold text-slate-400 dark:text-metadark">
						{wd}
					</span>
				{/each}
			</div>

			<!-- Grid tanggal: sel bulat, terpilih lingkaran penuh, hari ini bertanda titik -->
			<div class="grid grid-cols-7 gap-1">
				{#each cells as cell (cell.iso)}
					<button
						type="button"
						aria-label={cell.iso}
						tabindex={cell.inMonth ? 0 : -1}
						class="relative mx-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-center text-xs transition-colors {cell.isSelected
							? 'bg-indigo-600 font-semibold text-white'
							: cell.isToday
								? 'font-bold text-indigo-600 ring-1 ring-indigo-300 dark:text-indigo-400 dark:ring-indigo-700'
								: cell.inMonth
									? 'text-slate-700 dark:text-slate-200'
									: 'text-slate-300 dark:text-slate-600'} {!cell.isSelected
							? 'hover:bg-slate-100 dark:hover:bg-boxdark'
							: ''}"
						onclick={() => pick(cell)}
					>
						{cell.day}
						{#if cell.isToday && !cell.isSelected}
							<span class="absolute -bottom-0.5 h-1 w-1 rounded-full bg-current"></span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
