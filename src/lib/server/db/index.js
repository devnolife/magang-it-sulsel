import { env } from '$env/dynamic/private';
import { DEFAULT_DB_PATH, openDb } from './open.js';

/** @type {import('better-sqlite3').Database | undefined} */
let instance;

/**
 * Dipanggil hook `init` sebelum request pertama. Di Vercel (VERCEL=1, tanpa DATABASE_PATH) atau bila
 * DATABASE_PATH=:memory:, basis data dibangun di memori dari data/companies.json.
 */
export async function siapkanDb() {
	const memori = env.DATABASE_PATH === ':memory:' || (!env.DATABASE_PATH && Boolean(env.VERCEL));
	if (instance || !memori) return;
	const { bukaDbMemori } = await import('./memori.js');
	instance = bukaDbMemori();
}

/** Koneksi tunggal untuk server (migrasi otomatis saat pertama dibuka). */
export function getDb() {
	if (!instance) instance = openDb(env.DATABASE_PATH || DEFAULT_DB_PATH);
	return instance;
}
