<script lang="ts">
	import { i18n } from '#lib/shared/i18n/i18n.service.svelte';
	import Icon from './Icon.svelte';

	/**
	 * DatePicker kustom (klik pilih tanggal dari kalender).
	 * Aturan baku (lihat CONTRIBUTING.md): input tanggal wajib memakai komponen ini.
	 * `bind:value` memakai format YYYY-MM-DD (sama seperti input date native).
	 * Grid kalender dibuat pada jam 12:00 agar kebal pergeseran zona waktu.
	 */
	interface Props {
		label?: string;
		/** Nilai terpilih dalam format YYYY-MM-DD \u2014 dua arah. */
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

	const displayText = $derived.by(() => {
		if (!value) return '';
		const [y, m, d] = value.split('-').map(Number);
		if (!y || !m || !d) return value;
		return new Intl.DateTimeFormat(i18n.intlLocale, {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		}).format(new Date(y, m - 1, d, 12));
	});

	function toIso(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	/** Buka popup: selalu segarkan tampilan bulan dari value (atau hari ini). */
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

	/** Pilih tanggal: tulis value (YYYY-MM-DD) lalu tutup popup. */
	function pick(cell: DayCell) {
		value = cell.iso;
		open = false;
	}

	function onWindowClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (open && !target.closest(`[data-datepicker="${uid}"]`)) open = false;
	}
</script>

<svelte:window onclick={onWindowClick} />

<div data-datepicker={uid}>
	{#if label}
		<label for={uid} class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">
			{label}{#if required}<span class="text-red-500"> *</span>{/if}
		</label>
	{/if}

	<div class="relative">
		<button
			type="button"
			id={uid}
			{disabled}
			class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-boxdark dark:text-white"
			onclick={toggleOpen}
		>
			<span class={value ? '' : 'text-slate-400 dark:text-metadark'}>
				{displayText || '\u2014'}
			</span>
			<Icon name="calendar" class="h-4 w-4 shrink-0 text-slate-400 dark:text-metadark" />
		</button>

		{#if open}
			<div
				class="absolute left-0 top-full z-30 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700/60 dark:bg-boxdark-2"
			>
				<!-- Header: navigasi bulan -->
				<div class="mb-2 flex items-center justify-between">
					<button
						type="button"
						aria-label={i18n.t('datepicker.prevMonth')}
						title={i18n.t('datepicker.prevMonth')}
						class="cursor-pointer rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:text-metadark dark:hover:bg-boxdark dark:hover:text-white"
						onclick={prevMonth}
					>
						<Icon name="chevronLeft" class="h-4 w-4" />
					</button>
					<span class="text-sm font-semibold text-slate-800 dark:text-white">{monthTitle}</span>
					<button
						type="button"
						aria-label={i18n.t('datepicker.nextMonth')}
						title={i18n.t('datepicker.nextMonth')}
						class="cursor-pointer rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:text-metadark dark:hover:bg-boxdark dark:hover:text-white"
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

				<!-- Grid tanggal -->
				<div class="grid grid-cols-7 gap-1">
					{#each cells as cell (cell.iso)}
						<button
							type="button"
							aria-label={cell.iso}
							tabindex={cell.inMonth ? 0 : -1}
							class="cursor-pointer rounded-md py-1.5 text-center text-xs transition-colors {cell.isSelected
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
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
