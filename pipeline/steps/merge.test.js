import { describe, expect, it } from 'vitest';
import {
	bersihkanNama,
	domainKey,
	gabungSemua,
	kecamatanDariAlamat,
	klasifikasiTautan,
	klasterkan,
	kumpulkanMaps,
	nameTokens,
	susunKandidat
} from './merge.js';

/** @param {number} x0 @param {number} y0 @param {number} x1 @param {number} y1 */
const kotak = (x0, y0, x1, y1) => ({
	type: /** @type {const} */ ('Polygon'),
	coordinates: [
		[
			[x0, y0],
			[x1, y0],
			[x1, y1],
			[x0, y1],
			[x0, y0]
		]
	]
});

const geo = {
	kabkota: {
		features: [
			{ properties: { slug: 'makassar' }, geometry: kotak(119.3, -5.3, 119.6, -5.0) },
			{ properties: { slug: 'gowa' }, geometry: kotak(119.3, -5.6, 119.9, -5.3) }
		]
	},
	kecamatan: {
		features: [
			{
				properties: { slug: 'makassar--panakkukang', nama: 'Panakkukang' },
				geometry: kotak(119.42, -5.17, 119.46, -5.13)
			}
		]
	}
};

/**
 * @param {Partial<import('../sources/maps-parse.js').Tempat>} p
 * @returns {import('../sources/maps-parse.js').Tempat}
 */
const tempat = (p) => ({
	sumber: 'maps',
	key: `maps:${p.google_fid ?? p.nama}`,
	nama: 'Tanpa Nama',
	kategori: null,
	alamat: null,
	lat: -5.15,
	lng: 119.44,
	telepon: null,
	website: null,
	rating: null,
	jumlah_ulasan: null,
	maps_url: null,
	osm_url: null,
	google_fid: null,
	status_tempat: null,
	...p
});

describe('helper nama & tautan', () => {
	it('nameTokens menyeragamkan singkatan instansi & badan usaha', () => {
		expect([...nameTokens('Dinas KOMINFO MAKASSAR')].sort()).toEqual([
			'dinas',
			'informatika',
			'komunikasi',
			'makassar'
		]);
		expect([...nameTokens('PT. Magau Jaya Digital')]).toEqual(['magau', 'jaya', 'digital']);
	});

	it('domainKey mengabaikan media sosial; klasifikasiTautan memisahkan IG/WA', () => {
		expect(domainKey('https://www.karyastudio.com/careers')).toBe('karyastudio.com');
		expect(domainKey('https://instagram.com/abc')).toBeNull();
		expect(klasifikasiTautan('https://www.instagram.com/abc')).toMatchObject({
			website: null,
			instagram: 'https://www.instagram.com/abc'
		});
		expect(klasifikasiTautan('https://wa.me/6281234567890').whatsapp).toBe('+6281234567890');
	});

	it('kecamatanDariAlamat membaca "Kec. X"', () => {
		expect(
			kecamatanDariAlamat('Jl. Pengayoman No.25, Masale, Kec. Panakkukang, Kota Makassar, 90231')
		).toBe('Panakkukang');
		expect(kecamatanDariAlamat('Jl. Tanpa Kecamatan')).toBeNull();
	});

	it('bersihkanNama membuang ekor SEO tapi mempertahankan daerah & badan hukum', () => {
		expect(
			bersihkanNama(
				'Afila Media Karya - Jasa Pembuatan Website dan Aplikasi (Software House & Developer) Makassar'
			)
		).toBe('Afila Media Karya');
		expect(bersihkanNama('WASD Labs - Jasa Pembuatan Aplikasi di makassar')).toBe('WASD Labs');
		expect(bersihkanNama('Jasa Pembuatan Website - Dakocang Digital Creative')).toBe(
			'Dakocang Digital Creative'
		);
		expect(bersihkanNama('Jasa Digital Marketing Makassar | Lontara Digital')).toBe(
			'Lontara Digital'
		);
		expect(bersihkanNama('Wan Creative | Digital Creative Agency | Desain, Branding')).toBe(
			'Wan Creative'
		);
		expect(bersihkanNama('Upana Studio (Software House Makassar)')).toBe('Upana Studio');
		expect(bersihkanNama('BPS - Kabupaten Gowa')).toBe('BPS - Kabupaten Gowa');
		expect(bersihkanNama('Telkom Indonesia (Persero)')).toBe('Telkom Indonesia (Persero)');
		expect(bersihkanNama('  Karya   Studio ')).toBe('Karya Studio');
	});
});

describe('kumpulkanMaps & klasterkan', () => {
	it('menggabungkan kemunculan berulang dan data detail', () => {
		const a = tempat({ google_fid: '0x1:0x1', nama: 'Contoh Soft', alamat: 'Jl. A' });
		const b = { ...a, alamat: 'Jl. A No. 1', telepon: '0411 123456' };
		const detail = { ...a, alamat: 'Jl. A No. 1, Kec. Panakkukang, Kota Makassar' };
		const out = kumpulkanMaps(
			[
				{ query: 'software house', places: [a] },
				{ query: 'konsultan IT', places: [b] }
			],
			new Map([[a.key, detail]])
		);
		expect(out).toHaveLength(1);
		expect(out[0]).toMatchObject({
			queries: ['software house', 'konsultan IT'],
			telepon: '0411 123456',
			alamat: 'Jl. A No. 1, Kec. Panakkukang, Kota Makassar'
		});
	});

	it('dedupe domain/nama berdekatan, tapi cabang berjauhan tetap terpisah', () => {
		const clusters = klasterkan([
			tempat({ google_fid: '0x1:0x1', nama: 'Karya Studio', website: 'https://karyastudio.com' }),
			tempat({
				google_fid: '0x2:0x2',
				nama: 'PT Karya Studio Indonesia',
				website: 'https://www.karyastudio.com/',
				lat: -5.1502
			}),
			tempat({
				google_fid: '0x3:0x3',
				nama: 'Karya Studio',
				website: 'https://karyastudio.com',
				lat: -5.2,
				lng: 119.5
			}),
			tempat({
				sumber: 'osm',
				key: 'osm:node/1',
				nama: 'Dinas KOMINFO MAKASSAR',
				lat: -5.1403,
				lng: 119.4103
			}),
			tempat({
				google_fid: '0x4:0x4',
				nama: 'Dinas Komunikasi dan Informatika Kota Makassar',
				lat: -5.14,
				lng: 119.41
			})
		]);
		const sizes = clusters.map((c) => c.length).sort();
		expect(sizes).toEqual([1, 2, 2]);
	});

	it('ekor SEO yang sama tidak membuat dua usaha berbeda tergabung', () => {
		const clusters = klasterkan([
			tempat({ google_fid: '0x1:0x1', nama: 'Alpha Tech - Jasa Pembuatan Website Makassar' }),
			tempat({
				google_fid: '0x2:0x2',
				nama: 'Beta Soft - Jasa Pembuatan Website Makassar',
				lat: -5.1504
			}),
			tempat({ sumber: 'osm', key: 'osm:node/9', nama: 'Alpha Tech', lat: -5.1501 })
		]);
		expect(clusters.map((c) => c.map((t) => t.key).sort()).sort()).toEqual([
			['maps:0x1:0x1', 'osm:node/9'],
			['maps:0x2:0x2']
		]);
	});
});

describe('susunKandidat', () => {
	it('menentukan kab/kota & kecamatan, membuang yang di luar Sulsel', () => {
		const k = susunKandidat(
			[
				tempat({
					google_fid: '0x1:0x1',
					nama: 'Contoh Soft',
					telepon: '0812-3456-7890',
					website: 'https://instagram.com/contoh'
				})
			],
			geo
		);
		expect(k).toMatchObject({
			kabkota: 'makassar',
			kecamatan: 'Panakkukang',
			telepon: '+6281234567890',
			whatsapp: '+6281234567890',
			website: null,
			instagram: 'https://instagram.com/contoh',
			sumber: ['maps']
		});
		expect(susunKandidat([tempat({ nama: 'Jauh', lat: -6.2, lng: 106.8 })], geo)).toEqual({
			dibuang: 'di-luar-sulsel',
			nama: 'Jauh'
		});
		expect(
			susunKandidat([tempat({ nama: 'Tutup', status_tempat: 'tutup-permanen' })], geo)
		).toMatchObject({ dibuang: 'tutup-permanen' });
	});
});

describe('gabungSemua', () => {
	const searches = [
		{
			id: 'makassar--software-house',
			query: 'software house',
			places: [
				tempat({
					google_fid: '0xa:0xa',
					nama: 'Karya Studio',
					website: 'https://karyastudio.com',
					kategori: 'Perusahaan Software'
				}),
				tempat({ google_fid: '0xb:0xb', nama: 'Mentorbox', website: 'https://mentorbox.id' }),
				tempat({ google_fid: '0xd:0xd', nama: 'PT Pancaran Gemilang Abadi', lat: -5.12 })
			]
		},
		{
			id: 'seed--instansi-bps-gowa',
			query: 'seed:instansi:bps-gowa',
			places: [
				tempat({ google_fid: '0xc1:0xc1', nama: 'Kantor BPS Kota Makassar', lat: -5.14 }),
				tempat({
					google_fid: '0xc2:0xc2',
					nama: 'Badan Pusat Statistik Kabupaten Gowa',
					lat: -5.35
				})
			]
		}
	];
	/** @type {any} */
	const seed = {
		entri: [
			{
				key: 'kurasi:karyastudio.com',
				asal: 'kurasi',
				nama: 'Karya Studio',
				jenis: 'software',
				masuk: true,
				website: 'https://karyastudio.com',
				whatsapp: '+6285526250131',
				tags: [],
				magang_bukti: []
			},
			{
				key: 'kurasi:mentorbox.id',
				asal: 'kurasi',
				nama: 'PT LPK Mentorbox Indonesia',
				jenis: 'startup',
				masuk: false,
				website: 'https://mentorbox.id',
				tags: [],
				magang_bukti: []
			},
			{
				key: 'kurasi:wasdlabs.com',
				asal: 'kurasi',
				nama: 'WASD Labs',
				jenis: 'software',
				masuk: true,
				kabkota: 'makassar',
				website: 'https://wasdlabs.com',
				tags: [],
				magang_bukti: [{ tipe: 'kurasi', kutipan: 'contoh', tanggal: '2026-09-23' }]
			},
			{
				key: 'instansi:bps-gowa',
				asal: 'instansi',
				label: 'BPS Kabupaten Gowa',
				jenis: 'instansi',
				masuk: true,
				kabkota: 'gowa',
				cocok: ['\\bBPS\\b|badan pusat statistik'],
				tags: [],
				magang_bukti: []
			}
		],
		lowongan: [
			{
				sumber: 'jobstreet',
				id: '1',
				judul: 'Magang Web Developer',
				perusahaan: 'PT Pancaran Gemilang Abadi',
				url: 'https://id.jobstreet.com/id/job/1',
				lokasi: 'Makassar, Sulawesi Selatan',
				kategori: 'IT',
				ditemukan_pada: '2026-09-23'
			},
			{
				sumber: 'jobstreet',
				id: '2',
				judul: 'Customer Service',
				perusahaan: 'PT Pancaran Gemilang Abadi',
				url: 'https://id.jobstreet.com/id/job/2',
				lokasi: 'Makassar, Sulawesi Selatan',
				kategori: 'umum',
				ditemukan_pada: '2026-09-23'
			}
		]
	};

	it('mencocokkan seed (domain, pencarian seed + kab/kota), membuat kandidat seed-saja, menempel lowongan', () => {
		const r = gabungSemua({ searches, details: new Map(), osm: [], seed, geo });
		const by = Object.fromEntries(r.kandidat.map((k) => [k.nama, k]));
		expect(by['Karya Studio'].seed?.key).toBe('kurasi:karyastudio.com');
		expect(by['Karya Studio'].whatsapp).toBe('+6285526250131');
		expect(by['Karya Studio'].sumber).toEqual(['maps', 'kurasi']);
		expect(by['PT LPK Mentorbox Indonesia'].seed?.masuk).toBe(false);
		expect(by['BPS Kabupaten Gowa'].seed?.key).toBe('instansi:bps-gowa');
		expect(by['BPS Kabupaten Gowa'].nama_asli).toBe('Badan Pusat Statistik Kabupaten Gowa');
		expect(by['Kantor BPS Kota Makassar'].seed).toBeNull();
		expect(by['WASD Labs']).toMatchObject({ lat: null, kabkota: 'makassar', sumber: ['kurasi'] });
		expect(by['WASD Labs'].magang_bukti).toHaveLength(1);
		const pga = by['PT Pancaran Gemilang Abadi'];
		expect(pga.lowongan.map((l) => l.judul)).toEqual(['Magang Web Developer']);
		expect(pga.magang_bukti[0]).toMatchObject({ tipe: 'lowongan' });
		expect(r.statistik.lowongan_cocok).toBe(1);
		expect(r.seed_tanpa_tempat.map((s) => s.key)).toEqual(['kurasi:wasdlabs.com']);
	});

	it('telepon sama saja tidak cukup: nama seed kurasi tetap harus cocok', () => {
		const r = gabungSemua({
			searches: [
				{
					id: 'makassar--konsultan-it',
					query: 'konsultan IT',
					places: [
						tempat({
							google_fid: '0xe:0xe',
							nama: 'Distritek Solusi Indonesia',
							telepon: '0811-4100-200'
						})
					]
				}
			],
			details: new Map(),
			osm: [],
			seed: {
				lowongan: [],
				entri: [
					/** @type {any} */ ({
						key: 'kurasi:algenz.id',
						asal: 'kurasi',
						nama: 'Algenz Digital',
						jenis: 'software',
						masuk: true,
						kabkota: 'makassar',
						whatsapp: '+628114100200',
						tags: [],
						magang_bukti: []
					})
				]
			},
			geo
		});
		const by = Object.fromEntries(r.kandidat.map((k) => [k.nama, k]));
		expect(by['Distritek Solusi Indonesia'].seed).toBeNull();
		expect(by['Algenz Digital']).toMatchObject({ key: 'kurasi:algenz.id', lat: null });
	});

	it('instansi: pencarian umum mendahulukan kategori kantor & menolak nama perusahaan', () => {
		const r = gabungSemua({
			searches: [
				{
					id: 'makassar--dinas-komunikasi-dan-informatika',
					query: 'dinas komunikasi dan informatika',
					places: [
						tempat({
							google_fid: '0xf1:0xf1',
							nama: 'PT Flash Informatika Cemerlang',
							kategori: 'Perusahaan Software',
							jumlah_ulasan: 120
						}),
						tempat({
							google_fid: '0xf2:0xf2',
							nama: 'Aula Dinas Kominfo',
							kategori: 'Ruang Pertemuan',
							jumlah_ulasan: 40,
							lat: -5.13
						}),
						tempat({
							google_fid: '0xf3:0xf3',
							nama: 'Dinas Komunikasi dan Informatika',
							kategori: 'Kantor Pemerintah Daerah',
							jumlah_ulasan: 5,
							lat: -5.11
						})
					]
				}
			],
			details: new Map(),
			osm: [],
			seed: {
				lowongan: [],
				entri: [
					/** @type {any} */ ({
						key: 'instansi:diskominfo-makassar',
						asal: 'instansi',
						label: 'Dinas Komunikasi dan Informatika Kota Makassar',
						jenis: 'instansi',
						masuk: true,
						kabkota: 'makassar',
						cocok: ['\\b(dinas|diskominfo|kominfo)', 'kominfo|komunikasi|informatika'],
						tolak: '\\b(pt|cv)\\b|provinsi',
						tags: [],
						magang_bukti: []
					})
				]
			},
			geo
		});
		expect(r.seed_cocok).toEqual([
			{
				key: 'instansi:diskominfo-makassar',
				nama: 'Dinas Komunikasi dan Informatika Kota Makassar',
				via: 'pencarian-umum',
				ke: 'Dinas Komunikasi dan Informatika'
			}
		]);
		const k = r.kandidat.find((x) => x.seed);
		expect(k?.google_fid).toBe('0xf3:0xf3');
	});
});
