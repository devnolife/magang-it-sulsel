#!/usr/bin/env node
// npm run gen:lembar
// Menggambar ulang siluet Sulsel untuk lembar atlas di halaman depan dari
// pipeline/config/kabkota.geojson. Hasilnya static/peta/sulsel.svg, dipakai sebagai CSS mask
// supaya warnanya ikut tema dan berkasnya bisa di-cache browser.
import fs from 'node:fs';
import {
	BATAS_LEMBAR,
	LEBAR_LEMBAR,
	TINGGI_LEMBAR,
	proyeksiLembar
} from '../src/lib/shared/lembar.js';

const TOLERANSI = 0.7; // unit viewBox (~350 m)
const LUAS_MIN = 1.5; // unit²; pulau yang lebih kecil dibuang
const GARIS = 1.6; // tebal garis batas, unit viewBox
const ISI = 0.16; // alfa daratan
const GARIS_ALFA = 0.62; // alfa garis pantai & batas kab/kota

/**
 * Jarak titik p ke ruas a–b.
 * @param {number[]} p @param {number[]} a @param {number[]} b
 */
function jarakRuas(p, a, b) {
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	const l2 = dx * dx + dy * dy;
	const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
	return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/**
 * Douglas–Peucker iteratif.
 * @param {number[][]} pts @param {number} tol
 */
function sederhanakan(pts, tol) {
	if (pts.length < 4) return pts;
	const simpan = new Uint8Array(pts.length);
	simpan[0] = simpan[pts.length - 1] = 1;
	/** @type {[number, number][]} */
	const tumpukan = [[0, pts.length - 1]];
	while (tumpukan.length) {
		const [a, b] = /** @type {[number, number]} */ (tumpukan.pop());
		let maks = 0;
		let idx = -1;
		for (let i = a + 1; i < b; i++) {
			const d = jarakRuas(pts[i], pts[a], pts[b]);
			if (d > maks) {
				maks = d;
				idx = i;
			}
		}
		if (maks > tol) {
			simpan[idx] = 1;
			tumpukan.push([a, idx], [idx, b]);
		}
	}
	return pts.filter((_, i) => simpan[i]);
}

/** @param {number[][]} pts */
function luas(pts) {
	let s = 0;
	for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
		s += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
	}
	return Math.abs(s / 2);
}

/** @param {number[][]} ring [[lng, lat], ...] */
function diLembar(ring) {
	const { barat, timur, utara, selatan } = BATAS_LEMBAR;
	return ring.some(([lng, lat]) => lng >= barat && lng <= timur && lat <= utara && lat >= selatan);
}

/** @param {number[][]} pts titik bulat */
function kePath(pts) {
	const [x0, y0] = pts[0];
	const token = [];
	for (let i = 1; i < pts.length; i++) {
		token.push(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
	}
	return `M${x0} ${y0}l${token.join(' ').replace(/ -/g, '-')}z`;
}

const geo = JSON.parse(fs.readFileSync('pipeline/config/kabkota.geojson', 'utf8'));
const potongan = [];
let titikAwal = 0;
let titikAkhir = 0;
for (const f of geo.features) {
	const poligon = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
	// hanya cincin luar: enklave (mis. kota di tengah kabupaten) tetap tergambar oleh fiturnya sendiri
	for (const [luar] of /** @type {number[][][][]} */ (poligon)) {
		titikAwal += luar.length;
		if (!diLembar(luar)) continue;
		const proyek = luar.map(([lng, lat]) => proyeksiLembar(lat, lng));
		if (luas(proyek) < LUAS_MIN) continue;
		const bulat = [];
		for (const p of sederhanakan(proyek, TOLERANSI)) {
			const q = [Math.round(p[0]), Math.round(p[1])];
			const akhir = bulat[bulat.length - 1];
			if (!akhir || akhir[0] !== q[0] || akhir[1] !== q[1]) bulat.push(q);
		}
		if (bulat.length < 4) continue;
		titikAkhir += bulat.length;
		potongan.push(kePath(bulat));
	}
}

const d = potongan.join('');
fs.mkdirSync('static/peta', { recursive: true });
// satu mask alfa: daratan tipis, garis batas tegas; warnanya dari background elemen
const svg =
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LEBAR_LEMBAR} ${TINGGI_LEMBAR}">` +
	`<path d="${d}" fill="#000" fill-opacity="${ISI}" stroke="#000" stroke-opacity="${GARIS_ALFA}" ` +
	`stroke-width="${GARIS}" stroke-linejoin="round"/></svg>\n`;
fs.writeFileSync('static/peta/sulsel.svg', svg);
console.log(
	`✓ ${potongan.length} cincin, ${titikAwal} → ${titikAkhir} titik; ` +
		`static/peta/sulsel.svg ${(svg.length / 1024).toFixed(1)} KB`
);
