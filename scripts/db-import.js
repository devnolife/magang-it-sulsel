#!/usr/bin/env node
// npm run db:import [-- path/ke/companies.json]  (default data/companies.json)
import crypto from 'node:crypto';
import fs from 'node:fs';
import { importDataset } from '../src/lib/server/db/import.js';
import { DEFAULT_DB_PATH, openDb } from '../src/lib/server/db/open.js';
import { parseDataset } from '../src/lib/shared/company-schema.js';

const file = process.argv[2] || 'data/companies.json';
const dbFile = process.env.DATABASE_PATH || DEFAULT_DB_PATH;

const raw = fs.readFileSync(file, 'utf8');
let dataset;
try {
	dataset = parseDataset(JSON.parse(raw));
} catch (err) {
	console.error(`✗ ${file}: ${err instanceof Error ? err.message : err}`);
	process.exit(1);
}

const db = openDb(dbFile);
const hash = crypto.createHash('sha256').update(raw).digest('hex');
const r = importDataset(db, dataset, { hash });
db.close();

console.log(`✓ Import ${file} -> ${dbFile}`);
console.log(
	`  ${r.total} perusahaan: ${r.inserted} baru, ${r.updated} diperbarui, ${r.unchanged} tetap; ${r.openings} lowongan pipeline`
);
if (r.lockedSkips.length) {
	console.log(`  ${r.lockedSkips.length} field dilewati karena dikunci admin:`);
	for (const s of r.lockedSkips.slice(0, 20)) console.log(`    - ${s.id}.${s.field}`);
}
for (const s of r.slugConflicts) console.log(`  ! slug bentrok ${s.id}: ${s.wanted} -> ${s.got}`);
if (r.skippedMahasiswa)
	console.log(`  ${r.skippedMahasiswa} perusahaan usulan mahasiswa tidak disentuh`);
if (r.missing.length) {
	console.log(
		`  ! ${r.missing.length} perusahaan pipeline tidak ada lagi di JSON (masih tampil; sembunyikan dengan \`npm run db:sembunyikan -- --hilang\`):`
	);
	for (const m of r.missing.slice(0, 30)) console.log(`    - ${m.id} ${m.nama}`);
}
