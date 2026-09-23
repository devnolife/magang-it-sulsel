import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CompanySchema, parseDataset } from './company-schema.js';

const sample = JSON.parse(
	readFileSync(new URL('../../../tests/fixtures/companies.sample.json', import.meta.url), 'utf8')
);

describe('company-schema', () => {
	it('menerima dataset contoh', () => {
		const data = parseDataset(sample);
		expect(data.perusahaan).toHaveLength(6);
		expect(data.perusahaan[1].tags).toEqual(['internet']);
	});

	it('menolak jenis, kab/kota, dan URL yang salah', () => {
		const bad = {
			...sample.perusahaan[0],
			jenis: 'servis',
			kabkota: 'jakarta',
			website: 'javascript:alert(1)'
		};
		const result = CompanySchema.safeParse(bad);
		expect(result.success).toBe(false);
		const paths = result.error?.issues.map((i) => i.path[0]);
		expect(paths).toEqual(expect.arrayContaining(['jenis', 'kabkota', 'website']));
	});

	it('mendeteksi id ganda dan jumlah yang tidak cocok', () => {
		const dup = { ...sample, jumlah: 2, perusahaan: [sample.perusahaan[0], sample.perusahaan[0]] };
		expect(() => parseDataset(dup)).toThrow(/id ganda/);
		const wrongCount = { ...sample, jumlah: 99 };
		expect(() => parseDataset(wrongCount)).toThrow(/jumlah/);
	});
});
