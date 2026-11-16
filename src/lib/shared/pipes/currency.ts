export function formatCurrency(amount: number, currency = 'IDR'): string {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amount);
}

export function formatCompactCurrency(amount: number, currency = 'IDR'): string {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency,
		notation: 'compact',
		maximumFractionDigits: 1
	}).format(amount);
}
