import { env } from '$env/dynamic/private';
import { DEFAULT_DB_PATH, openDb } from './open.js';

/** @type {import('better-sqlite3').Database | undefined} */
let instance;

/** Koneksi tunggal untuk server (migrasi otomatis saat pertama dibuka). */
export function getDb() {
	if (!instance) instance = openDb(env.DATABASE_PATH || DEFAULT_DB_PATH);
	return instance;
}
