import { describe, expect, it } from 'vitest';
import { analisisHalaman, kutipanMagang, platformKarir, tantanganBot } from './web-parse.js';

const PERUSAHAAN = `<!doctype html><html lang="id"><head>
<title>PT Contoh Digital Makassar - Software House</title>
<meta name="description" content="Jasa pembuatan aplikasi dan website di Makassar.">
</head><body>
<nav><a href="/">Beranda</a> <a href="/karir">Karir</a> <a href="/blog/tips">Blog</a>
<a href="https://id.jobstreet.com/id/companies/contoh">Lowongan di JobStreet</a>
<a href="https://mitra.id/careers">Karir mitra</a></nav>
<section><h2>Tentang kami</h2><p>Kami membangun aplikasi untuk UMKM. Kami membuka program magang untuk
mahasiswa informatika setiap semester!</p><p>Magang itu penting.</p></section>
<footer>
<a href="mailto:Info@Contoh.co.id?subject=Halo">Email</a> Kontak HRD: hrd@contoh.co.id atau nama@email.com
<a href="https://wa.me/6281234567890?text=halo">WA</a>
<a href="tel:+62 411 123456">Telepon</a>
<a href="https://www.instagram.com/p/xyz/">Post</a>
<a href="https://instagram.com/ContohDigital/">IG</a>
<a href="https://www.linkedin.com/company/contoh-digital/about/">LinkedIn</a>
</footer></body></html>`;

describe('analisisHalaman', () => {
	it('mengekstrak kontak, tautan karir, dan kalimat magang', () => {
		const a = analisisHalaman(PERUSAHAAN, 'https://www.contoh.co.id/');
		expect(a).toMatchObject({
			judul: 'PT Contoh Digital Makassar - Software House',
			deskripsi: 'Jasa pembuatan aplikasi dan website di Makassar.',
			bahasa: 'id',
			status: 'aktif',
			email: ['info@contoh.co.id', 'hrd@contoh.co.id'],
			whatsapp: ['+6281234567890'],
			telepon: ['+62411123456'],
			instagram: 'https://www.instagram.com/contohdigital/',
			linkedin: 'https://www.linkedin.com/company/contoh-digital/',
			tautan_karir: [
				'https://www.contoh.co.id/karir',
				'https://id.jobstreet.com/id/companies/contoh'
			],
			spa: false
		});
		expect(a.magang).toEqual([
			'Kami membuka program magang untuk mahasiswa informatika setiap semester!'
		]);
	});

	it('domain parkir & halaman bawaan server = mati', () => {
		const parkir = analisisHalaman(
			'<html><head><title>contoh.id</title></head><body><h1>This domain may be for sale!</h1></body></html>',
			'https://contoh.id/'
		);
		expect(parkir.status).toBe('mati');
		const nginx = analisisHalaman(
			'<title>Welcome to nginx!</title><p>If you see this page, the nginx web server is successfully installed.</p>',
			'http://contoh.id/'
		);
		expect(nginx).toMatchObject({ status: 'mati' });
	});

	it('spam judi tersembunyi atau judul berhuruf Jepang = dibajak', () => {
		const judi = analisisHalaman(
			`<title>PT Contoh Digital</title><p>Software house.</p>
			<div style="display:none"><a href="https://x.top/">Slot Gacor</a> <a href="https://y.top/">Link Maxwin</a></div>`,
			'https://contoh.id/'
		);
		expect(judi.status).toBe('dibajak');
		expect(judi.alasan).toContain('slot gacor');
		const jp = analisisHalaman(
			'<title>激安 ブランド コピー 通販 専門店</title><p>x</p>',
			'https://contoh.id/'
		);
		expect(jp.status).toBe('dibajak');
	});

	it('satu kata judi di berita biasa tidak dianggap dibajak', () => {
		const berita = analisisHalaman(
			'<title>Bone Terkini</title><p>Polisi menangkap pelaku judi online di Watampone.</p>',
			'https://boneterkini.id/'
		);
		expect(berita.status).toBe('aktif');
	});

	it('tautan karir: segmen path utuh, subdomain karir, menu pendek; bukan artikel', () => {
		const a = analisisHalaman(
			`<title>Contoh</title><p>x</p>
			<a href="/blog/tips-karir-untuk-fresh-graduate">Tips karir untuk fresh graduate di era digital</a>
			<a href="#">Karir</a>
			<a href="/">Lowongan</a>
			<a href="/?page_id=12">Karir</a>
			<a href="/id/careers.html">Join</a>
			<a href="https://karir.contoh.id/">Portal</a>
			<a href="https://glints.com/id/companies/contoh">Glints</a>`,
			'https://contoh.id/'
		);
		expect(a.tautan_karir).toEqual([
			'https://contoh.id/?page_id=12',
			'https://contoh.id/id/careers.html',
			'https://karir.contoh.id/',
			'https://glints.com/id/companies/contoh'
		]);
		expect(platformKarir('https://www.glints.com/id/x')).toBe(true);
		expect(platformKarir('https://karir.contoh.id/')).toBe(false);
	});

	it('mendeteksi SPA kosong dan meta refresh', () => {
		expect(
			analisisHalaman(
				'<html><body><div id="root"></div><script src="/app.js"></script></body></html>',
				'https://contoh.id/'
			).spa
		).toBe(true);
		expect(
			analisisHalaman(
				'<meta http-equiv="Refresh" content="0; URL=/beranda">',
				'https://contoh.id/lama/'
			).refresh
		).toBe('https://contoh.id/beranda');
	});
});

describe('kutipanMagang & tantanganBot', () => {
	it('mengambil kalimat magang dari halaman karir', () => {
		expect(
			kutipanMagang(
				'<h2>Program Magang</h2><p>Kami menerima mahasiswa PKL dari jurusan informatika. Kirim CV.</p>'
			)
		).toEqual(['Program Magang', 'Kami menerima mahasiswa PKL dari jurusan informatika.']);
	});

	it('mengenali halaman tantangan Cloudflare', () => {
		expect(tantanganBot('<title>Just a moment...</title>')).toBe(true);
		expect(tantanganBot(PERUSAHAAN)).toBe(false);
	});
});
