// Membuka koneksi SQLite. Dipakai app (lewat index.js) dan script Node, jadi jangan import $env di sini.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { migrate } from './migrations.js';

/**
 * @param {string} file path file SQLite atau ':memory:'
 * @param {{ migrate?: boolean }} [opts]
 * @returns {import('better-sqlite3').Database}
 */
export function openDb(file, opts = {}) {
	if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
	const db = new Database(file);
	db.pragma('journal_mode = WAL');
	db.pragma('synchronous = NORMAL');
	db.pragma('foreign_keys = ON');
	db.pragma('busy_timeout = 5000');
	if (opts.migrate !== false) migrate(db);
	return db;
}

export const DEFAULT_DB_PATH = './var/app.db';
