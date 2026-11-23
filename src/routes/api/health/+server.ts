import { json } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { DB_HOST, DB_PORT } from '$app/env/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		await db`SELECT 1`;
		return json({ status: 'ok', database: 'up', timestamp: new Date().toISOString() });
	} catch (err) {
		// Detail error (kode + pesan) dikirim untuk mempermudah diagnosis koneksi.
		// Tidak ada kredensial yang ikut tampil.
		const e = err as { code?: string; errno?: string; message?: string };
		return json(
			{
				status: 'error',
				database: 'down',
				host: DB_HOST ?? '(tidak diisi)',
				port: DB_PORT ?? '(tidak diisi)',
				errorCode: e.code ?? e.errno ?? null,
				errorMessage: e.message ?? 'unknown error'
			},
			{ status: 503 }
		);
	}
};
