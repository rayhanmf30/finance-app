import { error } from '@sveltejs/kit';
import type { ISql } from 'postgres';

/**
 * Resolver tipe dompet berbasis kode.
 *
 * Saat ini `wallets.type` adalah UUID FK ke wallet_types(id). Klien tetap
 * mengirim kode (code) tipe — resolver memilih baris milik pengguna login
 * terlebih dahulu; bila tidak ada, baris global (user_id NULL, dikelola
 * admin) dipakai. Precedence ini memungkinkan pengguna menimpa kode global
 * dengan tipe pribadi berlabel sendiri.
 */
export async function resolveWalletTypeId(
	exec: ISql,
	userId: string,
	code: string
): Promise<{ id: string; label: string }> {
	const rows = await exec<{ id: string; label: string; is_active: boolean }[]>`
		SELECT id, label, is_active FROM wallet_types
		WHERE code = ${code} AND (user_id = ${userId} OR user_id IS NULL)
		ORDER BY (user_id IS NOT NULL) DESC
		LIMIT 1
	`;
	if (rows.length === 0) {
		throw error(404, { message: `Tipe dompet "${code}" tidak ditemukan.`, code: 'E_WALLET_TYPE_NOT_FOUND' });
	}
	if (!rows[0].is_active) {
		throw error(400, { message: `Tipe dompet "${code}" sedang nonaktif.`, code: 'E_WALLET_TYPE_INACTIVE' });
	}
	return { id: rows[0].id, label: rows[0].label };
}

/** Validasi input dompet (dipakai POST/PUT /api/wallets). */
export function validateWalletInput(body: {
	name?: unknown;
	currency?: unknown;
}): { name: string; currency: string } {
	const name = String(body.name ?? '').trim();
	const currency = String(body.currency ?? 'IDR').trim().toUpperCase();
	if (name.length < 2 || name.length > 100) {
		throw error(400, { message: 'Nama dompet wajib 2-100 karakter.', code: 'E_BAD_WALLET_NAME' });
	}
	if (currency.length !== 3) {
		throw error(400, { message: 'Kode mata uang wajib 3 huruf (mis. IDR).', code: 'E_BAD_CURRENCY' });
	}
	return { name, currency };
}
