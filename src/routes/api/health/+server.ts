import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		await db`SELECT 1`;
		return json({ status: 'ok', database: 'up', timestamp: new Date().toISOString() });
	} catch {
		throw error(503, 'Koneksi database gagal.');
	}
};
