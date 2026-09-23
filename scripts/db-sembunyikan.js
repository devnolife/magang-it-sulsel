#!/usr/bin/env node
// Menyembunyikan atau menampilkan lagi entri di situs tanpa panel admin. Import tidak pernah
// mengubah kolom `hidden`, jadi entri yang disembunyikan tetap tersembunyi setelah data diperbarui.
import { DEFAULT_DB_PATH, openDb } from '../src/lib/server/db/open.js';

const BANTUAN = `Pemakaian:
  npm run db:sembunyikan -- <slug|id>...              sembunyikan dari situs
  npm run db:sembunyikan -- --tampilkan <slug|id>...  tampilkan lagi
  npm run db:sembunyikan -- --hilang                  sembunyikan semua entri pipeline yang
                                                      tidak ada lagi di data/companies.json
  npm run db:sembunyikan -- --daftar                  daftar entri tersembunyi & yang hilang`;

const args = process.argv.slice(2);
const opsi = new Set(args.filter((a) => a.startsWith('--')));
const target = args.filter((a) => !a.startsWith('--'));
const dikenal = new Set(['--tampilkan', '--hilang', '--daftar', '--help']);
const asing = [...opsi].filter((o) => !dikenal.has(o));

if (
	asing.length ||
	opsi.has('--help') ||
	(!target.length && !opsi.has('--hilang') && !opsi.has('--daftar'))
) {
	if (asing.length) console.error(`✗ opsi tidak dikenal: ${asing.join(', ')}`);
	console.log(BANTUAN);
	process.exit(asing.length || !opsi.has('--help') ? 1 : 0);
}
if (opsi.has('--tampilkan') && (opsi.has('--hilang') || !target.length)) {
	console.error('✗ --tampilkan butuh slug/id dan tidak bisa digabung dengan --hilang');
	process.exit(1);
}

const dbFile = process.env.DATABASE_PATH || DEFAULT_DB_PATH;
const db = openDb(dbFile);
const hidden = opsi.has('--tampilkan') ? 0 : 1;
let gagal = false;

try {
	const set = db.prepare(
		`UPDATE companies SET hidden = @hidden, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
		 WHERE id = @id AND hidden != @hidden`
	);
	const cari = db.prepare('SELECT id, slug, nama, hidden FROM companies WHERE slug = ? OR id = ?');

	db.transaction(() => {
		for (const t of target) {
			const row =
				/** @type {{ id: string, slug: string, nama: string, hidden: number } | undefined} */ (
					cari.get(t, t)
				);
			if (!row) {
				console.error(`✗ tidak ditemukan: ${t}`);
				gagal = true;
				continue;
			}
			const berubah = set.run({ id: row.id, hidden }).changes > 0;
			const aksi = hidden ? 'disembunyikan' : 'ditampilkan';
			console.log(
				`${berubah ? '✓' : '·'} ${row.slug} (${row.nama}) ${berubah ? aksi : `sudah ${aksi}`}`
			);
		}
		if (opsi.has('--hilang')) {
			const rows = /** @type {{ id: string, slug: string, nama: string }[]} */ (
				db
					.prepare(
						`SELECT id, slug, nama FROM companies
						 WHERE missing_from_import = 1 AND origin = 'pipeline' AND hidden = 0 ORDER BY slug`
					)
					.all()
			);
			for (const r of rows) {
				set.run({ id: r.id, hidden: 1 });
				console.log(`✓ ${r.slug} (${r.nama}) disembunyikan: tidak ada lagi di data/companies.json`);
			}
			if (!rows.length) console.log('· tidak ada entri pipeline yang hilang dari import terakhir');
		}
	})();

	if (opsi.has('--daftar')) {
		const rows =
			/** @type {{ slug: string, nama: string, hidden: number, missing_from_import: number }[]} */ (
				db
					.prepare(
						`SELECT slug, nama, hidden, missing_from_import FROM companies
					 WHERE hidden = 1 OR missing_from_import = 1 ORDER BY hidden DESC, slug`
					)
					.all()
			);
		if (!rows.length) console.log('· tidak ada entri tersembunyi atau hilang dari import');
		for (const r of rows) {
			const tanda = [
				r.hidden ? 'tersembunyi' : 'tampil',
				r.missing_from_import ? 'hilang dari JSON' : null
			]
				.filter(Boolean)
				.join(', ');
			console.log(`  ${r.slug}  ${r.nama}  [${tanda}]`);
		}
	}
} finally {
	db.close();
}

if (gagal) process.exit(1);
