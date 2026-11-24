import { createHmac, timingSafeEqual } from 'node:crypto';
import { error } from '@sveltejs/kit';
import { AUTH_SECRET } from '$app/env/private';

/** Kembalikan userId dari session, atau lempar 401. */
export function requireUserId(locals: App.Locals): string {
	if (!locals.userId) throw error(401, { message: 'Silakan login terlebih dahulu.', code: 'E_UNAUTHORIZED' });
	if (locals.isBlocked) {
		throw error(403, { message: 'Akun Anda diblokir oleh admin.', code: 'E_BLOCKED' });
	}
	return locals.userId;
}

/** Kembalikan userId yang punya role admin, atau lempar 401/403. */
export function requireAdmin(locals: App.Locals): string {
	const userId = requireUserId(locals);
	if (locals.userRole !== 'admin') {
		throw error(403, { message: 'Akses khusus admin.', code: 'E_FORBIDDEN' });
	}
	return userId;
}

const SESSION_COOKIE = 'fa_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 hari

interface SessionPayload {
	uid: string;
	exp: number;
}

function getSecret(): string {
	if (AUTH_SECRET) return AUTH_SECRET;
	// Secret khusus pengembangan — di produksi WAJIB mengisi AUTH_SECRET.
	if (import.meta.env.DEV) return 'dev-only-insecure-secret';
	throw new Error('AUTH_SECRET belum diisi. Tambahkan env var AUTH_SECRET (string acak minimal 32 karakter).');
}

function sign(data: string): string {
	return createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export function createSessionToken(userId: string): string {
	const payload: SessionPayload = {
		uid: userId,
		exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
	};
	const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
	return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
	if (!token) return null;
	const [body, signature] = token.split('.');
	if (!body || !signature) return null;

	const expected = Buffer.from(sign(body));
	const received = Buffer.from(signature);
	if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
		return null;
	}

	try {
		const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload;
		if (!payload.uid || payload.exp < Math.floor(Date.now() / 1000)) return null;
		return payload;
	} catch {
		return null;
	}
}

export const sessionCookie = {
	name: SESSION_COOKIE,
	/** Opsi cookie httpOnly + signed untuk `event.cookies.set`. */
	options: {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: !import.meta.env.DEV,
		maxAge: SESSION_TTL_SECONDS
	}
};
