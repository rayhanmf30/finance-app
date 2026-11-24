import { i18n } from '#lib/shared/i18n/i18n.service.svelte';

/** Format mata uang mengikuti locale aktif (id-ID / en-US). */
export function formatCurrency(amount: number, currency = 'IDR'): string {
	return new Intl.NumberFormat(i18n.intlLocale, {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amount);
}

export function formatCompactCurrency(amount: number, currency = 'IDR'): string {
	return new Intl.NumberFormat(i18n.intlLocale, {
		style: 'currency',
		currency,
		notation: 'compact',
		maximumFractionDigits: 1
	}).format(amount);
}
