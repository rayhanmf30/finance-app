import type { Handle } from '@sveltejs/kit/hooks';
import { sessionCookie, verifySessionToken } from '#lib/server/session';
import { db } from '#lib/server/db';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.userRole = 'user';
	event.locals.isBlocked = false;
	event.locals.userId = null;

	const payload = verifySessionToken(event.cookies.get(sessionCookie.name));
	if (payload) {
		// Satu query PK per request: dapatkan role + status blokir terbaru
		// (blokir berlaku seketika tanpa menunggu session kedaluwarsa).
		const rows = await db`
			SELECT role, is_blocked
			FROM users
			WHERE id = ${payload.uid}
		`;
		if (rows.length > 0) {
			event.locals.userId = payload.uid;
			event.locals.userRole = rows[0].role;
			event.locals.isBlocked = rows[0].is_blocked;
		}
	}

	return resolve(event);
};
