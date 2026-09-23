import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REPO_URL, urlCariIsu, urlIsu } from './isu.js';

describe('isu GitHub', () => {
	it('urlIsu memilih templat dan mengisi kolom teks', () => {
		const u = new URL(
			urlIsu('koreksi-data', {
				judul: 'Koreksi: PT A&B',
				isian: { tempat: 'PT A&B (https://x.test/perusahaan/a-b)', kosong: '' }
			})
		);
		expect(`${u.origin}${u.pathname}`).toBe(`${REPO_URL}/issues/new`);
		expect(Object.fromEntries(u.searchParams)).toEqual({
			template: 'koreksi-data.yml',
			title: 'Koreksi: PT A&B',
			tempat: 'PT A&B (https://x.test/perusahaan/a-b)'
		});
	});

	it('kolom yang diisi otomatis memang ada di templatnya', () => {
		const yml = readFileSync(
			new URL('../../.github/ISSUE_TEMPLATE/koreksi-data.yml', import.meta.url),
			'utf8'
		);
		expect(yml).toMatch(/^\s+id: tempat$/m);
		const cerita = readFileSync(
			new URL('../../.github/ISSUE_TEMPLATE/cerita-magang.yml', import.meta.url),
			'utf8'
		);
		expect(cerita).toMatch(/^\s+id: tempat$/m);
		expect(cerita).toMatch(/^title: 'Cerita magang: '$/m);
	});

	it('urlCariIsu membuang tanda kutip dari nama', () => {
		const u = new URL(urlCariIsu('Cerita magang:', 'Toko "Maju"'));
		expect(u.searchParams.get('q')).toBe('is:issue in:title "Cerita magang: Toko Maju"');
	});
});
