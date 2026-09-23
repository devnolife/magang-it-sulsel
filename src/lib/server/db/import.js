// Upsert data/companies.json ke SQLite. Aturan:
// - field di `locked_fields` (hasil edit admin) tidak pernah ditimpa;
// - `hidden` tidak pernah diubah; perusahaan origin=mahasiswa tidak disentuh;
// - tidak ada yang dihapus: id yang hilang dari JSON hanya ditandai & dilaporkan.
import { MAGANG_RE } from '../../shared/magang-status.js';
import { uniqueSlug } from '../../shared/slug.js';

/** Kolom `companies` yang berasal dari kontrak data. */
export const CONTRACT_FIELDS = /** @type {const} */ ([
	'slug',
	'nama',
	'jenis',
	'tags',
	'deskripsi',
	'alamat',
	'kabkota',
	'kecamatan',
	'lat',
	'lng',
	'telepon',
	'whatsapp',
	'email',
	'website',
	'instagram',
	'linkedin',
	'url_karir',
	'maps_url',
	'osm_url',
	'rating',
	'jumlah_ulasan',
	'status_web',
	'peringatan',
	'magang_bukti',
	'sumber',
	'source_keys',
	'klasifikasi',
	'diperbarui_pada'
]);

export const JSON_FIELDS = new Set([
	'tags',
	'magang_bukti',
	'sumber',
	'source_keys',
	'klasifikasi'
]);

/** Masa berlaku lowongan dari pipeline bila tanggal tutup tidak diketahui. */
export const PIPELINE_OPENING_DAYS = 45;

/**
 * @param {string} isoDate
 * @param {number} days
 */
export function addDays(isoDate, days) {
	const d = new Date(`${isoDate}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

/**
 * @param {import('../../shared/company-schema.js').CompanyRecord} c
 * @returns {Record<string, string | number | null>}
 */
export function toRow(c) {
	/** @type {Record<string, string | number | null>} */
	const row = {};
	const rec = /** @type {Record<string, unknown>} */ (c);
	for (const f of CONTRACT_FIELDS) {
		const v = rec[f];
		if (JSON_FIELDS.has(f)) row[f] = v == null ? null : JSON.stringify(v);
		else row[f] = v == null ? null : /** @type {string | number} */ (v);
	}
	if (row.tags == null) row.tags = '[]';
	if (row.magang_bukti == null) row.magang_bukti = '[]';
	if (row.sumber == null) row.sumber = '[]';
	if (row.source_keys == null) row.source_keys = '{}';
	return row;
}

/**
 * @typedef {{
 *   total: number, inserted: number, updated: number, unchanged: number,
 *   lockedSkips: { id: string, field: string }[], slugConflicts: { id: string, wanted: string, got: string }[],
 *   skippedMahasiswa: number, openings: number, missing: { id: string, nama: string }[]
 * }} ImportReport
 */

/**
 * @param {import('better-sqlite3').Database} db
 * @param {import('../../shared/company-schema.js').Dataset} dataset hasil parseDataset()
 * @param {{ today?: string, hash?: string | null }} [opts]
 * @returns {ImportReport}
 */
export function importDataset(db, dataset, opts = {}) {
	const today = opts.today || new Date().toISOString().slice(0, 10);
	/** @type {ImportReport} */
	const report = {
		total: dataset.perusahaan.length,
		inserted: 0,
		updated: 0,
		unchanged: 0,
		lockedSkips: [],
		slugConflicts: [],
		skippedMahasiswa: 0,
		openings: 0,
		missing: []
	};
	const cols = CONTRACT_FIELDS.join(', ');
	const insert = db.prepare(
		`INSERT INTO companies (id, origin, ${cols}) VALUES (@id, 'pipeline', ${CONTRACT_FIELDS.map((c) => '@' + c).join(', ')})`
	);
	const getById = db.prepare('SELECT * FROM companies WHERE id = ?');
	const slugOwner = db.prepare('SELECT id FROM companies WHERE slug = ?').pluck();
	const delOpenings = db.prepare(
		`DELETE FROM openings WHERE company_id = ? AND sumber = 'pipeline'`
	);
	const addOpening = db.prepare(
		`INSERT INTO openings (company_id, judul, url, sumber, sumber_detail, is_magang, ditemukan_pada, tutup_pada, kedaluwarsa_pada)
		 VALUES (?, ?, ?, 'pipeline', ?, ?, ?, ?, ?)`
	);

	db.transaction(() => {
		const seen = new Set();
		for (const c of dataset.perusahaan) {
			seen.add(c.id);
			const row = toRow(c);
			/** @type {Record<string, any> | undefined} */
			const existing = getById.get(c.id);
			if (!existing) {
				const wanted = /** @type {string} */ (row.slug);
				if (slugOwner.get(wanted)) {
					row.slug = uniqueSlug(wanted, (s) => !!slugOwner.get(s));
					report.slugConflicts.push({ id: c.id, wanted, got: /** @type {string} */ (row.slug) });
				}
				insert.run({ id: c.id, ...row });
				report.inserted++;
			} else if (existing.origin === 'mahasiswa') {
				report.skippedMahasiswa++;
				continue;
			} else {
				const locked = new Set(JSON.parse(existing.locked_fields || '[]'));
				/** @type {Record<string, string | number | null>} */
				const changes = {};
				for (const f of CONTRACT_FIELDS) {
					if (existing[f] === row[f]) continue;
					if (locked.has(f)) {
						report.lockedSkips.push({ id: c.id, field: f });
						continue;
					}
					changes[f] = row[f];
				}
				if (changes.slug != null) {
					const owner = slugOwner.get(changes.slug);
					if (owner && owner !== c.id) {
						report.slugConflicts.push({
							id: c.id,
							wanted: String(changes.slug),
							got: existing.slug
						});
						delete changes.slug;
					}
				}
				const keys = Object.keys(changes);
				if (keys.length) {
					db.prepare(
						`UPDATE companies SET ${keys.map((k) => `${k} = @${k}`).join(', ')},
						 missing_from_import = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = @id`
					).run({ ...changes, id: c.id });
					report.updated++;
				} else {
					if (existing.missing_from_import) {
						db.prepare('UPDATE companies SET missing_from_import = 0 WHERE id = ?').run(c.id);
					}
					report.unchanged++;
				}
			}
			delOpenings.run(c.id);
			for (const l of c.lowongan || []) {
				const exp = l.tutup_pada || addDays(l.ditemukan_pada, PIPELINE_OPENING_DAYS);
				const magang = MAGANG_RE.test(l.judul) ? 1 : 0;
				addOpening.run(
					c.id,
					l.judul,
					l.url,
					l.sumber,
					magang,
					l.ditemukan_pada,
					l.tutup_pada ?? null,
					exp
				);
				report.openings++;
			}
		}
		/** @type {{ id: string, nama: string }[]} */
		const pipelineRows = /** @type {any} */ (
			db.prepare(`SELECT id, nama FROM companies WHERE origin = 'pipeline'`).all()
		);
		const markMissing = db.prepare('UPDATE companies SET missing_from_import = 1 WHERE id = ?');
		for (const r of pipelineRows) {
			if (!seen.has(r.id)) {
				report.missing.push(r);
				markMissing.run(r.id);
			}
		}
		const setMeta = db.prepare(
			'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value'
		);
		setMeta.run('last_import_at', new Date().toISOString());
		setMeta.run('last_import_dataset', dataset.dibuat_pada);
		setMeta.run('last_import_count', String(report.total));
		if (opts.hash) setMeta.run('last_import_hash', opts.hash);
	})();
	return report;
}
