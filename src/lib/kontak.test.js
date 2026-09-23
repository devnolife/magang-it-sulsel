import { describe, expect, it } from 'vitest';
import { daftarKontak, namaSapaan, pesanWa, relEksternal, urlAman } from './kontak.js';

describe('urlAman', () => {
	it('hanya meloloskan http/https', () => {
		expect(urlAman('https://contoh.id')).toBe('https://contoh.id/');
		expect(urlAman('http://contoh.id/a?b=1')).toBe('http://contoh.id/a?b=1');
		expect(urlAman('javascript:alert(1)')).toBeNull();
		expect(urlAman('data:text/html,hai')).toBeNull();
		expect(urlAman('contoh.id')).toBeNull();
		expect(urlAman(null)).toBeNull();
	});

	it('bisa mewajibkan host tertentu', () => {
		expect(urlAman('https://www.instagram.com/akun/', 'instagram.com')).toBe(
			'https://www.instagram.com/akun/'
		);
		expect(urlAman('https://instagram.com.jahat.id/akun', 'instagram.com')).toBeNull();
		expect(urlAman('https://notinstagram.com/akun', 'instagram.com')).toBeNull();
	});
});

describe('namaSapaan & pesanWa', () => {
	it('membuang ekor promosi', () => {
		expect(namaSapaan('AIRTECH CV || IT Solution (Hardware, Network)')).toBe('AIRTECH CV');
		expect(namaSapaan('Youthful Creative | Sosial Media')).toBe('Youthful Creative');
		expect(namaSapaan('Moodlab - Jasa Pembuatan Website')).toBe('Moodlab');
		expect(namaSapaan('PT. Media-Kreasi Nusantara')).toBe('PT. Media-Kreasi Nusantara');
	});

	it('menyapa dengan nama pendek', () => {
		expect(pesanWa('Inovasita || Software House')).toMatch(/^Halo Inovasita, saya mahasiswa/);
	});
});

describe('daftarKontak', () => {
	const c = {
		nama: 'Inovasita',
		whatsapp: '+6281234567890',
		telepon: '+62411123456',
		email: 'info@inovasita.id',
		website: 'https://www.inovasita.id/',
		instagram: 'https://www.instagram.com/inovasita/',
		linkedin: 'https://www.linkedin.com/company/inovasita/',
		maps_url: 'https://www.google.com/maps/search/?api=1&query=Inovasita'
	};

	it('urutan tetap dan LinkedIn hanya di mode lengkap', () => {
		expect(daftarKontak(c).map((k) => k.jenis)).toEqual([
			'wa',
			'tel',
			'email',
			'web',
			'ig',
			'maps'
		]);
		expect(daftarKontak(c, { lengkap: true }).map((k) => k.jenis)).toEqual([
			'wa',
			'tel',
			'email',
			'web',
			'ig',
			'li',
			'maps'
		]);
	});

	it('membentuk href yang benar', () => {
		const [wa, tel, email, web, ig] = daftarKontak(c);
		expect(wa.href).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=Halo%20Inovasita%2C/);
		expect(wa.nilai).toBe('0812-3456-7890');
		expect(tel.href).toBe('tel:+62411123456');
		expect(tel.nilai).toBe('(0411) 123456');
		expect(email.href).toBe('mailto:info@inovasita.id?subject=Pertanyaan%20kesempatan%20magang');
		expect(web.nilai).toBe('inovasita.id');
		expect(ig.nilai).toBe('@inovasita');
	});

	it('menyembunyikan data kosong atau tidak aman', () => {
		const k = daftarKontak({
			nama: 'X',
			whatsapp: '+62411123456',
			telepon: '0411 123',
			email: 'bukan email',
			website: 'javascript:alert(1)',
			instagram: 'https://facebook.com/x',
			maps_url: null
		});
		expect(k).toEqual([]);
	});
});

describe('relEksternal', () => {
	it('kiriman mahasiswa diberi nofollow ugc', () => {
		expect(relEksternal('mahasiswa')).toContain('nofollow ugc');
		expect(relEksternal('pipeline')).not.toContain('nofollow');
		expect(relEksternal('pipeline')).toContain('noopener');
	});
});
