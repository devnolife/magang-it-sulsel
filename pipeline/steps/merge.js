// Tahap `merge`: gabung Maps + OSM + seed, dedupe, tentukan kab/kota & kecamatan, tempelkan
// lowongan seed. Hasil: pipeline/cache/merged.json (masukan tahap detail/enrich/classify).
import fs from 'node:fs';
import path from 'node:path';
import { findArea, haversineKm } from '../../src/lib/shared/geo.js';
import { MAGANG_RE } from '../../src/lib/shared/magang-status.js';
import { isMobile, normalizePhone, phoneFromWaUrl } from '../../src/lib/shared/phone.js';
import { namaKey } from '../../src/lib/shared/slug.js';
import { kabkotaBySlug, kabkotaFromText } from '../../src/lib/shared/wilayah.js';
import { readJson, writeJsonAtomic } from '../lib/cache.js';
import { CACHE_DIR, CONFIG_DIR } from '../lib/paths.js';
import { loadMapsCache } from '../sources/maps.js';
import { loadOsmCache } from '../sources/osm.js';
import { loadSeed, seedSearchId } from '../sources/seed.js';

export const MERGED_FILE = path.join(CACHE_DIR, 'merged.json');

/**
 * @typedef {import('../sources/maps-parse.js').Tempat} Tempat
 * @typedef {import('../sources/seed.js').SeedEntry} SeedEntry
 * @typedef {import('../sources/seed.js').SeedLowongan} SeedLowongan
 * @typedef {{ features: { properties: { slug: string, nama?: string }, geometry: import('../../src/lib/shared/geo.js').AreaGeometry }[] }} FC
 * @typedef {{ kabkota: FC, kecamatan: FC }} Geo
 * @typedef {{ judul: string, url: string, sumber: string, ditemukan_pada: string, tutup_pada: string | null }} LowonganKandidat
 * @typedef {{ tipe: 'lowongan' | 'halaman-karir' | 'kurasi' | 'pengalaman', url: string | null, kutipan: string | null, tanggal: string | null }} Bukti
 */

/**
 * @typedef {object} Kandidat
 * @property {string} key
 * @property {string} nama
 * @property {string} nama_asli             nama listing apa adanya (sinyal klasifikasi)
 * @property {string[]} kategori
 * @property {Record<string, string> | null} tags_osm
 * @property {string | null} alamat
 * @property {number | null} lat
 * @property {number | null} lng
 * @property {string} kabkota
 * @property {string | null} kecamatan
 * @property {string | null} telepon
 * @property {string | null} whatsapp
 * @property {string | null} email
 * @property {string | null} website
 * @property {string | null} instagram
 * @property {string | null} linkedin
 * @property {string | null} url_karir
 * @property {number | null} rating
 * @property {number | null} jumlah_ulasan
 * @property {string | null} maps_url
 * @property {string | null} osm_url
 * @property {string | null} google_fid
 * @property {string | null} osm_id
 * @property {string[]} queries
 * @property {boolean} sponsor
 * @property {'tutup-sementara' | null} status_tempat
 * @property {('maps' | 'osm' | 'kurasi')[]} sumber
 * @property {null | { key: string, asal: string, masuk: boolean | null, jenis: string, deskripsi: string | null, tags: string[], peringatan: string | null, status_web: string | null, catatan: string | null }} seed
 * @property {LowonganKandidat[]} lowongan
 * @property {Bukti[]} magang_bukti
 * @property {string[]} anggota
 */

// ---------------------------------------------------------------------------------------------
// Nama & domain

const STOP = new Set([
	'dan',
	'the',
	'of',
	'di',
	'kantor',
	'office',
	'kab',
	'kabupaten',
	'kota',
	'kec',
	'kecamatan'
]);

/** @type {[RegExp, string][]} */
const SINONIM = [
	[/\bdiskominfo(sp)?\b/g, 'dinas komunikasi informatika'],
	[/\bkominfo(sp)?\b/g, 'komunikasi informatika'],
	[/\bbps\b/g, 'badan pusat statistik'],
	[/\bprov\b/g, 'provinsi'],
	[/\bsulsel\b/g, 'sulawesi selatan'],
	[/\bmks\b/g, 'makassar'],
	[/\btechnology\b/g, 'teknologi'],
	[/\btekno\b/g, 'teknologi']
];

/**
 * Token nama untuk perbandingan (tanpa badan usaha, sinonim instansi diseragamkan).
 * @param {string | null | undefined} nama
 */
export function nameTokens(nama) {
	let s = namaKey(nama);
	for (const [re, rep] of SINONIM) s = s.replace(re, rep);
	return new Set(s.split(' ').filter((t) => t && !STOP.has(t)));
}

/**
 * @param {Set<string>} a
 * @param {Set<string>} b
 */
export function jaccard(a, b) {
	if (!a.size || !b.size) return 0;
	let n = 0;
	for (const t of a) if (b.has(t)) n++;
	return n / (a.size + b.size - n);
}

/** Host yang bukan identitas perusahaan (media sosial, pemendek tautan, marketplace). */
const HOST_UMUM =
	/(^|\.)(facebook\.com|fb\.com|fb\.me|instagram\.com|linktr\.ee|wa\.me|whatsapp\.com|bit\.ly|s\.id|tiktok\.com|youtube\.com|youtu\.be|twitter\.com|x\.com|t\.me|linkedin\.com|google\.com|goo\.gl|g\.page|g\.co|shopee\.co\.id|tokopedia\.com|bukalapak\.com|lynk\.id|heylink\.me|taplink\.cc|linkbio\.co|msha\.ke|wixsite\.com)$/i;

/** @param {string | null | undefined} url */
export function hostOf(url) {
	if (!url) return null;
	try {
		const u = new URL(url);
		if (!/^https?:$/.test(u.protocol)) return null;
		return u.hostname.toLowerCase().replace(/^www\d?\./, '');
	} catch {
		return null;
	}
}

/**
 * Kunci domain untuk dedupe; null untuk media sosial dsb.
 * @param {string | null | undefined} url
 */
export function domainKey(url) {
	const host = hostOf(url);
	return host && !HOST_UMUM.test(host) ? host : null;
}

// Kata layanan khas judul SEO. Nama daerah sengaja tidak ikut: "BPS - Kabupaten Gowa" harus utuh.
const SEO =
	/\b(jasa|pembuatan|bikin|website|web|aplikasi|software|developer|digital|agency|agensi|terbaik|murah|profesional|terpercaya|service|services|solusi|konsultan|seo|marketing|toko online|android|ios|house)\b/i;

/** Kata yang tidak menunjukkan merek (untuk memilih potongan nama yang paling "merek"). */
const GENERIK_NAMA = new Set(
	(
		'jasa layanan pembuatan bikin website web situs aplikasi app apps software developer development ' +
		'pengembang digital agency agensi creative kreatif desain design grafis terbaik murah profesional ' +
		'terpercaya service services servis solusi solution solutions konsultan consultant seo marketing ' +
		'iklan ads android ios mobile house it dan di and kota kab kabupaten makassar gowa maros sulawesi ' +
		'selatan sulsel indonesia umkm online toko'
	).split(' ')
);
const AWALAN_JASA = /^(jasa|layanan|pembuatan|bikin|kursus|servis|service)\b/i;

/** @param {string} p */
function skorGenerik(p) {
	if (AWALAN_JASA.test(p)) return 1;
	const t = namaKey(p).split(' ').filter(Boolean);
	return t.length ? t.filter((x) => GENERIK_NAMA.has(x)).length / t.length : 1;
}

/**
 * Buang ekor SEO dari nama listing Maps:
 * "Afila Media Karya - Jasa Pembuatan Website (Software House) Makassar" -> "Afila Media Karya",
 * "Jasa Pembuatan Website - Dakocang Digital Creative" -> "Dakocang Digital Creative".
 * @param {string} nama
 */
export function bersihkanNama(nama) {
	const asli = nama.trim().replace(/\s+/g, ' ');
	let s = asli;
	const parts = asli.split(/\s+[-|–—]\s+/).filter((p) => p.length >= 2);
	if (parts.length > 1) {
		const skor = parts.map(skorGenerik);
		let i = skor.findIndex((x) => x < 0.6);
		if (i < 0) {
			const min = Math.min(...skor);
			i = min < 1 ? skor.indexOf(min) : 0;
		}
		if (parts.some((p, j) => j !== i && SEO.test(p))) s = parts[i];
	}
	s = s.replace(/\s*\(([^)]*)\)\s*$/, (all, inner) =>
		SEO.test(inner) && !/persero|tbk/i.test(inner) ? '' : all
	);
	return s.trim() || asli;
}

/**
 * Website isian pemilik listing kadang berekor teks
 * ("http://www.pln.co.id/%20%7C%20Playstore/Appstore%20:%20PLN%20Mobile%20App"): potong di spasi pertama.
 * @param {string} url
 */
export function bersihkanUrl(url) {
	const i = url.trim().search(/\s|%20/i);
	return i > 0
		? url
				.trim()
				.slice(0, i)
				.replace(/[|,;:]+$/, '')
		: url.trim();
}

/**
 * Pisahkan tautan "website" yang sebenarnya akun media sosial.
 * @param {string | null | undefined} url
 * @returns {{ website: string | null, instagram: string | null, linkedin: string | null, whatsapp: string | null }}
 */
export function klasifikasiTautan(url) {
	const out = { website: null, instagram: null, linkedin: null, whatsapp: null };
	const bersih = url ? bersihkanUrl(url) : null;
	const host = hostOf(bersih);
	if (!bersih || !host) return out;
	if (/(^|\.)instagram\.com$/.test(host)) return { ...out, instagram: bersih };
	if (/(^|\.)linkedin\.com$/.test(host)) return { ...out, linkedin: bersih };
	if (host === 'wa.me' || host.endsWith('whatsapp.com')) {
		return { ...out, whatsapp: phoneFromWaUrl(bersih) };
	}
	return { ...out, website: bersih };
}

// ---------------------------------------------------------------------------------------------
// Wilayah

const OFFSETS = [0.004, 0.01, 0.02].flatMap((d) => [
	[d, 0],
	[-d, 0],
	[0, d],
	[0, -d],
	[d, d],
	[d, -d],
	[-d, d],
	[-d, -d]
]);

/**
 * Kab/kota lewat point-in-polygon; toleransi garis pantai (batas OSM disederhanakan & reklamasi)
 * dengan mencoba titik geser sampai ±2 km.
 * @param {number} lat
 * @param {number} lng
 * @param {FC} fc
 */
export function kabkotaDariTitik(lat, lng, fc) {
	const direct = findArea(lat, lng, fc);
	if (direct) return direct;
	for (const [dy, dx] of OFFSETS) {
		const k = findArea(lat + dy, lng + dx, fc);
		if (k) return k;
	}
	return null;
}

/** @param {string | null | undefined} alamat */
export function kecamatanDariAlamat(alamat) {
	const m = alamat?.match(/\bKec(?:amatan|\.)\s*([A-Z][A-Za-z'’ -]+?)\s*(?:,|$)/);
	return m ? m[1].trim() : null;
}

// ---------------------------------------------------------------------------------------------
// Dedupe

/**
 * @typedef {{ t: Tempat, i: number, tokens: Set<string>, nk: string, domain: string | null, phone: string | null }} Prep
 */

class DSU {
	/** @param {number} n */
	constructor(n) {
		this.p = Array.from({ length: n }, (_, i) => i);
	}
	/** @param {number} i */
	find(i) {
		while (this.p[i] !== i) {
			this.p[i] = this.p[this.p[i]];
			i = this.p[i];
		}
		return i;
	}
	/** @param {number} a @param {number} b */
	union(a, b) {
		const ra = this.find(a);
		const rb = this.find(b);
		if (ra !== rb) this.p[Math.max(ra, rb)] = Math.min(ra, rb);
	}
}

/**
 * Apakah dua tempat (beda sumber/listing) adalah entitas yang sama?
 * @param {Prep} a
 * @param {Prep} b
 */
export function samaTempat(a, b) {
	if (a.t.google_fid && a.t.google_fid === b.t.google_fid) return true;
	if (a.t.lat == null || b.t.lat == null || a.t.lng == null || b.t.lng == null) return false;
	const d =
		haversineKm(
			{ lat: a.t.lat, lng: a.t.lng },
			{ lat: /** @type {number} */ (b.t.lat), lng: /** @type {number} */ (b.t.lng) }
		) * 1000;
	if (d > 1000) return false;
	const sim = jaccard(a.tokens, b.tokens);
	if (a.nk && a.nk === b.nk && d <= 300) return true;
	if (sim >= 0.5 && d <= 150) return true;
	if (a.domain && a.domain === b.domain && d <= 150 && sim >= 0.2) return true;
	// Aturan lemah nama (telepon, jarak sangat dekat) tidak berlaku bila websitenya berbeda: unit
	// kampus/anak usaha sering memakai nomor induk yang sama ("ICT CENTER" vs "Universitas ...").
	if (a.domain && b.domain && a.domain !== b.domain) return false;
	if (a.phone && a.phone === b.phone && d <= 300) return true;
	if (d <= 25 && sim >= 0.34) return true;
	return false;
}

/**
 * Gabungkan kemunculan berulang satu tempat Maps (beberapa query) + data halaman detail.
 * @param {{ query: string, places: Tempat[] }[]} searches
 * @param {Map<string, Tempat>} details
 */
export function kumpulkanMaps(searches, details) {
	/** @type {Map<string, Tempat & { queries: string[] }>} */
	const byKey = new Map();
	for (const s of searches) {
		for (const p of s.places) {
			const prev = byKey.get(p.key);
			if (!prev) {
				byKey.set(p.key, { ...p, queries: [s.query] });
				continue;
			}
			if (!prev.queries.includes(s.query)) prev.queries.push(s.query);
			for (const f of /** @type {const} */ ([
				'kategori',
				'telepon',
				'website',
				'rating',
				'jumlah_ulasan',
				'place_id',
				'status_tempat'
			])) {
				if (prev[f] == null && p[f] != null) /** @type {any} */ (prev)[f] = p[f];
			}
			if ((p.alamat?.length ?? 0) > (prev.alamat?.length ?? 0)) prev.alamat = p.alamat;
			if (p.maps_url?.includes('query_place_id') && !prev.maps_url?.includes('query_place_id')) {
				prev.maps_url = p.maps_url;
			}
			prev.sponsor = !!prev.sponsor && !!p.sponsor;
		}
	}
	for (const [key, d] of details) {
		const p = byKey.get(key);
		if (!p) continue;
		p.alamat = d.alamat || p.alamat;
		p.telepon = d.telepon || p.telepon;
		p.website = d.website || p.website;
		p.kategori = d.kategori || p.kategori;
		p.rating = d.rating ?? p.rating;
		p.jumlah_ulasan = d.jumlah_ulasan ?? p.jumlah_ulasan;
		if (d.status_tempat) p.status_tempat = d.status_tempat;
	}
	return [...byKey.values()];
}

/**
 * @param {Tempat[]} places
 * @returns {Tempat[][]}
 */
export function klasterkan(places) {
	/** @type {Prep[]} */
	// Nama bersih: dua usaha berbeda dengan ekor SEO yang sama tidak boleh tampak mirip.
	const prep = places.map((t, i) => ({
		t,
		i,
		tokens: nameTokens(bersihkanNama(t.nama)),
		nk: namaKey(bersihkanNama(t.nama)),
		domain: domainKey(t.website),
		phone: normalizePhone(t.telepon)
	}));
	const dsu = new DSU(prep.length);
	const byFid = new Map();
	for (const p of prep) {
		if (!p.t.google_fid) continue;
		if (byFid.has(p.t.google_fid)) dsu.union(byFid.get(p.t.google_fid), p.i);
		else byFid.set(p.t.google_fid, p.i);
	}
	const located = prep
		.filter((p) => p.t.lat != null)
		.sort((a, b) => /** @type {number} */ (a.t.lat) - /** @type {number} */ (b.t.lat));
	for (let x = 0; x < located.length; x++) {
		const a = located[x];
		for (let y = x + 1; y < located.length; y++) {
			const b = located[y];
			if (/** @type {number} */ (b.t.lat) - /** @type {number} */ (a.t.lat) > 0.01) break;
			if (Math.abs(/** @type {number} */ (b.t.lng) - /** @type {number} */ (a.t.lng)) > 0.01)
				continue;
			if (samaTempat(a, b)) dsu.union(a.i, b.i);
		}
	}
	/** @type {Map<number, Tempat[]>} */
	const groups = new Map();
	for (const p of prep) {
		const r = dsu.find(p.i);
		if (!groups.has(r)) groups.set(r, []);
		/** @type {Tempat[]} */ (groups.get(r)).push(p.t);
	}
	return [...groups.values()];
}

// ---------------------------------------------------------------------------------------------
// Susun kandidat

/**
 * Hasil Maps berupa alamat gedung/lantai ("Jl. X No.9 Lt 3"), bukan tempat usaha: baris keduanya
 * berisi nama usaha di alamat itu, sedangkan usahanya sendiri muncul sebagai listing terpisah.
 * @param {Tempat} t
 */
export function hanyaAlamat(t) {
	return (
		t.sumber === 'maps' &&
		/^(jl|jln|jalan)\.?\s/i.test(t.nama) &&
		t.rating == null &&
		t.jumlah_ulasan == null &&
		!t.telepon &&
		!t.website
	);
}

/**
 * @param {Tempat[]} members
 * @param {Geo} geo
 * @returns {Kandidat | { dibuang: string, nama: string }}
 */
export function susunKandidat(members, geo) {
	const maps = members
		.filter((m) => m.sumber === 'maps')
		.sort(
			(a, b) =>
				(b.jumlah_ulasan ?? -1) - (a.jumlah_ulasan ?? -1) ||
				Number(!!b.website) - Number(!!a.website) ||
				Number(!!b.telepon) - Number(!!a.telepon) ||
				a.key.localeCompare(b.key)
		);
	const osm = members.filter((m) => m.sumber === 'osm').sort((a, b) => a.key.localeCompare(b.key));
	const utama = maps[0] ?? osm[0];
	if (members.some((m) => m.status_tempat === 'tutup-permanen')) {
		return { dibuang: 'tutup-permanen', nama: utama.nama };
	}
	if (members.every(hanyaAlamat)) return { dibuang: 'alamat-saja', nama: utama.nama };
	const semua = [...maps, ...osm];
	const pick = (/** @type {(t: Tempat) => any} */ f) =>
		semua.map(f).find((v) => v != null && v !== '');

	const lat = utama.lat;
	const lng = utama.lng;
	let kabkota = null;
	if (lat != null && lng != null) kabkota = kabkotaDariTitik(lat, lng, geo.kabkota);
	if (!kabkota) return { dibuang: 'di-luar-sulsel', nama: utama.nama };

	let kecamatan = null;
	if (lat != null && lng != null) {
		const slug = findArea(lat, lng, geo.kecamatan);
		const f = slug ? geo.kecamatan.features.find((x) => x.properties.slug === slug) : null;
		kecamatan = f?.properties.nama ?? null;
	}
	const alamatPanjang = semua
		.map((m) => m.alamat)
		.filter(Boolean)
		.sort((a, b) => /** @type {string} */ (b).length - /** @type {string} */ (a).length)[0];
	kecamatan ??= kecamatanDariAlamat(alamatPanjang);

	const tautan = klasifikasiTautan(pick((t) => t.website));
	const telepon = semua.map((m) => normalizePhone(m.telepon)).find(Boolean) ?? null;
	/** @type {Set<string>} */
	const queries = new Set();
	for (const m of maps) for (const q of /** @type {any} */ (m).queries ?? []) queries.add(q);
	const kategori = [...new Set(semua.map((m) => m.kategori).filter(Boolean))];
	/** @type {('maps' | 'osm' | 'kurasi')[]} */
	const sumber = [];
	if (maps.length) sumber.push('maps');
	if (osm.length) sumber.push('osm');

	return {
		key: utama.key,
		nama: bersihkanNama(utama.nama),
		nama_asli: utama.nama,
		kategori: /** @type {string[]} */ (kategori),
		tags_osm: osm[0]?.tags_osm ?? null,
		alamat: alamatPanjang ?? null,
		lat,
		lng,
		kabkota,
		kecamatan,
		telepon,
		whatsapp: tautan.whatsapp ?? (isMobile(telepon) ? telepon : null),
		email: pick((t) => t.email) ?? null,
		website: tautan.website,
		instagram: tautan.instagram,
		linkedin: tautan.linkedin,
		url_karir: null,
		rating: maps[0]?.rating ?? null,
		jumlah_ulasan: maps[0]?.jumlah_ulasan ?? null,
		maps_url: maps[0]?.maps_url ?? null,
		osm_url: osm[0]?.osm_url ?? null,
		google_fid: maps[0]?.google_fid ?? null,
		osm_id: osm[0] ? osm[0].key.slice(4) : null,
		queries: [...queries].sort(),
		sponsor: maps.length > 0 && maps.every((m) => m.sponsor),
		status_tempat: members.some((m) => m.status_tempat === 'tutup-sementara')
			? 'tutup-sementara'
			: null,
		sumber,
		seed: null,
		lowongan: [],
		magang_bukti: [],
		anggota: members.map((m) => m.key).sort()
	};
}

// ---------------------------------------------------------------------------------------------
// Seed

/**
 * @param {SeedEntry} e
 * @param {Kandidat} k
 */
function lolosSeed(e, k) {
	const nama = k.nama_asli || k.nama;
	if (e.cocok?.length) {
		if (!e.cocok.every((re) => new RegExp(re, 'i').test(nama))) return false;
	} else if (e.nama) {
		const a = nameTokens(e.nama);
		const b = nameTokens(nama);
		const semuaAda = [...a].every((t) => b.has(t));
		if (!semuaAda && jaccard(a, b) < 0.5) return false;
	}
	if (e.tolak && new RegExp(e.tolak, 'i').test(nama)) return false;
	if (e.asal === 'instansi' && e.kabkota && k.kabkota !== e.kabkota) return false;
	// Kurasi: tempat yang punya website lain jelas bukan perusahaan yang sama.
	const domSeed = domainKey(e.website);
	const domK = domainKey(k.website);
	if (e.asal === 'kurasi' && domSeed && domK && domSeed !== domK) return false;
	return true;
}

/**
 * Cari kandidat untuk satu entri seed. Urutan: domain → telepon → hasil pencarian seed →
 * (instansi) pencarian umum.
 * @param {SeedEntry} e
 * @param {{ kandidat: Kandidat[], byDomain: Map<string, Kandidat[]>, byPhone: Map<string, Kandidat[]>, byMember: Map<string, Kandidat>, seedResults: Map<string, string[]>, claimed: Set<Kandidat> }} ctx
 * @returns {{ k: Kandidat, via: string } | null}
 */
export function cocokkanSeed(e, ctx) {
	const bebas = (/** @type {Kandidat} */ k) => !ctx.claimed.has(k);
	const hasilSeed = (ctx.seedResults.get(seedSearchId(e.key)) ?? [])
		.map((key) => ctx.byMember.get(key))
		.filter((k) => k != null);
	const pilih = (/** @type {Kandidat[]} */ list) =>
		list
			.filter(bebas)
			.sort((a, b) => Number(hasilSeed.includes(b)) - Number(hasilSeed.includes(a)))[0];

	const dom = domainKey(e.website);
	if (dom) {
		const k = pilih(ctx.byDomain.get(dom) ?? []);
		if (k) return { k, via: 'domain' };
	}
	for (const ph of [e.telepon, e.whatsapp]) {
		if (!ph) continue;
		// Nomor bisa dipakai bersama beberapa usaha milik satu orang: nama tetap harus cocok.
		const k = pilih((ctx.byPhone.get(ph) ?? []).filter((x) => lolosSeed(e, x)));
		if (k) return { k, via: 'telepon' };
	}
	const dariSeed = hasilSeed.find((k) => bebas(k) && lolosSeed(e, k));
	if (dariSeed) return { k: dariSeed, via: 'pencarian-seed' };
	if (e.asal === 'instansi' && e.cocok?.length) {
		const pusat = kabkotaBySlug(e.kabkota)?.pusat;
		const kantor = (/** @type {Kandidat} */ k) => Number(k.kategori.some((c) => KANTOR.test(c)));
		const cands = ctx.kandidat
			.filter((k) => bebas(k) && lolosSeed(e, k))
			.sort(
				(a, b) =>
					kantor(b) - kantor(a) ||
					(b.jumlah_ulasan ?? -1) - (a.jumlah_ulasan ?? -1) ||
					jarakKe(a, pusat) - jarakKe(b, pusat)
			);
		if (cands[0]) return { k: cands[0], via: 'pencarian-umum' };
	}
	return null;
}

/**
 * Instansi `unik` (Diskominfo, BPS) hanya ada satu per kab/kota. Listing lain yang lolos pola seed
 * yang sama adalah pin ganda, kantor lama, atau nama lama ("Dinas Infokom"), jadi dilebur ke entri
 * seed supaya tidak tampil dua kali. Kontak yang kosong di entri utama diisi dari listing tersebut.
 * @param {Kandidat[]} kandidat
 * @param {SeedEntry[]} entri
 * @returns {{ kandidat: Kandidat[], lebur: { key: string, nama: string, ke: string }[] }}
 */
export function leburInstansi(kandidat, entri) {
	/** @type {Set<Kandidat>} */
	const hapus = new Set();
	/** @type {{ key: string, nama: string, ke: string }[]} */
	const lebur = [];
	for (const e of entri) {
		if (e.asal !== 'instansi' || !e.unik || !e.kabkota || !e.cocok?.length) continue;
		const utama = kandidat.find((k) => k.seed?.key === e.key);
		if (!utama) continue;
		for (const k of kandidat) {
			if (k === utama || k.seed || hapus.has(k) || !lolosSeed(e, k)) continue;
			for (const f of /** @type {const} */ ([
				'telepon',
				'whatsapp',
				'email',
				'website',
				'instagram',
				'linkedin',
				'osm_url',
				'osm_id'
			])) {
				if (utama[f] == null && k[f] != null) /** @type {any} */ (utama)[f] = k[f];
			}
			utama.anggota = [...new Set([...utama.anggota, ...k.anggota])].sort();
			utama.queries = [...new Set([...utama.queries, ...k.queries])].sort();
			utama.kategori = [...new Set([...utama.kategori, ...k.kategori])];
			for (const s of k.sumber) if (!utama.sumber.includes(s)) utama.sumber.push(s);
			hapus.add(k);
			lebur.push({ key: e.key, nama: k.nama_asli, ke: utama.nama });
		}
	}
	return { kandidat: kandidat.filter((k) => !hapus.has(k)), lebur };
}

/** Kategori Maps/OSM kantor: dipilih lebih dulu daripada gerai/sekolah bernama mirip. */
const KANTOR = /pemerintah|dinas|instansi|badan|kantor/i;

/**
 * @param {Kandidat} k
 * @param {[number, number] | undefined} pusat
 */
function jarakKe(k, pusat) {
	if (!pusat || k.lat == null || k.lng == null) return Infinity;
	return haversineKm({ lat: k.lat, lng: k.lng }, { lat: pusat[0], lng: pusat[1] });
}

/**
 * Terapkan data seed ke kandidat (seed menang atas Maps/OSM untuk field yang diisinya).
 * @param {Kandidat} k
 * @param {SeedEntry} e
 */
function terapkanSeed(k, e) {
	k.seed = {
		key: e.key,
		asal: e.asal,
		masuk: e.masuk,
		jenis: e.jenis,
		deskripsi: e.deskripsi ?? null,
		tags: e.tags,
		peringatan: e.peringatan ?? null,
		status_web: e.status_web ?? null,
		catatan: e.catatan ?? null
	};
	// Instansi memakai label kurasi: nama Maps sering tanpa daerah ("Kantor BPS") atau tidak seragam.
	const nama = e.nama ?? (e.asal === 'instansi' ? e.label : null);
	if (nama) k.nama = nama;
	if (e.alamat) k.alamat = e.alamat;
	if (e.website) k.website = e.website;
	if (e.url_karir) k.url_karir = e.url_karir;
	if (e.email) k.email = e.email;
	if (e.instagram) k.instagram = e.instagram;
	if (e.linkedin) k.linkedin = e.linkedin;
	if (e.telepon) k.telepon = e.telepon;
	if (e.whatsapp) k.whatsapp = e.whatsapp;
	for (const b of e.magang_bukti) {
		k.magang_bukti.push({
			tipe: b.tipe,
			url: b.url ?? null,
			kutipan: b.kutipan ?? null,
			tanggal: b.tanggal ?? null
		});
	}
	if (!k.sumber.includes('kurasi')) k.sumber.push('kurasi');
}

/**
 * Kandidat dari seed saja (tanpa tempat Maps/OSM): kurasi `masuk: true` yang kab/kotanya
 * diketahui, atau instansi yang alamatnya diisi dari situs resmi.
 * @param {SeedEntry} e
 * @returns {Kandidat | null}
 */
function kandidatDariSeed(e) {
	const kabkota = e.kabkota ?? kabkotaFromText(e.alamat);
	const nama = e.nama ?? e.label;
	if (!kabkota || !nama) return null;
	const tautan = klasifikasiTautan(e.website);
	/** @type {Kandidat} */
	const k = {
		key: e.key,
		nama,
		nama_asli: nama,
		kategori: [],
		tags_osm: null,
		alamat: null,
		lat: null,
		lng: null,
		kabkota,
		kecamatan: kecamatanDariAlamat(e.alamat),
		telepon: null,
		whatsapp: null,
		email: null,
		website: tautan.website,
		instagram: null,
		linkedin: null,
		url_karir: null,
		rating: null,
		jumlah_ulasan: null,
		maps_url: null,
		osm_url: null,
		google_fid: null,
		osm_id: null,
		queries: [],
		sponsor: false,
		status_tempat: null,
		sumber: [],
		seed: null,
		lowongan: [],
		magang_bukti: [],
		anggota: []
	};
	terapkanSeed(k, e);
	return k;
}

// ---------------------------------------------------------------------------------------------
// Lowongan seed (JobStreet)

const GENERIK = new Set([
	'group',
	'grup',
	'indonesia',
	'makassar',
	'sulawesi',
	'selatan',
	'cabang',
	'wilayah',
	'area',
	'regional',
	'persero',
	'tbk'
]);

/** @param {string} nama */
function tokenPerusahaan(nama) {
	return new Set([...nameTokens(nama)].filter((t) => !GENERIK.has(t)));
}

/**
 * Tempelkan lowongan IT/magang ke kandidat yang namanya cocok.
 * @param {Kandidat[]} kandidat
 * @param {SeedLowongan[]} lowongan
 * @returns {{ cocok: number, tidakCocok: SeedLowongan[] }}
 */
export function tempelLowongan(kandidat, lowongan) {
	const idx = kandidat.map((k) => ({ k, tokens: tokenPerusahaan(k.nama) }));
	let cocok = 0;
	/** @type {SeedLowongan[]} */
	const tidakCocok = [];
	for (const l of lowongan) {
		if (!/^(IT|magang)$/i.test(l.kategori)) continue;
		const t = tokenPerusahaan(l.perusahaan);
		const kab = kabkotaFromText(l.lokasi);
		const hit = idx
			.filter(({ k, tokens }) => (!kab || k.kabkota === kab) && jaccard(t, tokens) >= 0.6)
			.sort((a, b) => jaccard(t, b.tokens) - jaccard(t, a.tokens))[0];
		if (!hit) {
			tidakCocok.push(l);
			continue;
		}
		cocok++;
		const k = hit.k;
		if (!k.lowongan.some((x) => x.url === l.url)) {
			k.lowongan.push({
				judul: l.judul,
				url: l.url,
				sumber: l.sumber,
				ditemukan_pada: l.ditemukan_pada,
				tutup_pada: null
			});
		}
		if (MAGANG_RE.test(l.judul) && !k.magang_bukti.some((b) => b.url === l.url)) {
			k.magang_bukti.push({
				tipe: 'lowongan',
				url: l.url,
				kutipan: `${l.judul} (${l.sumber})`,
				tanggal: l.ditemukan_pada
			});
		}
	}
	return { cocok, tidakCocok };
}

// ---------------------------------------------------------------------------------------------
// Orkestrasi

/**
 * @param {{ searches: { id: string, query: string, places: Tempat[] }[], details: Map<string, Tempat>, osm: Tempat[], seed: { entri: SeedEntry[], lowongan: SeedLowongan[] }, geo: Geo }} input
 */
export function gabungSemua(input) {
	const mapsPlaces = kumpulkanMaps(input.searches, input.details);
	const clusters = klasterkan([...mapsPlaces, ...input.osm]);
	/** @type {Kandidat[]} */
	const kandidat = [];
	/** @type {Record<string, number>} */
	const dibuang = {};
	for (const c of clusters) {
		const k = susunKandidat(c, input.geo);
		if ('dibuang' in k) dibuang[k.dibuang] = (dibuang[k.dibuang] || 0) + 1;
		else kandidat.push(k);
	}

	/** @type {Map<string, Kandidat>} */
	const byMember = new Map();
	/** @type {Map<string, Kandidat[]>} */
	const byDomain = new Map();
	/** @type {Map<string, Kandidat[]>} */
	const byPhone = new Map();
	/** @type {(m: Map<string, Kandidat[]>, key: string, k: Kandidat) => void} */
	const push = (m, key, k) => {
		const list = m.get(key) ?? [];
		if (!list.includes(k)) list.push(k);
		m.set(key, list);
	};
	for (const k of kandidat) {
		for (const a of k.anggota) byMember.set(a, k);
		const d = domainKey(k.website);
		if (d) push(byDomain, d, k);
		if (k.telepon) push(byPhone, k.telepon, k);
	}
	/** @type {Map<string, string[]>} */
	const seedResults = new Map();
	for (const s of input.searches) {
		if (s.id.startsWith('seed--'))
			seedResults.set(
				s.id,
				s.places.map((p) => p.key)
			);
	}

	const ctx = { kandidat, byDomain, byPhone, byMember, seedResults, claimed: new Set() };
	/** @type {{ key: string, nama: string, via: string, ke: string }[]} */
	const seedCocok = [];
	/** @type {{ key: string, nama: string, alasan: string }[]} */
	const seedTanpaTempat = [];
	for (const e of input.seed.entri) {
		const hit = cocokkanSeed(e, ctx);
		const label = e.nama ?? e.label ?? e.key;
		if (hit) {
			ctx.claimed.add(hit.k);
			seedCocok.push({ key: e.key, nama: label, via: hit.via, ke: hit.k.nama_asli });
			terapkanSeed(hit.k, e);
			continue;
		}
		if (e.masuk === true && (e.asal === 'kurasi' || e.alamat)) {
			const k = kandidatDariSeed(e);
			if (k) {
				kandidat.push(k);
				seedTanpaTempat.push({ key: e.key, nama: label, alasan: 'tanpa koordinat (seed saja)' });
				continue;
			}
		}
		if (e.masuk !== false) {
			seedTanpaTempat.push({
				key: e.key,
				nama: label,
				alasan: e.masuk === null ? 'pelengkap, tidak ditemukan' : 'tidak ditemukan di Maps/OSM'
			});
		}
	}
	const lebur = leburInstansi(kandidat, input.seed.entri);
	const low = tempelLowongan(lebur.kandidat, input.seed.lowongan);
	lebur.kandidat.sort((a, b) => a.key.localeCompare(b.key));
	return {
		kandidat: lebur.kandidat,
		statistik: {
			tempat_maps: mapsPlaces.length,
			tempat_osm: input.osm.length,
			klaster: clusters.length,
			kandidat: lebur.kandidat.length,
			dibuang,
			seed_cocok: seedCocok.length,
			instansi_dilebur: lebur.lebur.length,
			lowongan_cocok: low.cocok
		},
		seed_cocok: seedCocok,
		seed_tanpa_tempat: seedTanpaTempat,
		instansi_dilebur: lebur.lebur,
		lowongan_tidak_cocok: low.tidakCocok.map((l) => `${l.judul} · ${l.perusahaan} (${l.lokasi})`)
	};
}

/** @returns {Geo} */
export function loadGeo() {
	return {
		kabkota: readJson(path.join(CONFIG_DIR, 'kabkota.geojson')),
		kecamatan: readJson(path.join(CONFIG_DIR, 'kecamatan.geojson'))
	};
}

export function runMerge() {
	const { searches, details } = loadMapsCache();
	const osm = loadOsmCache();
	const seed = loadSeed();
	const hasil = gabungSemua({ searches, details, osm, seed, geo: loadGeo() });
	writeJsonAtomic(MERGED_FILE, { dibuat_pada: new Date().toISOString(), ...hasil });
	const s = hasil.statistik;
	console.log(
		`✓ merge: ${s.tempat_maps} tempat Maps (${searches.length} pencarian) + ${s.tempat_osm} OSM → ${s.kandidat} kandidat`,
		s.dibuang,
		`· seed cocok ${s.seed_cocok}, tanpa tempat ${hasil.seed_tanpa_tempat.length}, instansi dilebur ${s.instansi_dilebur} · lowongan cocok ${s.lowongan_cocok}`
	);
	return hasil;
}

/** @returns {{ kandidat: Kandidat[], [k: string]: any }} */
export function loadMerged() {
	if (!fs.existsSync(MERGED_FILE)) {
		throw new Error('cache/merged.json belum ada: jalankan `npm run pipeline -- merge` dulu');
	}
	return readJson(MERGED_FILE);
}
