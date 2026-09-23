#!/usr/bin/env node
// npm run db:migrate — terapkan migrasi skema ke DATABASE_PATH (default ./var/app.db).
import { DEFAULT_DB_PATH, openDb } from '../src/lib/server/db/open.js';
import { migrate } from '../src/lib/server/db/migrations.js';

const file = process.env.DATABASE_PATH || DEFAULT_DB_PATH;
const db = openDb(file, { migrate: false });
const applied = migrate(db);
const version = db.pragma('user_version', { simple: true });
db.close();
console.log(
	applied.length
		? `✓ ${file}: migrasi ${applied.join(', ')} diterapkan (versi skema ${version})`
		: `✓ ${file}: skema sudah terbaru (versi ${version})`
);
