import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	isBlocked,
	parseFeedHtml,
	parsePlaceHtml,
	parsePlaceUrl,
	parseRatingLabel,
	unwrapGoogleRedirect
} from './maps-parse.js';

const fixture = (/** @type {string} */ name) =>
	readFileSync(new URL(`../../tests/fixtures/${name}`, import.meta.url), 'utf8');

describe('maps-parse', () => {
	it('mengurai URL tempat', () => {
		const u = parsePlaceUrl(
			'https://www.google.com/maps/place/X/data=!4m7!3m6!1s0x2dbf1d22f755c14f:0x1b8fa9979b10998d!8m2!3d-5.1839567!4d119.3894887!16s%2Fg%2F11x6!19sChIJT8FV9yIdvy0RjZkQm5epjxs?hl=id'
		);
		expect(u).toEqual({
			fid: '0x2dbf1d22f755c14f:0x1b8fa9979b10998d',
			lat: -5.1839567,
			lng: 119.3894887,
			placeId: 'ChIJT8FV9yIdvy0RjZkQm5epjxs'
		});
		expect(parsePlaceUrl('https://www.google.com/maps/place/X/@-5.1,119.4,17z').lat).toBe(-5.1);
	});

	it('mengurai label rating & redirect', () => {
		expect(parseRatingLabel('4,6 bintang 1.234 Ulasan')).toEqual({ rating: 4.6, ulasan: 1234 });
		expect(unwrapGoogleRedirect('https://www.google.com/url?q=https://contoh.id/&sa=U')).toBe(
			'https://contoh.id/'
		);
		expect(unwrapGoogleRedirect('javascript:alert(1)')).toBeNull();
	});

	it('mengurai daftar hasil dari fixture', () => {
		const { places, end } = parseFeedHtml(fixture('maps-feed.html'), { query: 'software house' });
		expect(end).toBe(false);
		expect(places.length).toBe(9);
		const p = places.find((x) => x.nama.startsWith('PT. Aplikasi Solusindo'));
		expect(p).toMatchObject({
			sumber: 'maps',
			kategori: 'Perusahaan Software',
			alamat: 'Rafflesia Residence - Metro, Jl. Adelia No.16',
			telepon: '0813-1881-1574',
			website: 'https://aplikasindo.id/',
			rating: 5,
			jumlah_ulasan: 21,
			google_fid: '0x2dbf1d22f755c14f:0x1b8fa9979b10998d',
			query: 'software house'
		});
		expect(p?.maps_url).toContain('query_place_id=ChIJ');
		expect(places.every((x) => x.lat != null && x.lng != null)).toBe(true);
		// kartu tanpa telepon/website tetap terbaca
		expect(places[0]).toMatchObject({
			telepon: null,
			website: null,
			kategori: 'Perusahaan Software'
		});
	});

	it('mendeteksi akhir daftar & status tutup', () => {
		const html = `<div role="feed"><div><a href="/maps/place/A/data=!1s0x1:0x2!3d-5.1!4d119.4" aria-label="Toko A"></a>
			<div class="W4Efsd"><div class="W4Efsd"><span>Toko Komputer</span></div><div class="W4Efsd"><span>Tutup permanen</span></div></div></div>
			<p>Anda telah mencapai akhir daftar.</p></div>`;
		const { places, end } = parseFeedHtml(html);
		expect(end).toBe(true);
		expect(places[0]).toMatchObject({ nama: 'Toko A', status_tempat: 'tutup-permanen' });
	});

	it('mengurai panel tempat dari fixture', () => {
		const url =
			'https://www.google.com/maps/place/PT/@-5.1839567,119.3894887,17z/data=!3m1!4b1!4m6!3m5!1s0x2dbf1d22f755c14f:0x1b8fa9979b10998d!8m2!3d-5.1839567!4d119.3894887?hl=id';
		const p = parsePlaceHtml(fixture('maps-place.html'), url);
		expect(p).toMatchObject({
			kategori: 'Perusahaan Software',
			telepon: '081318811574',
			website: 'https://aplikasindo.id/',
			rating: 5,
			jumlah_ulasan: 21,
			lat: -5.1839567
		});
		expect(p?.alamat).toContain('Kec. Tamalate, Kota Makassar');
	});

	it('halaman alamat gedung tidak mengambil rating usaha di "Di tempat ini"', () => {
		const html = `<div role="main"><h1>Jl. A. P. Pettarani No.9 Lt 3</h1><h2>Di tempat ini</h2>
			<div role="article"><span role="img" aria-label="4,5 bintang 228 Ulasan"></span></div></div>`;
		const p = parsePlaceHtml(html, 'https://www.google.com/maps/search/?api=1&query=x');
		expect(p).toMatchObject({
			nama: 'Jl. A. P. Pettarani No.9 Lt 3',
			kategori: null,
			rating: null
		});
		expect(p?.jumlah_ulasan).toBeNull();
	});

	it('mengenali halaman blokir', () => {
		expect(isBlocked('https://www.google.com/sorry/index?continue=x', '')).toBe(true);
		expect(
			isBlocked('https://www.google.com/maps', 'Our systems have detected unusual traffic')
		).toBe(true);
		expect(isBlocked('https://www.google.com/maps/search/x', 'Hasil')).toBe(false);
	});
});
