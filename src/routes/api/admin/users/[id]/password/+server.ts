import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireAdmin } from '#lib/server/session';
import { hashPassword, validatePassword } from '#lib/server/auth';
import type { RequestHandler } from './$types';

/**
 * Admin mengatur ulang password akun (mis. lupa password atau bagian
 * penanganan pelanggaran). Tidak memerlukan password lama.
 */
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	requireAdmin(locals);

	const body = (await request.json().catch(() => null)) as { newPassword?: string } | null;
	if (!body) throw error(400, 'Body harus JSON.');

	const newPassword = body.newPassword ?? '';
	if (!validatePassword(newPassword)) {
		throw error(400, 'Password minimal 8 karakter dan mengandung huruf serta angka.');
	}

	const rows = await db`
		UPDATE users
		SET password_hash = ${hashPassword(newPassword)}
		WHERE id = ${params.id}
		RETURNING id, name, email
	`;
	if (rows.length === 0) throw error(404, 'Akun tidak ditemukan.');

	return json({ status: 'updated', id: rows[0].id });
};
