import { describe, expect, it } from 'vitest';
import { kunciWeb, periksaSitus, pilihSitus } from './enrich.js';

const T = '2026-09-23T01:00:00.000Z';

/**
 * Jaringan palsu: url -> halaman (sebagian) atau kode galat. URL lain = 404.
 * @param {Record<string, Partial<import('./enrich.js').Halaman> | string>} halaman
 * @param {{ larang?: RegExp, render?: Record<string, { html: string, url_akhir: string } | { gagal: string }> }} [opt]
 */
function ioPalsu(halaman, opt = {}) {
	/** @type {string[]} */
	const diambil = [];
	/** @type {import('./enrich.js').IoWeb} */
	const io = {
		ambil: async (url) => {
			diambil.push(url);
			const h = halaman[url];
			const dasar = { url_akhir: url, error: null, fetched_at: T, dariCache: true };
			if (h === undefined) {
				return { ...dasar, ok: false, status: 404, contentType: 'text/html', text: 'Not found' };
			}
			if (typeof h === 'string') {
				return { ...dasar, ok: false, status: 0, contentType: '', text: '', error: h };
			}
			return { ...dasar, ok: true, status: 200, contentType: 'text/html', text: '', ...h };
		},
		boleh: async (url) => !opt.larang?.test(url),
		tunggu: async () => {},
		...(opt.render ? { render: async (url) => opt.render?.[url] ?? null } : {})
	};
	return { io, diambil };
}

describe('periksaSitus', () => {
	it('situs normal: kontak, halaman karir bermagang, url_karir', async () => {
		const { io } = ioPalsu({
			'https://contoh.co.id/': {
				text: `<title>PT Contoh Software</title><p>Software house di Makassar.</p>
				<a href="mailto:info@contoh.co.id">Email</a> <a href="https://wa.me/6281234567890">WA</a>
				<a href="/karir">Karir</a>`
			},
			'https://contoh.co.id/karir': {
				text: `<h1>Bergabung</h1><p>Kami membuka program magang untuk mahasiswa informatika.</p>
				<p>Kirim CV ke hrd@contoh.co.id</p>`
			}
		});
		const h = await periksaSitus('https://contoh.co.id/', io);
		expect(h).toMatchObject({
			status: 'aktif',
			dicek: true,
			judul: 'PT Contoh Software',
			email: ['info@contoh.co.id', 'hrd@contoh.co.id'],
			whatsapp: ['+6281234567890'],
			url_karir: 'https://contoh.co.id/karir',
			bukti: [
				{
					tipe: 'halaman-karir',
					url: 'https://contoh.co.id/karir',
					kutipan: 'Kami membuka program magang untuk mahasiswa informatika.',
					tanggal: '2026-09-23'
				}
			]
		});
	});

	it('tautan Google & business.site dihapus; media sosial tidak diambil', async () => {
		const { io, diambil } = ioPalsu({});
		expect(await periksaSitus('https://g.page/r/abc', io)).toMatchObject({
			status: 'tidak-ada',
			hapus_website: true
		});
		expect(await periksaSitus('https://contoh.business.site/', io)).toMatchObject({
			hapus_website: true
		});
		expect(await periksaSitus('https://www.facebook.com/contoh', io)).toMatchObject({
			status: 'aktif',
			dicek: false
		});
		expect(diambil).toEqual([]);
	});

	it('DNS gagal = mati; sertifikat ditolak dicoba lewat http', async () => {
		const { io } = ioPalsu({
			'https://mati.id/': 'ENOTFOUND',
			'https://www.mati.id/': 'ENOTFOUND',
			'https://tls.id/': 'CERT_HAS_EXPIRED',
			'http://tls.id/': { text: '<title>TLS Tech</title><p>Konsultan IT.</p>' }
		});
		expect(await periksaSitus('https://mati.id/', io)).toMatchObject({
			status: 'mati',
			alasan: 'domain tidak ditemukan (DNS)'
		});
		expect(await periksaSitus('https://tls.id/', io)).toMatchObject({
			status: 'aktif',
			dicek: true,
			url_akhir: 'http://tls.id/',
			judul: 'TLS Tech'
		});
	});

	it('"www." tanpa DNS dicoba tanpa www; port 443 ditolak dicoba lewat http', async () => {
		const { io } = ioPalsu({
			'http://www.pemkab.go.id/': 'ENODATA',
			'http://pemkab.go.id/': { text: '<title>Pemkab</title><p>Portal resmi.</p>' },
			'https://lama.id/': 'ECONNREFUSED',
			'http://lama.id/': { text: '<title>Lama Soft</title><p>Software house.</p>' },
			'https://tutup.id/': 'ECONNREFUSED',
			'http://tutup.id/': 'ECONNREFUSED'
		});
		expect(await periksaSitus('http://www.pemkab.go.id/', io)).toMatchObject({
			status: 'aktif',
			url_akhir: 'http://pemkab.go.id/',
			judul: 'Pemkab'
		});
		expect(await periksaSitus('https://lama.id/', io)).toMatchObject({
			status: 'aktif',
			url_akhir: 'http://lama.id/'
		});
		expect(await periksaSitus('https://tutup.id/', io)).toMatchObject({
			status: 'mati',
			alasan: 'server menolak koneksi (ECONNREFUSED)'
		});
	});

	it('timeout/koneksi diputus baru mati bila Chrome juga gagal', async () => {
		const halaman = {
			'https://lambat.id/': 'TIMEOUT',
			'https://putus.id/': 'ECONNRESET',
			'https://hilang.id/': 'UND_ERR_CONNECT_TIMEOUT'
		};
		const tanpaChrome = ioPalsu(halaman);
		expect(await periksaSitus('https://lambat.id/', tanpaChrome.io)).toMatchObject({
			status: 'aktif',
			dicek: false,
			alasan: 'server tidak merespons saat dicek (TIMEOUT), belum dipastikan lewat browser'
		});

		const { io } = ioPalsu(halaman, {
			render: {
				'https://putus.id/': {
					html: '<title>Putus Network</title><p>Penyedia jaringan internet kantor.</p>',
					url_akhir: 'https://putus.id/main'
				},
				'https://hilang.id/': { gagal: 'net::ERR_CONNECTION_TIMED_OUT' }
			}
		});
		expect(await periksaSitus('https://putus.id/', io)).toMatchObject({
			status: 'aktif',
			dicek: true,
			dirender: true,
			http_status: null,
			url_akhir: 'https://putus.id/main',
			judul: 'Putus Network'
		});
		expect(await periksaSitus('https://hilang.id/', io)).toMatchObject({
			status: 'mati',
			alasan:
				'server tidak merespons (UND_ERR_CONNECT_TIMEOUT; browser: net::ERR_CONNECTION_TIMED_OUT)'
		});
	});

	it('halaman dalam 404 pindah ke beranda; penjual domain = mati; robots melarang = tidak dicek', async () => {
		const { io } = ioPalsu({
			'https://lama.id/': { text: '<title>Lama Digital</title><p>Agensi digital.</p>' },
			'https://parkir.id/': {
				url_akhir: 'https://www.hugedomains.com/domain_profile.cfm?d=parkir.id',
				text: '<title>parkir.id</title>'
			}
		});
		expect(await periksaSitus('https://lama.id/profil', io)).toMatchObject({
			status: 'aktif',
			url_akhir: 'https://lama.id/'
		});
		expect(await periksaSitus('https://parkir.id/', io)).toMatchObject({ status: 'mati' });

		const tertutup = ioPalsu({}, { larang: /^https:\/\/tertutup\.id\// });
		expect(await periksaSitus('https://tertutup.id/', tertutup.io)).toMatchObject({
			status: 'aktif',
			dicek: false,
			alasan: 'robots.txt melarang pengecekan otomatis'
		});
		expect(tertutup.diambil).toEqual([]);
	});

	it('403 anti-bot = hidup tapi tidak dicek; 500 = mati; spam judi = dibajak', async () => {
		const { io } = ioPalsu({
			'https://cf.id/': { ok: false, status: 403, text: '<title>Just a moment...</title>' },
			'https://waf.id/': { ok: false, status: 403, text: '<title>403 Forbidden</title><hr>' },
			'https://rusak.id/': { ok: false, status: 500, text: 'Internal Server Error' },
			'https://judi.id/': {
				text: '<title>Situs Slot Gacor Maxwin</title><a href="/x">togel</a>'
			}
		});
		expect(await periksaSitus('https://cf.id/', io)).toMatchObject({
			status: 'aktif',
			dicek: false
		});
		expect(await periksaSitus('https://waf.id/', io)).toMatchObject({
			status: 'aktif',
			dicek: false,
			alasan: 'HTTP 403: akses otomatis ditolak'
		});
		expect(await periksaSitus('https://rusak.id/', io)).toMatchObject({
			status: 'mati',
			alasan: 'HTTP 500'
		});
		const judi = await periksaSitus('https://judi.id/', io);
		expect(judi.status).toBe('dibajak');
		expect(judi.url_karir).toBeNull();
	});
});

describe('kunciWeb & pilihSitus', () => {
	it('kunciWeb menyeragamkan www, huruf besar host, garis miring, dan query', () => {
		expect(kunciWeb('https://www.Contoh.co.id/?utm_source=gmb')).toBe('contoh.co.id');
		expect(kunciWeb('http://contoh.co.id/profil/')).toBe('contoh.co.id/profil');
		expect(kunciWeb('mailto:a@b.id')).toBeNull();
		expect(kunciWeb('bukan url')).toBeNull();
	});

	it('website sama dicek sekali; skor terlalu rendah & seed ditolak dilewati', () => {
		const k = /** @type {any[]} */ ([
			{
				key: 'maps:a',
				nama: 'PT Alpha Software',
				kategori: ['Perusahaan Software'],
				website: 'https://alpha.id/',
				kabkota: 'makassar'
			},
			{
				key: 'maps:b',
				nama: 'Alpha Software Gowa',
				kategori: ['Perusahaan Software'],
				website: 'https://www.alpha.id',
				kabkota: 'gowa'
			},
			{
				key: 'maps:c',
				nama: 'Toko Komputer Maju',
				kategori: ['Toko Komputer'],
				website: 'https://maju.id/',
				kabkota: 'makassar'
			},
			{
				key: 'kurasi:d',
				nama: 'Delta Soft',
				kategori: [],
				website: 'https://delta.id/',
				kabkota: 'makassar',
				seed: { masuk: false }
			},
			{ key: 'maps:e', nama: 'Epsilon Tech', kategori: [], website: null, kabkota: 'makassar' }
		]);
		expect(pilihSitus(k).map((s) => [s.kunci, s.keys])).toEqual([
			['alpha.id', ['maps:a', 'maps:b']]
		]);
		expect(pilihSitus(k, { kab: ['gowa'] }).map((s) => s.keys)).toEqual([['maps:b']]);
	});
});
