export function formatDate(isoDate: string): string {
	return new Intl.DateTimeFormat('id-ID', {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	}).format(new Date(isoDate));
}

export function formatMonthYear(month: string): string {
	const [year, monthIndex] = month.split('-').map(Number);
	return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
		new Date(year, monthIndex - 1, 1)
	);
}

export function currentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
