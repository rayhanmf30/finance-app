// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			/** ID user yang login (dari session cookie), atau null bila belum login. */
			userId: string | null;
			/** Role akun: 'user' | 'admin' (default 'user' bila belum login). */
			userRole: 'user' | 'admin';
			/** True bila akun diblokir oleh admin (hanya relevan saat login). */
			isBlocked: boolean;
		}
		interface Error {
			/** Kode error opsional (mis. E_UNAUTHORIZED) untuk internasionalisasi pesan error. */
			code?: string;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
