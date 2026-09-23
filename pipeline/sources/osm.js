// Tahap `osm`: tempat berunsur IT dari OpenStreetMap (Overpass) di Sulawesi Selatan.
// Data OSM © OpenStreetMap contributors, lisensi ODbL; atribusi dicatat per entri (osm_url).
import path from 'node:path';
import { inBbox } from '../../src/lib/shared/geo.js';
import { SULSEL_BBOX } from '../../src/lib/shared/wilayah.js';
import { readJsonIfExists, writeJsonAtomic } from '../lib/cache.js';
import { overpass } from '../lib/http.js';
import { CACHE_DIR } from '../lib/paths.js';

export const OSM_CACHE = path.join(CACHE_DIR, 'osm.json');

const NAMA_IT =
	'software|teknologi|technology|techno|digital|informatika|solusi|solution|system|sistem|aplikasi|web|network|jaringan|internet|telekomunikasi|telecom|data|cyber|cloud|komputer|computer|\\bIT\\b';

export const OSM_QUERY = `[out:json][timeout:180];
area["ISO3166-2"="ID-SN"]["admin_level"="4"]->.a;
(
  nwr["name"]["office"~"^(it|telecommunication|coworking)$"](area.a);
  nwr["name"]["amenity"="coworking_space"](area.a);
  nwr["name"]["telecom"="data_center"](area.a);
  nwr["name"]["office"="government"]["name"~"kominfo|komunikasi|informatika|statistik|\\\\bBPS\\\\b",i](area.a);
  nwr["name"]["office"]["office"!="government"]["name"~"${NAMA_IT.replace(/\\/g, '\\\\')}",i](area.a);
);
out center tags;`;

/** Label kategori (gaya kategori Maps) untuk tag OSM utama. */
const LABEL = {
	'office=it': 'Kantor IT',
	'office=telecommunication': 'Penyedia Layanan Telekomunikasi',
	'office=coworking': 'Ruang Kerja Bersama',
	'amenity=coworking_space': 'Ruang Kerja Bersama',
	'telecom=data_center': 'Pusat data',
	'office=government': 'Kantor Pemerintah',
	'office=company': 'Kantor Perusahaan',
	'office=educational_institution': 'Lembaga Pendidikan',
	'office=ngo': 'Organisasi Nonprofit'
};

const KEEP_TAGS = ['office', 'amenity', 'telecom', 'shop', 'craft', 'operator', 'description'];

/**
 * @param {Record<string, string>} t
 * @returns {string | null}
 */
function alamatDariTag(t) {
	if (t['addr:full']) return t['addr:full'];
	const jalan = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' No. ');
	const parts = [
		jalan,
		t['addr:suburb'] || t['addr:subdistrict'],
		t['addr:city'] || t['addr:district'],
		t['addr:postcode']
	].filter(Boolean);
	return parts.length ? parts.join(', ') : null;
}

/**
 * Normalkan elemen Overpass (`out center tags`) ke bentuk Tempat.
 * @param {any[]} elements
 * @returns {import('./maps-parse.js').Tempat[]}
 */
export function normalizeOsm(elements) {
	/** @type {import('./maps-parse.js').Tempat[]} */
	const out = [];
	for (const el of elements) {
		const t = /** @type {Record<string, string>} */ (el.tags || {});
		const nama = (t.name || t['name:id'] || '').trim();
		if (!nama) continue;
		const lat = el.lat ?? el.center?.lat ?? null;
		const lng = el.lon ?? el.center?.lon ?? null;
		if (lat == null || lng == null || !inBbox(lat, lng, SULSEL_BBOX)) continue;
		const mainKey = ['telecom', 'amenity', 'office'].find(
			(k) => t[k] && LABEL[/** @type {keyof typeof LABEL} */ (`${k}=${t[k]}`)]
		);
		const kategori = mainKey
			? LABEL[/** @type {keyof typeof LABEL} */ (`${mainKey}=${t[mainKey]}`)]
			: t.office
				? `Kantor (${t.office})`
				: null;
		/** @type {Record<string, string>} */
		const tags_osm = {};
		for (const k of KEEP_TAGS) if (t[k]) tags_osm[k] = t[k];
		out.push({
			sumber: 'osm',
			key: `osm:${el.type}/${el.id}`,
			nama,
			kategori,
			tags_osm,
			alamat: alamatDariTag(t),
			lat,
			lng,
			telepon: t.phone || t['contact:phone'] || t['contact:mobile'] || null,
			website: t.website || t['contact:website'] || t.url || null,
			email: t.email || t['contact:email'] || null,
			rating: null,
			jumlah_ulasan: null,
			maps_url: null,
			osm_url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
			google_fid: null,
			status_tempat: t.disused === 'yes' || t['disused:office'] ? 'tutup-permanen' : null
		});
	}
	out.sort((a, b) => a.key.localeCompare(b.key));
	return out;
}

/**
 * @param {{ fresh?: boolean }} [opts]
 */
export async function runOsm(opts = {}) {
	const cached = readJsonIfExists(OSM_CACHE);
	if (cached && !opts.fresh) {
		console.log(
			`• OSM: ${cached.places.length} tempat dari cache (${cached.fetched_at}); --fresh untuk ulang`
		);
		return cached.places;
	}
	console.log('• Overpass: tempat berunsur IT di Sulsel…');
	const data = await overpass(OSM_QUERY, { timeoutMs: 200_000 });
	const places = normalizeOsm(data.elements || []);
	writeJsonAtomic(OSM_CACHE, { fetched_at: new Date().toISOString(), places });
	console.log(`✓ OSM: ${places.length} tempat (${data.elements?.length ?? 0} elemen mentah)`);
	return places;
}

/** @returns {import('./maps-parse.js').Tempat[]} */
export function loadOsmCache() {
	return readJsonIfExists(OSM_CACHE)?.places ?? [];
}
