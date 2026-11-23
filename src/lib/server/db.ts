import postgres from 'postgres';
import { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_SSL, DB_USER } from '$app/env/private';

/**
 * Konfigurasi koneksi memakai env variable terpisah (DB_HOST, DB_PORT, dst.)
 * agar mudah diisi dari dashboard Vercel. Bila tidak diisi, nilainya mengikuti
 * default `docker compose up db` (dev lokal).
 *
 * SSL diaktifkan otomatis untuk host non-lokal (mis. Supabase):
 * - DB_SSL tidak diisi  -> 'require' kecuali host localhost/127.0.0.1
 * - DB_SSL=disable      -> tanpa SSL (khusus Postgres lokal tanpa SSL)
 * - DB_SSL=require      -> selalu SSL
 */
const host = DB_HOST ?? 'localhost';
const isLocalHost = host === 'localhost' || host === '127.0.0.1';
const useSsl = DB_SSL === 'require' || (!DB_SSL && !isLocalHost);

export const db = postgres({
	host,
	port: DB_PORT ?? 5432,
	user: DB_USER ?? 'financeapp',
	password: DB_PASSWORD ?? 'financeapp',
	database: DB_NAME ?? 'finance_app',
	ssl: useSsl ? 'require' : false,
	// Wajib false untuk transaction pooler Supabase (PgBouncer).
	prepare: false
});
