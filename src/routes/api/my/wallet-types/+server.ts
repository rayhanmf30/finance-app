import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireUserId } from '#lib/server/session';
import type { RequestHandler } from './$types';

interface WalletTypeRow {
	id: string;
	code: string;
	label: string;
	is_active: boolean;
	wallet_count: number;
	is_global: boolean;
}

/** Kode tipe: huruf besar, angka, underscore (2-20 char) — dari label bila dikosongkan. */
function normalizeCode(raw: string): string {
	return raw.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20);
}

/** Cari kode unik pada scope pengguna ini + global; suffix _2.._99 bila bentrok. */
async function pickUniqueCode(userId: string, baseCode: string): Promise<string> {
	for (let n = 0; n <= 99; n++) {
		const candidate = n === 0 ? baseCode : `${baseCode.slice(0, 17)}_${n}`;
		const exists = await db`
			SELECT 1 FROM wallet_types
			WHERE code = ${candidate} AND (user_id IS NULL OR user_id = ${userId})
			LIMIT 1
		`;
		if (exists.length === 0) return candidate;
	}
	throw error(409, {
		message: 'Kode tipe dompet sudah terpakai; silakan ganti kode/label.',
		code: 'E_WT_CONFLICT'
	});
}

/** Daftar tipe dompet: milik pengguna login + global (dari admin). */
export const GET: RequestHandler = async ({ locals, url }) => {
	const userId = requireUserId(locals);
	const query = (url.searchParams.get('q') ?? '').trim();
	const pattern = `%${query}%`;

	const rows = await db<WalletTypeRow[]>`
		SELECT wt.id, wt.code, wt.label, wt.is_active,
			(SELECT count(*) FROM wallets w WHERE w.type = wt.id AND w.user_id = ${userId})::int AS wallet_count,
			(wt.user_id IS NULL) AS is_global
		FROM wallet_types wt
		WHERE (wt.user_id = ${userId} OR wt.user_id IS NULL)
			AND (wt.is_active = TRUE OR wt.user_id = ${userId})
			AND (${query} = ''
				OR wt.code ILIKE ${pattern}
				OR wt.label ILIKE ${pattern})
		ORDER BY (wt.user_id IS NULL), wt.code
	`;

	return json(
		rows.map((r) => ({
			id: r.id,
			code: r.code,
			label: r.label,
			isActive: r.is_active,
			walletCount: r.wallet_count,
			isGlobal: r.is_global
		}))
	);
};

/** Tambah tipe dompet milik pengguna (kode otomatis dari label bila dikosongkan). */
export const POST: RequestHandler = async ({ locals, request }) => {
	const userId = requireUserId(locals);
	const body = (await request.json().catch(() => null)) as { code?: string; label?: string } | null;
	if (!body) throw error(400, { message: 'Body harus JSON.', code: 'E_BAD_BODY' });

	const label = String(body.label ?? '').trim();
	if (label.length < 2 || label.length > 50) {
		throw error(400, { message: 'Label wajib 2-50 karakter.', code: 'E_WT_BAD_LABEL' });
	}

	let code = body.code ? normalizeCode(String(body.code)) : normalizeCode(label);
	if (code.length < 2) code = `TYPE_${Date.now().toString(36).toUpperCase().slice(-6)}`;

	code = await pickUniqueCode(userId, code);

	const [created] = await db<{ id: string }[]>`
		INSERT INTO wallet_types (user_id, code, label, is_active)
		VALUES (${userId}, ${code}, ${label}, TRUE)
		RETURNING id
	`;

	return json({ id: created.id, code, label }, { status: 201 });
};
