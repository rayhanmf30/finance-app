import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { requireAdmin } from '#lib/server/session';
import { validateEmail } from '#lib/server/auth';
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
		name?: string;
		email?: string;
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
	if (typeof body.name === 'string') {
		const name = body.name.trim();
		if (name.length < 2 || name.length > 150) {
			throw error(400, 'Nama wajib diisi (2-150 karakter).');
		}
		values.push(name);
		fields.push(`name = $${values.length}`);
	}
	if (typeof body.email === 'string') {
		const email = body.email.trim().toLowerCase();
		if (!validateEmail(email)) {
			throw error(400, 'Format email tidak valid.');
		}
		values.push(email);
		fields.push(`email = $${values.length}`);
	}
	if (fields.length === 0) throw error(400, 'Tidak ada perubahan yang dikirim.');

	values.push(params.id);
	let rows: AdminUserRow[];
	try {
		rows = await db.unsafe<AdminUserRow[]>(
			`UPDATE users
			 SET ${fields.join(', ')}
			 WHERE id = $${values.length}
			 RETURNING id, name, email, role, is_blocked, block_reason`,
			values
		);
	} catch (err) {
		if ((err as { code?: string }).code === '23505') {
			throw error(409, 'Email sudah dipakai akun lain.');
		}
		throw err;
	}
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

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const adminId = requireAdmin(locals);

	if (params.id === adminId) {
		throw error(400, 'Tidak bisa menghapus akun sendiri.');
	}

	const rows = await db`DELETE FROM users WHERE id = ${params.id} RETURNING id`;
	if (rows.length === 0) throw error(404, 'Akun tidak ditemukan.');

	return new Response(null, { status: 204 });
};
