import { describe, expect, it } from 'vitest';
import { parseJsonLonggar } from '../lib/shim.js';
import { cariOverride, klasifikasikan } from './classify.js';

/**
 * @param {Record<string, any>} p
 * @returns {import('./merge.js').Kandidat}
 */
const kandidat = (p) =>
	/** @type {any} */ ({
		kategori: [],
		website: null,
		jumlah_ulasan: null,
		seed: null,
		anggota: [p.key],
		...p,
		nama_asli: p.nama
	});

const web = (/** @type {Record<string, any>} */ p) => ({
	url: 'https://beta.id/',
	status: 'aktif',
	dicek: true,
	judul: null,
	deskripsi: null,
	...p
});

describe('klasifikasikan', () => {
	const A = kandidat({
		key: 'maps:a',
		nama: 'PT Alpha Software',
		kategori: ['Perusahaan Software']
	});
	const B = kandidat({
		key: 'maps:b',
		nama: 'Beta Digital',
		kategori: ['Kantor Perusahaan'],
		website: 'https://beta.id/'
	});
	const C = kandidat({
		key: 'maps:c',
		nama: 'Gamma Tech',
		kategori: ['Perusahaan Software'],
		seed: { key: 'kurasi:gamma', asal: 'kurasi', masuk: false, jenis: 'software' }
	});
	const D = kandidat({
		key: 'maps:d',
		nama: 'Toko Delta Komputer',
		kategori: ['Toko Komputer'],
		website: 'https://www.delta.id/'
	});

	it('urutan: override > seed > aturan; ragu tanpa AI masuk review', () => {
		const hasil = klasifikasikan([A, B, C, D], {
			overrides: { 'delta.id': { masuk: true, jenis: 'konsultan', alasan: 'dicek manual' } }
		});
		expect(hasil.map((d) => [d.key, d.masuk, d.metode, d.jenis, d.review])).toEqual([
			['maps:a', true, 'aturan', 'software', false],
			['maps:b', false, 'aturan', 'software', true],
			['maps:c', false, 'manual', 'software', false],
			['maps:d', true, 'manual', 'konsultan', false]
		]);
		expect(hasil[3].alasan).toBe('dicek manual');
		expect(hasil[1].putusan_aturan).toBe('ragu');
	});

	it('teks website hanya dihitung bila website aktif & terbaca; AI memutus kasus ragu', () => {
		const judul = 'Beta Digital - Jasa Pembuatan Aplikasi Android';
		const aktif = klasifikasikan([B], {
			enriched: { situs: { 'beta.id': /** @type {any} */ (web({ judul })) } }
		});
		expect(aktif[0]).toMatchObject({ masuk: true, metode: 'aturan', skor: 4 });

		const dibajak = klasifikasikan([B], {
			enriched: { situs: { 'beta.id': /** @type {any} */ (web({ judul, status: 'dibajak' })) } },
			ai: new Map([['maps:b', { masuk: true, jenis: 'agency', alasan: 'agensi digital' }]])
		});
		expect(dibajak[0]).toMatchObject({
			masuk: true,
			metode: 'ai',
			jenis: 'agency',
			skor: 2,
			alasan: 'AI: agensi digital',
			review: false
		});
	});

	it('override bisa memakai key anggota klaster atau key seed', () => {
		const k = kandidat({ key: 'maps:x', nama: 'X', anggota: ['maps:x', 'osm:node/7'] });
		expect(cariOverride(k, { 'osm:node/7': { masuk: false } })).toEqual({ masuk: false });
		expect(cariOverride(C, { 'kurasi:gamma': { masuk: true } })).toEqual({ masuk: true });
		expect(cariOverride(A, { 'maps:zzz': { masuk: true } })).toBeNull();
	});
});

describe('parseJsonLonggar', () => {
	it('membuka pagar ```json dan kalimat pembuka', () => {
		expect(parseJsonLonggar('```json\n{"hasil":[]}\n```')).toEqual({ hasil: [] });
		expect(parseJsonLonggar('Berikut hasilnya: {"a":1} semoga membantu')).toEqual({ a: 1 });
		expect(() => parseJsonLonggar('tidak ada json')).toThrow(/bukan JSON/);
	});
});
