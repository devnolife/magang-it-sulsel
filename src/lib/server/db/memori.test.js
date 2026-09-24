import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listCompanies, parseFilters } from '../companies.js';
import { bukaDbMemori } from './memori.js';

const dataset = JSON.parse(
	readFileSync(new URL('../../../../data/companies.json', import.meta.url), 'utf8')
);

describe('bukaDbMemori (hosting tanpa disk, mis. Vercel)', () => {
	it('memuat seluruh dataset dan pencarian FTS berjalan', () => {
		const db = bukaDbMemori();
		const semua = listCompanies(db, parseFilters(new URLSearchParams('')));
		expect(semua.total).toBe(dataset.jumlah);
		const cari = listCompanies(db, parseFilters(new URLSearchParams('q=software&kab=makassar')));
		expect(cari.total).toBeGreaterThan(0);
		expect(cari.total).toBeLessThan(semua.total);
		db.close();
	});
});
