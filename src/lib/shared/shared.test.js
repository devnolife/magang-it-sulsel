import { describe, expect, it } from 'vitest';
import { formatPhone, isMobile, normalizePhone, phoneFromWaUrl, waLink } from './phone.js';
import { namaKey, randomId, slugify, uniqueSlug } from './slug.js';
import { findArea, formatJarak, formatKoordinat, haversineKm, inBbox } from './geo.js';
import { deriveMagangStatus, MAGANG_RE } from './magang-status.js';
import { kabkotaFromText, kabkotaLabel, KABKOTA, SULSEL_BBOX } from './wilayah.js';
import { toCsv } from './csv.js';
import { isJenis, JENIS_KEYS } from './jenis.js';

describe('phone', () => {
	it('menormalkan berbagai format ke E.164', () => {
		expect(normalizePhone('0812-3456-7890')).toBe('+6281234567890');
		expect(normalizePhone('+62 812 3456 7890')).toBe('+6281234567890');
		expect(normalizePhone('6281234567890')).toBe('+6281234567890');
		expect(normalizePhone('(0411) 452 123')).toBe('+62411452123');
		expect(normalizePhone('0062 411 452123')).toBe('+62411452123');
		expect(normalizePhone('81234567890')).toBe('+6281234567890');
	});

	it('menolak nomor tidak masuk akal', () => {
		expect(normalizePhone('')).toBeNull();
		expect(normalizePhone('147')).toBeNull();
		expect(normalizePhone('+1 415 555 0100')).toBeNull();
		expect(normalizePhone('0812')).toBeNull();
		expect(normalizePhone(null)).toBeNull();
	});

	it('hanya nomor seluler yang dapat link WA', () => {
		expect(isMobile('+6281234567890')).toBe(true);
		expect(isMobile('+62411452123')).toBe(false);
		expect(waLink('+6281234567890')).toBe('https://wa.me/6281234567890');
		expect(waLink('+62411452123')).toBeNull();
	});

	it('memformat untuk tampilan lokal', () => {
		expect(formatPhone('+6281234567890')).toBe('0812-3456-7890');
		expect(formatPhone('+62411452123')).toBe('(0411) 452123');
		expect(formatPhone('+62215551234')).toBe('(021) 5551234');
	});

	it('membaca nomor dari URL WhatsApp', () => {
		expect(phoneFromWaUrl('https://wa.me/6285526250131?text=halo')).toBe('+6285526250131');
		expect(phoneFromWaUrl('https://api.whatsapp.com/send?phone=6282196600066')).toBe(
			'+6282196600066'
		);
		expect(phoneFromWaUrl('https://example.com')).toBeNull();
	});
});

describe('slug', () => {
	it('membuat slug bersih', () => {
		expect(slugify('PT. Magau Jaya Digital — Makassar')).toBe('pt-magau-jaya-digital-makassar');
		expect(slugify('Café & Co')).toBe('cafe-dan-co');
		expect(slugify('a'.repeat(100)).length).toBeLessThanOrEqual(80);
	});

	it('menambah akhiran bila bentrok', () => {
		const taken = new Set(['x', 'x-2']);
		expect(uniqueSlug('x', (s) => taken.has(s))).toBe('x-3');
		expect(uniqueSlug('', () => false)).toBe('perusahaan');
	});

	it('namaKey membuang badan usaha', () => {
		expect(namaKey('PT. Magau Jaya Digital')).toBe('magau jaya digital');
		expect(namaKey('CV Karya Studio')).toBe('karya studio');
	});

	it('randomId memakai prefix', () => {
		expect(randomId('c')).toMatch(/^c_[a-z0-9]{8}$/);
	});
});

describe('geo', () => {
	it('haversine Makassar–Gowa sekitar 7 km', () => {
		const km = haversineKm({ lat: -5.1477, lng: 119.4327 }, { lat: -5.2066, lng: 119.4538 });
		expect(km).toBeGreaterThan(6);
		expect(km).toBeLessThan(8);
	});

	it('formatJarak', () => {
		expect(formatJarak(0.23)).toBe('250 m');
		expect(formatJarak(3.456)).toBe('3,5 km');
		expect(formatJarak(42.4)).toBe('42 km');
	});

	it('formatKoordinat', () => {
		expect(formatKoordinat(-5.1477, 119.4327)).toBe('5°08′52″ LS 119°25′58″ BT');
		expect(formatKoordinat(0.5, -0.25)).toBe('0°30′00″ LU 0°15′00″ BB');
	});

	it('point in polygon dengan lubang dan multipolygon', () => {
		const square = [
			[
				[0, 0],
				[10, 0],
				[10, 10],
				[0, 10],
				[0, 0]
			],
			[
				[4, 4],
				[6, 4],
				[6, 6],
				[4, 6],
				[4, 4]
			]
		];
		const fc = {
			features: [
				{
					properties: { slug: 'a' },
					geometry: { type: /** @type {const} */ ('Polygon'), coordinates: square }
				},
				{
					properties: { slug: 'b' },
					geometry: {
						type: /** @type {const} */ ('MultiPolygon'),
						coordinates: [
							[
								[
									[20, 20],
									[30, 20],
									[30, 30],
									[20, 30],
									[20, 20]
								]
							]
						]
					}
				}
			]
		};
		expect(findArea(1, 1, fc)).toBe('a');
		expect(findArea(5, 5, fc)).toBeNull();
		expect(findArea(25, 25, fc)).toBe('b');
		expect(findArea(15, 15, fc)).toBeNull();
	});

	it('bbox Sulsel memuat semua pusat kab/kota', () => {
		for (const k of KABKOTA) expect(inBbox(k.pusat[0], k.pusat[1], SULSEL_BBOX)).toBe(true);
		expect(inBbox(-6.2, 106.8, SULSEL_BBOX)).toBe(false);
	});
});

describe('wilayah', () => {
	it('ada 24 kab/kota dengan slug unik', () => {
		expect(KABKOTA).toHaveLength(24);
		expect(new Set(KABKOTA.map((k) => k.slug)).size).toBe(24);
	});

	it('menebak kab/kota dari alamat, alias terpanjang dulu', () => {
		expect(
			kabkotaFromText('Jl. Pengayoman No.25, Panakkukang, Kota Makassar, Sulawesi Selatan')
		).toBe('makassar');
		expect(kabkotaFromText('Malili, Kabupaten Luwu Timur')).toBe('luwu-timur');
		expect(kabkotaFromText('Belopa, Kabupaten Luwu')).toBe('luwu');
		expect(kabkotaFromText('Jl. Poros Pare-Pare')).toBe('parepare');
		expect(kabkotaFromText('Jakarta Selatan')).toBeNull();
	});

	it('label pendek', () => {
		expect(kabkotaLabel('makassar')).toBe('Makassar');
		expect(kabkotaLabel('selayar')).toBe('Kepulauan Selayar');
		expect(kabkotaLabel('tidak-ada')).toBe('');
	});
});

describe('magang-status', () => {
	it('menurunkan status dari bukti', () => {
		expect(deriveMagangStatus({ bukti: [] })).toBe('belum');
		expect(deriveMagangStatus({ bukti: [{ tipe: 'halaman-karir' }] })).toBe('indikasi');
		expect(deriveMagangStatus({ bukti: [{ tipe: 'kurasi' }, { tipe: 'lowongan' }] })).toBe(
			'terbukti'
		);
		expect(deriveMagangStatus({ bukti: null, jumlahPengalaman: 1 })).toBe('terbukti');
		expect(deriveMagangStatus({ bukti: [], jumlahLowongan: 2 })).toBe('terbukti');
	});

	it('mengenali kata kunci magang', () => {
		expect(MAGANG_RE.test('Program Magang Mahasiswa')).toBe(true);
		expect(MAGANG_RE.test('Internship Program 2026')).toBe(true);
		expect(MAGANG_RE.test('Menerima PKL/Prakerin')).toBe(true);
		expect(MAGANG_RE.test('International Conference')).toBe(false);
		expect(MAGANG_RE.test('Senior Backend Engineer')).toBe(false);
	});
});

describe('csv & jenis', () => {
	it('meng-escape sel dan mencegah formula', () => {
		const csv = toCsv(
			[{ a: 'x,y', b: '=HYPERLINK("z")', c: -5.14, d: ['p', 'q'], e: null }],
			[
				{ key: 'a', label: 'A' },
				{ key: 'b', label: 'B' },
				{ key: 'c', label: 'C' },
				{ key: 'd', label: 'D' },
				{ key: 'e', label: 'E' }
			]
		);
		expect(csv.startsWith('\ufeffA,B,C,D,E\r\n')).toBe(true);
		expect(csv).toContain('"x,y"');
		expect(csv).toContain(`"'=HYPERLINK(""z"")"`);
		expect(csv).toContain(',-5.14,');
		expect(csv).toContain('"p; q"');
	});

	it('jenis valid', () => {
		expect(JENIS_KEYS).toHaveLength(6);
		expect(isJenis('software')).toBe(true);
		expect(isJenis('servis')).toBe(false);
	});
});
