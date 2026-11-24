import { i18n } from '#lib/shared/i18n/i18n.service.svelte';

export function formatDate(isoDate: string): string {
	return new Intl.DateTimeFormat(i18n.intlLocale, {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	}).format(new Date(isoDate));
}

export function formatMonthYear(month: string): string {
	const [year, monthIndex] = month.split('-').map(Number);
	return new Intl.DateTimeFormat(i18n.intlLocale, { month: 'long', year: 'numeric' }).format(
		new Date(year, monthIndex - 1, 1)
	);
}

export function currentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
