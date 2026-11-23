import { json } from '@sveltejs/kit';
import { sessionCookie } from '#lib/server/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete(sessionCookie.name, { path: '/' });
	return json({ status: 'ok' });
};
