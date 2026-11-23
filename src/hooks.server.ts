import type { Handle } from '@sveltejs/kit/hooks';
import { sessionCookie, verifySessionToken } from '#lib/server/session';

export const handle: Handle = async ({ event, resolve }) => {
	const payload = verifySessionToken(event.cookies.get(sessionCookie.name));
	event.locals.userId = payload?.uid ?? null;
	return resolve(event);
};
