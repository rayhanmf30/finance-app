import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireAdmin } from '#lib/server/session';
import type { RequestHandler } from './$types';

interface AdminUserRow {
	id: string;
	name: string;
	email: string;
	role: 'user' | 'admin';
	is_blocked: boolean;
	block_reason: string | null;
}

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const adminId = requireAdmin(locals);

	const body = (await request.json().catch(() => null)) as {
		isBlocked?: boolean;
		blockReason?: string;
		role?: 'user' | 'admin';
	} | null;
	if (!body) throw error(400, 'Body harus JSON.');

	if (params.id === adminId) {
		// Admin tidak boleh memblokir/menurunkan dirinya sendiri (menghindari lockout).
		if (body.isBlocked) throw error(400, 'Tidak bisa memblokir akun sendiri.');
		if (body.role === 'user') throw error(400, 'Tidak bisa mencabut role admin sendiri.');
		if (body.role === 'admin') throw error(400, 'Anda sudah menjadi admin.');
	}

	const fields: string[] = [];
	const values: any[] = [];
	if (typeof body.isBlocked === 'boolean') {
		values.push(body.isBlocked);
		fields.push(`is_blocked = $${values.length}`);
		values.push(body.isBlocked ? (body.blockReason ?? '').trim() || 'Melanggar ketentuan penggunaan.' : null);
		fields.push(`block_reason = $${values.length}`);
	}
	if (body.role && ['user', 'admin'].includes(body.role)) {
		values.push(body.role);
		fields.push(`role = $${values.length}`);
	}
	if (fields.length === 0) throw error(400, 'Tidak ada perubahan yang dikirim.');

	values.push(params.id);
	const rows = await db.unsafe<AdminUserRow[]>(
		`UPDATE users
		 SET ${fields.join(', ')}
		 WHERE id = $${values.length}
		 RETURNING id, name, email, role, is_blocked, block_reason`,
		values
	);
	if (rows.length === 0) throw error(404, 'Akun tidak ditemukan.');

	const u = rows[0];
	return json({
		id: u.id,
		name: u.name,
		email: u.email,
		role: u.role,
		isBlocked: u.is_blocked,
		blockReason: u.block_reason
	});
};
