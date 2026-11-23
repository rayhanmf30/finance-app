export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'fa-theme';

function applyMode(mode: ThemeMode) {
	document.documentElement.classList.toggle('dark', mode === 'dark');
	try {
		localStorage.setItem(STORAGE_KEY, mode);
	} catch {
		// abaikan — tema tetap aktif untuk sesi ini saja
	}
}

class ThemeService {
	current = $state<ThemeMode>('light');

	/** Sinkronkan dari class di <html> (di-set script anti-FOUC atau default). */
	init() {
		this.current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
	}

	set(mode: ThemeMode) {
		this.current = mode;
		applyMode(mode);
	}

	toggle() {
		this.set(this.current === 'dark' ? 'light' : 'dark');
	}
}

export const themeService = new ThemeService();
