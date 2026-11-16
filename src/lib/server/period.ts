export type PeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface PeriodRange {
	start: Date;
	end: Date;
}

export function periodRange(date: Date, period: PeriodType): PeriodRange {
	const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

	switch (period) {
		case 'DAILY': {
			const end = new Date(d);
			end.setDate(end.getDate() + 1);
			return { start: d, end };
		}
		case 'WEEKLY': {
			const start = d;
			start.setDate(start.getDate() - ((d.getDay() + 6) % 7));
			const end = new Date(start);
			end.setDate(end.getDate() + 7);
			return { start, end };
		}
		case 'MONTHLY': {
			const start = new Date(d.getFullYear(), d.getMonth(), 1);
			const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
			return { start, end };
		}
		case 'YEARLY': {
			const start = new Date(d.getFullYear(), 0, 1);
			const end = new Date(d.getFullYear() + 1, 0, 1);
			return { start, end };
		}
	}
}

export function periodKey(date: Date, period: PeriodType): string {
	const pad = (n: number) => String(n).padStart(2, '0');

	switch (period) {
		case 'DAILY':
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
		case 'WEEKLY': {
			const target = new Date(date);
			target.setDate(target.getDate() - ((target.getDay() + 6) % 7) + 3);
			const isoYear = target.getFullYear();
			const firstThursday = new Date(isoYear, 0, 4);
			firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
			const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86400000));
			return `${isoYear}-W${pad(week)}`;
		}
		case 'MONTHLY':
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
		case 'YEARLY':
			return String(date.getFullYear());
	}
}
