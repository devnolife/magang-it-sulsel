import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDataset } from '../../shared/company-schema.js';
import { getCompanyBySlug, listCompanies, parseFilters, toFtsQuery } from '../companies.js';
import { addDays, importDataset } from './import.js';
import { MIGRATIONS, migrate } from './migrations.js';
import { openDb } from './open.js';

const sample = parseDataset(
	JSON.parse(
		readFileSync(
			new URL('../../../../tests/fixtures/companies.sample.json', import.meta.url),
			'utf8'
		)
	)
);

function freshDb() {
	const db = openDb(':memory:');
	importDataset(db, sample, { today: '2026-09-23' });
	return db;
}

const f = (/** @type {string} */ qs) => parseFilters(new URLSearchParams(qs));

describe('db: migrasi & import', () => {
	it('migrasi idempoten dan versi naik', () => {
		const db = openDb(':memory:');
		expect(db.pragma('user_version', { simple: true })).toBe(MIGRATIONS.at(-1)?.version);
		expect(migrate(db)).toEqual([]);
	});

	it('import awal lalu ulang tanpa perubahan', () => {
		const db = openDb(':memory:');
		const r1 = importDataset(db, sample, { today: '2026-09-23' });
		expect(r1).toMatchObject({ inserted: 6, updated: 0, openings: 1 });
		const r2 = importDataset(db, sample, { today: '2026-09-23' });
		expect(r2).toMatchObject({ inserted: 0, updated: 0, unchanged: 6 });
	});

	it('menghormati locked_fields, hidden, dan origin mahasiswa', () => {
		const db = freshDb();
		db.prepare(
			`UPDATE companies SET nama = 'Nama Admin', locked_fields = '["nama"]', hidden = 1 WHERE id = 'c_contoh02'`
		).run();
		db.prepare(
			`INSERT INTO companies (id, slug, nama, jenis, kabkota, origin) VALUES ('c_mhs00001', 'usulan-mhs', 'Usulan', 'software', 'makassar', 'mahasiswa')`
		).run();
		const changed = structuredClone(sample);
		changed.perusahaan[1].nama = 'Nama Pipeline Baru';
		changed.perusahaan[1].telepon = '+62411999999';
		const r = importDataset(db, changed, { today: '2026-09-23' });
		expect(r.updated).toBe(1);
		expect(r.lockedSkips).toEqual([{ id: 'c_contoh02', field: 'nama' }]);
		const row = /** @type {any} */ (
			db.prepare(`SELECT * FROM companies WHERE id = 'c_contoh02'`).get()
		);
		expect(row).toMatchObject({ nama: 'Nama Admin', telepon: '+62411999999', hidden: 1 });
		const mhs = db.prepare(`SELECT nama FROM companies WHERE id = 'c_mhs00001'`).pluck().get();
		expect(mhs).toBe('Usulan');
	});

	it('tidak menghapus perusahaan yang hilang dari JSON, hanya melaporkan', () => {
		const db = freshDb();
		const smaller = { ...sample, jumlah: 5, perusahaan: sample.perusahaan.slice(1) };
		const r = importDataset(db, smaller, { today: '2026-09-23' });
		expect(r.missing.map((m) => m.id)).toEqual(['c_contoh01']);
		const row = /** @type {any} */ (
			db.prepare(`SELECT missing_from_import, hidden FROM companies WHERE id = 'c_contoh01'`).get()
		);
		expect(row).toEqual({ missing_from_import: 1, hidden: 0 });
	});

	it('slug bentrok dengan perusahaan lain diberi akhiran', () => {
		const db = openDb(':memory:');
		db.prepare(
			`INSERT INTO companies (id, slug, nama, jenis, kabkota, origin) VALUES ('c_mhs00001', 'contoh-net-gowa', 'X', 'isp', 'gowa', 'mahasiswa')`
		).run();
		const r = importDataset(db, sample, { today: '2026-09-23' });
		expect(r.slugConflicts).toEqual([
			{ id: 'c_contoh02', wanted: 'contoh-net-gowa', got: 'contoh-net-gowa-2' }
		]);
	});

	it('addDays', () => {
		expect(addDays('2026-09-23', 45)).toBe('2026-11-07');
	});
});

describe('db: query publik', () => {
	it('toFtsQuery aman dari sintaks FTS', () => {
		expect(toFtsQuery('Software "house" OR*')).toBe('"software"* "house"* "or"*');
		expect(toFtsQuery('  -- ')).toBeNull();
	});

	it('pencarian FTS prefix + facet', () => {
		const db = freshDb();
		const r = listCompanies(db, f('q=softw'), { today: '2026-09-23' });
		expect(r.items.map((i) => i.id)).toEqual(['c_contoh01']);
		const all = listCompanies(db, f(''), { today: '2026-09-23' });
		expect(all.total).toBe(6);
		expect(all.facets.kab).toMatchObject({ makassar: 3, gowa: 1, parepare: 1, palopo: 1 });
		// bukti magang di atas; lowongan berjudul "Magang ..." = terbukti
		expect(all.items[0].id).toBe('c_contoh01');
		expect(all.items[0]).toMatchObject({ magang: 'terbukti', lowongan_aktif: 1 });
	});

	it('filter kab + jenis, facet mengabaikan dimensinya sendiri', () => {
		const db = freshDb();
		const r = listCompanies(db, f('kab=makassar&jenis=agency'), { today: '2026-09-23' });
		expect(r.items.map((i) => i.id)).toEqual(['c_contoh03']);
		expect(r.facets.jenis).toMatchObject({ software: 1, agency: 1, startup: 1 });
		expect(r.facets.kab).toMatchObject({ makassar: 1 });
	});

	it('website dibajak/mati tidak ditautkan di kartu', () => {
		const db = freshDb();
		const r = listCompanies(db, f('q=contoh'), { today: '2026-09-23' });
		const hijacked = r.items.find((i) => i.id === 'c_contoh03');
		expect(hijacked).toMatchObject({ website: null, status_web: 'dibajak', peringatan: true });
	});

	it('filter lowongan aktif & kedaluwarsa', () => {
		const db = freshDb();
		expect(listCompanies(db, f('lowongan=1'), { today: '2026-09-23' }).total).toBe(1);
		expect(listCompanies(db, f('lowongan=1'), { today: '2100-01-01' }).total).toBe(0);
	});

	it('detail: hidden tidak tampil, bukti & status magang', () => {
		const db = freshDb();
		const d = getCompanyBySlug(db, 'dinas-kominfo-contoh-parepare', { today: '2026-09-23' });
		expect(d?.magang).toBe('indikasi');
		db.prepare(`UPDATE companies SET hidden = 1 WHERE id = 'c_contoh04'`).run();
		expect(getCompanyBySlug(db, 'dinas-kominfo-contoh-parepare')).toBeNull();
	});

	it('parseFilters membuang nilai tak dikenal', () => {
		expect(f('kab=makassar,jakarta&jenis=servis&magang=terbukti&urut=aneh')).toEqual({
			q: '',
			kab: ['makassar'],
			jenis: [],
			magang: ['terbukti'],
			lowongan: false,
			urut: 'relevansi'
		});
	});
});
