import { translations, type Locale } from './messages';

const STORAGE_KEY = 'fa_locale';
const SUPPORTED: Locale[] = ['id', 'en'];

function detectLocale(): Locale {
	if (typeof window === 'undefined') return 'id';
	const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
	if (stored && SUPPORTED.includes(stored)) return stored;
	const nav = window.navigator.language?.slice(0, 2).toLowerCase();
	return nav === 'en' ? 'en' : 'id';
}

interface TParams {
	[key: string]: string | number;
}

/**
 * Layanan internasionalisasi (i18n).
 *
 * - `locale` reaktif (`$state`) — semua {$derived} dan markup yang memanggil
 *   `i18n.t()` otomatis ter-render ulang ketika bahasa diganti.
 * - `t(key, params)` — interpolasi `{{param}}`.
 * - `intlLocale` — dipakai pipes (currency/date) agar format mengikuti locale.
 */
class I18nService {
	locale = $state<Locale>('id');
	initialized = false;

	/** Deteksi locale dari localStorage/browser (aman untuk SSR). */
	init(): void {
		if (this.initialized) return;
		this.initialized = true;
		this.locale = detectLocale();
	}

	setLocale(locale: Locale): void {
		this.locale = locale;
		if (typeof window !== 'undefined') {
			window.localStorage.setItem(STORAGE_KEY, locale);
			document.documentElement.lang = locale;
		}
	}

	/** Ganti antara id ⇄ en (untuk tombol toggle bahasa). */
	toggle(): void {
		this.setLocale(this.locale === 'id' ? 'en' : 'id');
	}

	/** Kode locale untuk Intl (mis. format tanggal/mata uang). */
	get intlLocale(): string {
		return this.locale === 'en' ? 'en-US' : 'id-ID';
	}

	/**
	 * Terjemahkan kunci dengan interpolasi `{{param}}`.
	 * Bila kunci tidak ditemukan, kembalikan kunci itu sendiri (mudah dideteksi saat dev).
	 */
	t(key: string, params?: TParams): string {
		const dict = translations[this.locale] ?? translations.id;
		const fallback = translations.id;
		let text = dict[key] ?? fallback[key] ?? key;
		if (params) {
			for (const [name, value] of Object.entries(params)) {
				text = text.replaceAll(`{{${name}}}`, String(value));
			}
		}
		return text;
	}

	/**
	 * Ubah error menjadi pesan siap tampilkan:
	 * bila error punya `code` (dari API) dan kamusnya ada → terjemahkan;
	 * selain itu fallback ke pesan asli / pesan generik.
	 */
	displayError(err: unknown): string {
		if (err && typeof err === 'object' && 'code' in err) {
			const code = (err as { code?: string }).code;
			if (code && translations[this.locale]?.[`errors.${code}`]) {
				return this.t(`errors.${code}`);
			}
		}
		return err instanceof Error && err.message ? err.message : this.t('errors.generic');
	}
}

export const i18n = new I18nService();
