// Rencana pencarian Google Maps: query x wilayah. Semua query berbahasa Indonesia (hl=id).
import fs from 'node:fs';
import path from 'node:path';
import { slugify } from '../../src/lib/shared/slug.js';
import { KABKOTA, kabkotaLabel } from '../../src/lib/shared/wilayah.js';
import { CONFIG_DIR } from '../lib/paths.js';
import { seedSearches } from '../sources/seed.js';

/** Query se-Kota Makassar (paling lengkap: kota terbesar, pusat industri IT Sulsel). */
export const QUERY_MAKASSAR = [
	'software house',
	'perusahaan software',
	'jasa pembuatan aplikasi',
	'jasa pembuatan website',
	'developer aplikasi android',
	'konsultan IT',
	'IT solution',
	'system integrator',
	'jasa instalasi jaringan komputer',
	'keamanan siber',
	'penyedia layanan internet',
	'data center',
	'perusahaan telekomunikasi',
	'digital agency',
	'digital marketing agency',
	'creative agency',
	'studio animasi',
	'game developer',
	'startup teknologi',
	'coworking space',
	'inkubator bisnis',
	'dinas komunikasi dan informatika'
];

/** Query padat per kecamatan Makassar (viewport diperbesar ke kecamatan itu). */
export const QUERY_KECAMATAN = ['software house', 'jasa pembuatan website', 'konsultan IT'];

/** Query ringkas untuk 23 kab/kota lain. */
export const QUERY_KABKOTA = [
	'software house',
	'jasa pembuatan website',
	'konsultan IT',
	'penyedia layanan internet',
	'digital agency',
	'jasa instalasi jaringan komputer',
	'dinas komunikasi dan informatika'
];

/** Pusat kecamatan Makassar yang belum ada di OSM (admin_level=6). */
const KECAMATAN_CADANGAN = [
	{ nama: 'Tamalanrea', kabkota: 'makassar', pusat: [-5.1306, 119.4886] }
];

/**
 * @typedef {{ id: string, kab: string, query: string, text: string, lat: number, lng: number, zoom: number, label: string }} MapsSearch
 */

function kecamatanMakassar() {
	/** @type {{ nama: string, kabkota: string, pusat: number[] }[]} */
	let list = [];
	try {
		const fc = JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, 'kecamatan.geojson'), 'utf8'));
		list = fc.features.map((/** @type {any} */ f) => f.properties);
	} catch {
		/* belum ada: jalankan `pipeline geo` */
	}
	const mks = list.filter((k) => k.kabkota === 'makassar' && k.nama !== 'Kepulauan Sangkarrang');
	for (const c of KECAMATAN_CADANGAN) if (!mks.some((k) => k.nama === c.nama)) mks.push(c);
	return mks.sort((a, b) => a.nama.localeCompare(b.nama));
}

/**
 * Daftar pencarian terurut (Makassar dulu, lalu kab/kota lain, lalu pencarian entri seed).
 * @param {{ kab?: string[], seed?: boolean }} [opts]
 * @returns {MapsSearch[]}
 */
export function planMapsSearches(opts = {}) {
	const only = opts.kab?.length ? new Set(opts.kab) : null;
	/** @type {MapsSearch[]} */
	const out = [];
	for (const k of KABKOTA) {
		if (only && !only.has(k.slug)) continue;
		if (k.slug === 'makassar') {
			for (const q of QUERY_MAKASSAR) {
				out.push({
					id: `makassar--${slugify(q)}`,
					kab: 'makassar',
					query: q,
					text: `${q} makassar`,
					lat: k.pusat[0],
					lng: k.pusat[1],
					zoom: 13,
					label: 'Kota Makassar'
				});
			}
			for (const kec of kecamatanMakassar()) {
				for (const q of QUERY_KECAMATAN) {
					out.push({
						id: `makassar-${slugify(kec.nama)}--${slugify(q)}`,
						kab: 'makassar',
						query: q,
						text: `${q} ${kec.nama} makassar`,
						lat: kec.pusat[0],
						lng: kec.pusat[1],
						zoom: 15,
						label: `Kec. ${kec.nama}, Makassar`
					});
				}
			}
			continue;
		}
		const nama = kabkotaLabel(k.slug);
		for (const q of QUERY_KABKOTA) {
			out.push({
				id: `${k.slug}--${slugify(q)}`,
				kab: k.slug,
				query: q,
				text: `${q} ${nama}`,
				lat: k.pusat[0],
				lng: k.pusat[1],
				zoom: 12,
				label: k.nama
			});
		}
	}
	if (opts.seed !== false) out.push(...seedSearches({ kab: opts.kab }));
	return out;
}

/** @param {MapsSearch} s */
export function searchUrl(s) {
	return `https://www.google.com/maps/search/${encodeURIComponent(s.text)}/@${s.lat},${s.lng},${s.zoom}z?hl=id`;
}
