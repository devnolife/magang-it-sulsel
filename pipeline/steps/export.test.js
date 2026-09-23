import { describe, expect, it } from 'vitest';
import { slugDasar, susunDataset, susunEntri, susunLaporan } from './export.js';

/**
 * @param {Record<string, any>} p
 * @returns {import('./merge.js').Kandidat}
 */
const kandidat = (p) => ({
	key: 'maps:a',
	nama: 'Alpha Software',
	nama_asli: 'PT Alpha Software',
	kategori: ['Perusahaan Software'],
	tags_osm: null,
	alamat: 'Jl. Pettarani No. 1, Makassar',
	lat: -5.15,
	lng: 119.43,
	kabkota: 'makassar',
	kecamatan: 'Panakkukang',
	telepon: '+6281234567890',
	whatsapp: null,
	email: null,
	website: 'https://alpha.id/',
	instagram: null,
	linkedin: null,
	url_karir: null,
	rating: 4.8,
	jumlah_ulasan: 20,
	maps_url: 'https://www.google.com/maps/search/?api=1&query=-5.15,119.43',
	osm_url: null,
	google_fid: '0x1:0xa',
	osm_id: null,
	queries: [],
	sponsor: false,
	status_tempat: null,
	sumber: ['maps'],
	seed: null,
	lowongan: [],
	magang_bukti: [],
	anggota: ['maps:a'],
	...p
});

/**
 * @param {Record<string, any>} p
 * @returns {import('./classify.js').Keputusan}
 */
const keputusan = (p) => ({
	key: 'maps:a',
	masuk: true,
	jenis: 'software',
	metode: 'aturan',
	skor: 10,
	alasan: 'kategori Perusahaan Software +6',
	putusan_aturan: 'masuk',
	review: false,
	override: null,
	...p
});

/**
 * @param {Record<string, any>} p
 * @returns {import('./enrich.js').HasilWeb}
 */
const web = (p) => ({
	url: 'https://alpha.id/',
	url_akhir: 'https://alpha.id/',
	status: 'aktif',
	alasan: null,
	dicek: true,
	hapus_website: false,
	dicek_pada: '2026-09-23',
	http_status: 200,
	judul: 'Alpha Software',
	deskripsi: 'Software house pembuatan aplikasi web & mobile di Makassar.',
	email: ['Info@Alpha.id'],
	whatsapp: [],
	telepon: [],
	instagram: 'https://www.instagram.com/alpha.id',
	linkedin: null,
	url_karir: 'https://alpha.id/karir',
	bukti: [
		{
			tipe: 'halaman-karir',
			url: 'https://alpha.id/karir',
			kutipan: 'Program magang.',
			tanggal: '2026-09-23'
		}
	],
	spa: false,
	dirender: false,
	...p
});

describe('susunEntri', () => {
	it('kontak website dipakai bila aktif & terbaca; seluler = WhatsApp', () => {
		const r = susunEntri(kandidat({}), keputusan({}), web({}));
		expect(r).toMatchObject({
			email: 'info@alpha.id',
			whatsapp: '+6281234567890',
			instagram: 'https://www.instagram.com/alpha.id',
			url_karir: 'https://alpha.id/karir',
			status_web: 'aktif',
			deskripsi: 'Software house pembuatan aplikasi web & mobile di Makassar.',
			sumber: ['maps', 'website'],
			tags: ['Perusahaan Software'],
			source_keys: { google_fid: '0x1:0xa', domain: 'alpha.id', telepon: '+6281234567890' }
		});
		expect(r.magang_bukti).toHaveLength(1);

		const tidakTerbaca = susunEntri(kandidat({}), keputusan({}), web({ dicek: false }));
		expect(tidakTerbaca).toMatchObject({
			email: null,
			url_karir: null,
			magang_bukti: [],
			sumber: ['maps'],
			status_web: 'aktif'
		});
	});

	it('tautan Google dihapus; website dibajak diberi peringatan; tanpa website = tidak-ada', () => {
		const google = susunEntri(
			kandidat({ website: 'https://g.page/alpha' }),
			keputusan({}),
			web({ status: 'tidak-ada', hapus_website: true, dicek: false })
		);
		expect(google).toMatchObject({ website: null, status_web: 'tidak-ada' });
		expect(google.source_keys.domain).toBeNull();

		const bajak = susunEntri(kandidat({}), keputusan({}), web({ status: 'dibajak' }));
		expect(bajak.status_web).toBe('dibajak');
		expect(bajak.peringatan).toMatch(/dibajak/);
		expect(bajak.email).toBeNull();

		expect(susunEntri(kandidat({ website: null }), keputusan({}), null).status_web).toBe(
			'tidak-ada'
		);
	});
});

describe('slugDasar', () => {
	it('nama-kabkota, tanpa mengulang daerah', () => {
		expect(slugDasar('PT Alpha Software', 'makassar')).toBe('pt-alpha-software-makassar');
		expect(slugDasar('Diskominfo Kota Makassar', 'makassar')).toBe('diskominfo-kota-makassar');
		expect(slugDasar('BPS Kabupaten Luwu Timur', 'luwu-timur')).toBe('bps-kabupaten-luwu-timur');
		expect(slugDasar('x'.repeat(100), 'gowa')).toMatch(/^x{75}-gowa$/);
	});
});

describe('susunDataset', () => {
	const hari = '2026-09-24';
	const sekarang = '2026-09-24T02:00:00.000Z';

	it('id & slug dipakai ulang; entri tak berubah mempertahankan tanggal; id lama dicadangkan', () => {
		const K = [
			kandidat({}),
			kandidat({ key: 'maps:b', nama: 'Beta Digital', google_fid: '0x1:0xb', telepon: null }),
			kandidat({
				key: 'maps:c',
				nama: 'Alpha Software',
				google_fid: '0x1:0xc',
				kabkota: 'makassar',
				telepon: null
			}),
			kandidat({ key: 'maps:d', nama: 'Toko Delta', google_fid: '0x1:0xd' })
		];
		const D = [
			keputusan({}),
			keputusan({ key: 'maps:b', jenis: 'agency' }),
			keputusan({ key: 'maps:c' }),
			keputusan({ key: 'maps:d', masuk: false })
		];
		const ids = ['c_lama0001', 'c_baru0001', 'c_baru0002', 'c_baru0003'];
		const pertama = susunDataset({
			kandidat: K,
			keputusan: D,
			hari: '2026-09-23',
			sekarang,
			idBaru: () => /** @type {string} */ (ids.shift())
		});
		expect(pertama.dataset.perusahaan.map((c) => [c.slug, c.id])).toEqual([
			['alpha-software-makassar', 'c_lama0001'],
			['alpha-software-makassar-2', 'c_baru0002'],
			['beta-digital-makassar', 'c_baru0001']
		]);

		// Run kedua: Beta berubah (ada email), Alpha tetap, satu entri lama hilang (maps:c).
		const lama = JSON.parse(JSON.stringify(pertama.dataset));
		const K2 = [K[0], { ...K[1], email: 'halo@beta.id' }];
		const kedua = susunDataset({
			kandidat: K2,
			keputusan: D,
			lama,
			hari,
			sekarang,
			idBaru: () => 'c_baru0002'
		});
		expect(kedua.dataset.perusahaan.map((c) => [c.slug, c.id, c.diperbarui_pada])).toEqual([
			['alpha-software-makassar', 'c_lama0001', '2026-09-23'],
			['beta-digital-makassar', 'c_baru0001', hari]
		]);
		expect(kedua.dipakaiUlang).toBe(2);
		expect(kedua.hilang).toEqual([
			{ id: 'c_baru0002', slug: 'alpha-software-makassar-2', nama: 'Alpha Software' }
		]);

		// Perusahaan baru tidak boleh mewarisi id/slug entri yang hilang.
		let n = 0;
		const ketiga = susunDataset({
			kandidat: [
				K[0],
				K[1],
				kandidat({ key: 'maps:e', nama: 'Alpha Software', google_fid: '0x1:0xe', telepon: null })
			],
			keputusan: [...D, keputusan({ key: 'maps:e' })],
			lama,
			hari,
			sekarang,
			idBaru: () => (n++ === 0 ? 'c_baru0002' : 'c_baru0009')
		});
		expect(
			ketiga.dataset.perusahaan.find((c) => c.source_keys.google_fid === '0x1:0xe')
		).toMatchObject({
			id: 'c_baru0009',
			slug: 'alpha-software-makassar-3'
		});
	});

	it('kandidat tanpa keputusan dilaporkan; laporan memuat ringkasan & daftar review', () => {
		const K = [
			kandidat({}),
			kandidat({ key: 'maps:r', nama: 'Ragu Tech', nama_asli: 'Ragu Tech', google_fid: '0x1:0xr' })
		];
		const D = [
			keputusan({ skor: 5 }),
			keputusan({ key: 'maps:r', masuk: false, review: true, skor: 2, alasan: 'ragu' })
		];
		const hasil = susunDataset({
			kandidat: [...K, kandidat({ key: 'maps:x', google_fid: '0x1:0xx' })],
			keputusan: D,
			hari,
			sekarang,
			idBaru: () => `c_${Math.random().toString(36).slice(2, 10).padEnd(8, 'a')}`
		});
		expect(hasil.tanpaKeputusan).toEqual(['maps:x']);
		const md = susunLaporan({
			hasil,
			kandidat: K,
			keputusan: D,
			merged: { statistik: { tempat_maps: 2, kandidat: 2 } },
			classified: { statistik: { ragu: 1, per_metode: { aturan: { masuk: 1, keluar: 1 } } } },
			enriched: { situs: {} },
			sekarang
		});
		expect(md).toContain('| **Masuk direktori** | **1** (id dipakai ulang 0) |');
		expect(md).toContain('- PT Alpha Software (Makassar) · software · skor 5');
		expect(md).toMatch(/Perlu review .* — 1\n\n[^\n]*\n\n- Ragu Tech \(Makassar\) · skor 2/);
		expect(md).toContain('kandidat tanpa keputusan classify: `maps:x`');
	});
});
