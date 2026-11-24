import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireAdmin } from '#lib/server/session';
import type { RequestHandler } from './$types';

interface WalletTypeRow {
	code: string;
	label: string;
	is_active: boolean;
	wallet_count: number;
}

export const GET: RequestHandler = async ({ locals, url }) => {
	requireAdmin(locals);

	const query = (url.searchParams.get('q') ?? '').trim();
	const pattern = `%${query}%`;

	const rows = await db<WalletTypeRow[]>`
		SELECT wt.code, wt.label, wt.is_active,
			(SELECT count(*) FROM wallets w WHERE w.type = wt.id)::int AS wallet_count
		FROM wallet_types wt
		WHERE wt.user_id IS NULL -- admin hanya mengelola tipe global
			AND (${query} = ''
				OR wt.code ILIKE ${pattern}
				OR wt.label ILIKE ${pattern})
		ORDER BY wt.code
	`;

	return json(
		rows.map((r) => ({
			code: r.code,
			label: r.label,
			isActive: r.is_active,
			walletCount: r.wallet_count
		}))
	);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	requireAdmin(locals);

	const body = (await request.json().catch(() => null)) as {
		code?: string;
		label?: string;
	} | null;
	if (!body) throw error(400, 'Body harus JSON.');

	const code = (body.code ?? '').trim().toUpperCase();
	const label = (body.label ?? '').trim();

	if (!/^[A-Z0-9_]{2,20}$/.test(code)) {
		throw error(400, 'Kode tipe dompet wajib 2-20 karakter (huruf besar, angka, underscore).');
	}
	if (label.length < 2 || label.length > 50) {
		throw error(400, 'Label wajib 2-50 karakter.');
	}

	const existing = await db`SELECT 1 FROM wallet_types WHERE code = ${code}`;
	if (existing.length > 0) throw error(409, `Tipe dompet "${code}" sudah ada.`);

	await db`
		INSERT INTO wallet_types (code, label)
		VALUES (${code}, ${label})
	`;
	return json({ code, label }, { status: 201 });
};
