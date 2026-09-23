// Tahap `export`: susun data/companies.json (kontrak src/lib/shared/company-schema.js) dari kandidat
// merge + hasil enrich + keputusan classify, lalu tulis data/laporan-pipeline.md untuk direview
// sebelum di-commit. id & slug dipakai ulang dari companies.json sebelumnya supaya URL tetap.
import fs from 'node:fs';
import { CompanySchema, parseDataset, SUMBER } from '../../src/lib/shared/company-schema.js';
import { JENIS } from '../../src/lib/shared/jenis.js';
import {
	deriveMagangStatus,
	MAGANG_RE,
	MAGANG_STATUS
} from '../../src/lib/shared/magang-status.js';
import { isMobile } from '../../src/lib/shared/phone.js';
import { namaKey, randomId, slugify, uniqueSlug } from '../../src/lib/shared/slug.js';
import { KABKOTA, kabkotaLabel } from '../../src/lib/shared/wilayah.js';
import { readJsonIfExists, writeJsonAtomic } from '../lib/cache.js';
import { DATASET_FILE, REPORT_FILE } from '../lib/paths.js';
import { loadClassified } from './classify.js';
import { hasilWeb, loadEnriched } from './enrich.js';
import { domainKey, loadMerged } from './merge.js';

/**
 * @typedef {import('./merge.js').Kandidat} Kandidat
 * @typedef {import('./classify.js').Keputusan} Keputusan
 * @typedef {import('./enrich.js').HasilWeb} HasilWeb
 * @typedef {import('../../src/lib/shared/company-schema.js').CompanyRecord} CompanyRecord
 * @typedef {import('../../src/lib/shared/company-schema.js').Dataset} Dataset
 */

export const ATRIBUSI = [
	'Data tempat © OpenStreetMap contributors, lisensi ODbL 1.0 (https://www.openstreetmap.org/copyright)',
	'Fakta bisnis publik dari Google Maps; setiap entri menautkan balik ke listing aslinya',
	'Pemeriksaan website perusahaan & kurasi manual magang-it-sulsel'
];

const F = CompanySchema.shape;
/**
 * Nilai lolos validasi field kontrak, atau null (dicatat supaya terlihat di laporan).
 * @template T
 * @param {keyof typeof F} field
 * @param {T | null | undefined} v
 * @param {string[]} [buang]
 * @returns {T | null}
 */
function sah(field, v, buang) {
	if (v == null || v === '') return null;
	if (F[field].safeParse(v).success) return v;
	buang?.push(`${field}: ${String(v).slice(0, 80)}`);
	return null;
}

const DESKRIPSI_KOSONG = /^(just another wordpress site|coming soon|home|beranda|welcome)\b/i;

/**
 * Satu entri dataset tanpa id/slug/diperbarui_pada (murni).
 * @param {Kandidat} k
 * @param {Keputusan} d
 * @param {HasilWeb | null} web
 * @param {string[]} [buang] field yang dibuang karena tidak valid
 */
export function susunEntri(k, d, web, buang = []) {
	const cek = web && web.status === 'aktif' && web.dicek ? web : null;
	const website = web?.hapus_website ? null : sah('website', k.website, buang);
	const telepon = sah('telepon', k.telepon, buang) ?? sah('telepon', cek?.telepon[0]);
	const whatsapp =
		sah('whatsapp', k.whatsapp, buang) ??
		sah('whatsapp', cek?.whatsapp[0]) ??
		(isMobile(telepon) ? telepon : null);
	const seedStatus = /** @type {CompanyRecord['status_web'] | null} */ (
		sah('status_web', k.seed?.status_web)
	);
	const status_web = seedStatus ?? (website ? (web?.status ?? 'aktif') : 'tidak-ada');

	const peringatanSeed = k.seed?.peringatan ?? null;
	const peringatan =
		[
			peringatanSeed,
			status_web === 'dibajak' && !/dibajak|judi/i.test(peringatanSeed ?? '')
				? 'Website resminya tampak dibajak (berisi konten judi); jangan isi data apa pun di sana.'
				: null,
			k.status_tempat === 'tutup-sementara' ? 'Tutup sementara menurut Google Maps.' : null
		]
			.filter(Boolean)
			.join(' ')
			.slice(0, 300) || null;

	const deskripsiWeb =
		cek?.deskripsi && cek.deskripsi.length >= 25 && !DESKRIPSI_KOSONG.test(cek.deskripsi)
			? cek.deskripsi
			: null;

	/** @type {CompanyRecord['magang_bukti']} */
	const bukti = [];
	const adaBukti = new Set();
	for (const b of [...k.magang_bukti, ...(cek?.bukti ?? [])]) {
		const kunci = `${b.tipe}|${b.url ?? ''}|${b.kutipan ?? ''}`;
		if (adaBukti.has(kunci) || bukti.length >= 20) continue;
		adaBukti.add(kunci);
		bukti.push({
			tipe: b.tipe,
			url: sah('website', b.url, buang),
			kutipan: b.kutipan ? b.kutipan.slice(0, 300) : null,
			tanggal: b.tanggal && /^\d{4}-\d{2}-\d{2}$/.test(b.tanggal) ? b.tanggal : null
		});
	}

	const tags = [...new Set([...(k.seed?.tags ?? []), ...k.kategori].map((t) => t.trim()))]
		.filter((t) => t && t.length <= 60)
		.slice(0, 12);
	const sumber = SUMBER.filter((s) => (s === 'website' ? !!cek : k.sumber.includes(s)));

	return {
		nama: (d.override?.nama ?? k.nama).slice(0, 160),
		jenis: d.jenis ?? 'software',
		tags,
		deskripsi: (d.override?.deskripsi ?? k.seed?.deskripsi ?? deskripsiWeb)?.slice(0, 600) ?? null,
		alamat: k.alamat ? k.alamat.slice(0, 300) : null,
		kabkota: k.kabkota,
		kecamatan: k.kecamatan ? k.kecamatan.slice(0, 80) : null,
		lat: k.lat,
		lng: k.lng,
		telepon,
		whatsapp,
		email:
			sah('email', k.email?.toLowerCase(), buang) ?? sah('email', cek?.email[0]?.toLowerCase()),
		website,
		instagram: sah('instagram', k.instagram, buang) ?? sah('instagram', cek?.instagram),
		linkedin: sah('linkedin', k.linkedin, buang) ?? sah('linkedin', cek?.linkedin),
		url_karir: sah('url_karir', k.url_karir, buang) ?? sah('url_karir', cek?.url_karir),
		maps_url: sah('maps_url', k.maps_url, buang),
		osm_url: sah('osm_url', k.osm_url, buang),
		rating: k.rating,
		jumlah_ulasan: k.jumlah_ulasan,
		status_web,
		peringatan,
		magang_bukti: bukti,
		lowongan: k.lowongan.map((l) => ({ ...l, tutup_pada: l.tutup_pada ?? null })),
		sumber,
		source_keys: {
			google_fid: k.google_fid,
			osm: k.osm_id,
			domain: domainKey(website),
			telepon
		},
		klasifikasi: { metode: d.metode, skor: d.skor, alasan: d.alasan.slice(0, 300) }
	};
}

/**
 * JSON dengan kunci terurut untuk membandingkan isi entri lama & baru.
 * @param {unknown} v
 * @returns {string}
 */
function stabil(v) {
	if (Array.isArray(v)) return `[${v.map(stabil).join(',')}]`;
	if (v && typeof v === 'object') {
		return `{${Object.keys(v)
			.filter((k) => /** @type {any} */ (v)[k] !== undefined)
			.sort()
			.map((k) => `${JSON.stringify(k)}:${stabil(/** @type {any} */ (v)[k])}`)
			.join(',')}}`;
	}
	return JSON.stringify(v ?? null);
}

/**
 * Isi entri tanpa id/slug/tanggal, untuk mendeteksi entri yang tidak berubah.
 * @param {Record<string, unknown>} r
 */
const isi = (r) => stabil({ ...r, id: undefined, slug: undefined, diperbarui_pada: undefined });

/**
 * Indeks entri lama untuk memakai ulang id/slug. Kunci yang dipakai beberapa entri (domain
 * bps.go.id, telepon kantor pusat) diabaikan supaya tidak salah pasang.
 * @param {unknown} lama isi companies.json sebelumnya (boleh null / format lama)
 */
function indeksLama(lama) {
	const list = /** @type {any[]} */ (
		Array.isArray(/** @type {any} */ (lama)?.perusahaan) ? /** @type {any} */ (lama).perusahaan : []
	).filter((c) => c && typeof c.id === 'string' && typeof c.slug === 'string');
	/** @type {Record<'fid' | 'osm' | 'nama' | 'domain' | 'telepon', Map<string, any>>} */
	const idx = {
		fid: new Map(),
		osm: new Map(),
		nama: new Map(),
		domain: new Map(),
		telepon: new Map()
	};
	/** @type {(m: Map<string, any>, kunci: string | null | undefined, c: any) => void} */
	const unik = (m, kunci, c) => {
		if (kunci) m.set(kunci, m.has(kunci) ? null : c);
	};
	for (const c of list) {
		const sk = c.source_keys ?? {};
		unik(idx.fid, sk.google_fid, c);
		unik(idx.osm, sk.osm, c);
		unik(idx.nama, `${namaKey(c.nama)}|${c.kabkota}`, c);
		unik(idx.domain, sk.domain ? `${sk.domain}|${c.kabkota}` : null, c);
		unik(idx.telepon, sk.telepon, c);
	}
	return { list, idx };
}

/**
 * Slug "nama-kabkota"; label daerah tidak diulang bila sudah ada di nama.
 * @param {string} nama
 * @param {string} kabkota
 */
export function slugDasar(nama, kabkota) {
	const kab = slugify(kabkotaLabel(kabkota));
	const penuh = slugify(nama, 80);
	if (!kab || `-${penuh}-`.includes(`-${kab}-`)) return penuh || kab;
	const s = slugify(nama, 80 - kab.length - 1);
	return s ? `${s}-${kab}` : kab;
}

/**
 * Susun dataset (murni; waktu & pembuat id disuntikkan supaya bisa diuji).
 * @param {{
 *   kandidat: Kandidat[], keputusan: Keputusan[],
 *   enriched?: { situs: Record<string, HasilWeb> } | null, lama?: unknown,
 *   hari: string, sekarang: string, idBaru?: () => string
 * }} input
 */
export function susunDataset(input) {
	const idBaru = input.idBaru ?? (() => randomId('c'));
	const perKey = new Map(input.keputusan.map((d) => [d.key, d]));
	const { list: lamaList, idx } = indeksLama(input.lama);
	// Semua id & slug lama dicadangkan: id/URL perusahaan yang hilang tidak boleh berpindah ke
	// perusahaan lain (db-import memakai id sebagai identitas).
	/** @type {Set<string>} */
	const idDipakai = new Set(lamaList.map((c) => c.id));
	/** @type {Set<string>} */
	const slugDipakai = new Set(lamaList.map((c) => c.slug));
	/** @type {Set<string>} */
	const lamaDipasang = new Set();

	/** @type {{ k: Kandidat, d: Keputusan, r: ReturnType<typeof susunEntri>, lama: any, buang: string[] }[]} */
	const baris = [];
	/** @type {string[]} */
	const tanpaKeputusan = [];
	for (const k of [...input.kandidat].sort((a, b) => a.key.localeCompare(b.key))) {
		const d = perKey.get(k.key);
		if (!d) {
			tanpaKeputusan.push(k.key);
			continue;
		}
		if (!d.masuk) continue;
		/** @type {string[]} */
		const buang = [];
		const r = susunEntri(k, d, hasilWeb(input.enriched, k.website), buang);
		baris.push({ k, d, r, lama: null, buang });
	}

	// Pasang entri lama dulu (urutan kunci terkuat) supaya slug lama tidak direbut entri baru.
	for (const kunci of /** @type {const} */ (['fid', 'osm', 'nama', 'domain', 'telepon'])) {
		for (const b of baris) {
			if (b.lama) continue;
			const sk = b.r.source_keys;
			const v = {
				fid: sk.google_fid,
				osm: sk.osm,
				nama: `${namaKey(b.r.nama)}|${b.r.kabkota}`,
				domain: sk.domain ? `${sk.domain}|${b.r.kabkota}` : null,
				telepon: sk.telepon
			}[kunci];
			const c = v ? idx[kunci].get(v) : null;
			if (c && !lamaDipasang.has(c.id)) {
				b.lama = c;
				lamaDipasang.add(c.id);
			}
		}
	}

	/** @type {CompanyRecord[]} */
	const perusahaan = [];
	/** @type {{ key: string, nama: string, galat: string }[]} */
	const ditolak = [];
	for (const b of baris) {
		let id = b.lama?.id;
		while (!id) {
			const calonId = idBaru();
			if (!idDipakai.has(calonId)) id = calonId;
		}
		idDipakai.add(id);
		const slug =
			b.lama?.slug ?? uniqueSlug(slugDasar(b.r.nama, b.r.kabkota), (s) => slugDipakai.has(s));
		slugDipakai.add(slug);
		const p = CompanySchema.safeParse({ id, slug, ...b.r, diperbarui_pada: input.hari });
		if (!p.success) {
			ditolak.push({
				key: b.k.key,
				nama: b.r.nama,
				galat: p.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
			});
			continue;
		}
		if (b.lama?.diperbarui_pada && isi(b.lama) === isi(p.data)) {
			p.data.diperbarui_pada = b.lama.diperbarui_pada;
		}
		perusahaan.push(p.data);
	}
	perusahaan.sort((a, b) => a.slug.localeCompare(b.slug));

	const dataset = parseDataset({
		versi: 1,
		dibuat_pada: input.sekarang,
		atribusi: ATRIBUSI,
		jumlah: perusahaan.length,
		perusahaan
	});
	const idBaruSet = new Set(perusahaan.map((c) => c.id));
	return {
		dataset,
		ditolak,
		tanpaKeputusan,
		fieldDibuang: baris
			.filter((b) => b.buang.length)
			.map((b) => ({ key: b.k.key, nama: b.r.nama, field: b.buang })),
		hilang: lamaList
			.filter((c) => !idBaruSet.has(c.id))
			.map((c) => ({ id: c.id, slug: c.slug, nama: c.nama })),
		dipakaiUlang: baris.filter((b) => b.lama).length
	};
}

// ---------------------------------------------------------------------------------------------
// Laporan

/**
 * @param {Record<string, number>} hitung
 * @param {(k: string) => string} [label]
 */
function tabelHitung(hitung, label = (k) => k) {
	const baris = Object.entries(hitung).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
	return baris.map(([k, n]) => `| ${label(k)} | ${n} |`).join('\n');
}

/**
 * @param {string[]} baris
 * @param {number} [maks]
 */
function daftar(baris, maks = 400) {
	if (!baris.length) return '_(tidak ada)_';
	const potong = baris.slice(0, maks).map((b) => `- ${b}`);
	if (baris.length > maks) potong.push(`- … dan ${baris.length - maks} lainnya`);
	return potong.join('\n');
}

/** @param {string | null | undefined} s */
const md = (s) => String(s ?? '').replace(/([|*_`[\]<>])/g, '\\$1');

/**
 * @param {{
 *   hasil: ReturnType<typeof susunDataset>, kandidat: Kandidat[], keputusan: Keputusan[],
 *   merged: Record<string, any>, classified: Record<string, any>,
 *   enriched: { situs: Record<string, HasilWeb> }, sekarang: string
 * }} ctx
 */
export function susunLaporan(ctx) {
	const { dataset } = ctx.hasil;
	/** @param {(c: CompanyRecord) => string} f */
	const per = (f) => {
		/** @type {Record<string, number>} */
		const out = {};
		for (const c of dataset.perusahaan) out[f(c)] = (out[f(c)] || 0) + 1;
		return out;
	};
	const byKey = new Map(ctx.kandidat.map((k) => [k.key, k]));
	const nm = (/** @type {string} */ key) => {
		const k = byKey.get(key);
		return k ? `${md(k.nama_asli)} (${kabkotaLabel(k.kabkota)})` : key;
	};
	const ms = ctx.merged.statistik ?? {};
	const cs = ctx.classified.statistik ?? {};
	const situs = Object.values(ctx.enriched.situs ?? {});
	/** @type {Record<string, number>} */
	const statusSitus = {};
	for (const h of situs) statusSitus[h.status] = (statusSitus[h.status] || 0) + 1;

	const review = ctx.keputusan.filter((d) => d.review);
	const aiMasuk = ctx.keputusan.filter((d) => d.metode === 'ai' && d.masuk);
	const aiTolak = ctx.keputusan.filter((d) => d.metode === 'ai' && !d.masuk);
	const mepet = ctx.keputusan.filter(
		(d) => d.metode === 'aturan' && d.masuk && d.skor < 6 && !byKey.get(d.key)?.seed
	);
	const webBermasalah = dataset.perusahaan.filter(
		(c) => c.status_web === 'mati' || c.status_web === 'dibajak'
	);
	const alasanWeb = (/** @type {CompanyRecord} */ c) =>
		hasilWeb(ctx.enriched, c.website)?.alasan ?? (c.status_web === 'dibajak' ? 'kurasi' : '');
	const statusMagang = per((c) =>
		deriveMagangStatus({
			bukti: c.magang_bukti,
			jumlahLowongan: c.lowongan.filter((l) => MAGANG_RE.test(l.judul)).length
		})
	);

	return `# Laporan pipeline

Dibuat otomatis oleh \`npm run pipeline -- export\` pada ${ctx.sekarang}. Baca laporan ini sebelum
meng-commit \`data/companies.json\`. Koreksi klasifikasi lewat \`pipeline/overrides.json\`, lalu jalankan
ulang \`classify\` dan \`export\`.

## Ringkasan

| Tahap | Jumlah |
|---|---|
| Tempat Google Maps | ${ms.tempat_maps ?? '?'} |
| Tempat OpenStreetMap | ${ms.tempat_osm ?? '?'} |
| Kandidat setelah dedupe | ${ms.kandidat ?? ctx.kandidat.length} |
| Dibuang saat merge | ${
		Object.entries(ms.dibuang ?? {})
			.map(([k, n]) => `${k}: ${n}`)
			.join(', ') || 0
	} |
| Seed cocok dengan tempat | ${ms.seed_cocok ?? '?'} |
| Website dicek | ${situs.length} (${Object.entries(statusSitus)
		.map(([k, n]) => `${k} ${n}`)
		.join(', ')}; tidak bisa dicek ${situs.filter((h) => !h.dicek).length}) |
| Kasus ragu → AI | ${cs.ragu ?? '?'} (jawaban baru ${cs.ai_baru ?? 0}, tersimpan ${cs.ai_tersimpan ?? 0}, gagal ${cs.ai_gagal ?? 0}) |
| Perlu review manual | ${review.length} |
| **Masuk direktori** | **${dataset.jumlah}** (id dipakai ulang ${ctx.hasil.dipakaiUlang}) |

## Keputusan per metode

| Metode | Masuk | Tidak masuk |
|---|---|---|
${Object.entries(cs.per_metode ?? {})
	.map(([m, v]) => `| ${m} | ${v.masuk ?? 0} | ${v.keluar ?? 0} |`)
	.join('\n')}

## Isi direktori

| Jenis | Jumlah |
|---|---|
${tabelHitung(
	per((c) => c.jenis),
	(k) => JENIS[/** @type {keyof typeof JENIS} */ (k)]?.label ?? k
)}

| Kab/kota | Jumlah |
|---|---|
${tabelHitung(
	per((c) => c.kabkota),
	(k) => KABKOTA.find((x) => x.slug === k)?.nama ?? k
)}

| Status magang | Jumlah |
|---|---|
${tabelHitung(statusMagang, (k) => MAGANG_STATUS[/** @type {keyof typeof MAGANG_STATUS} */ (k)]?.label ?? k)}

| Status website | Jumlah |
|---|---|
${tabelHitung(per((c) => c.status_web))}

Kontak: telepon ${dataset.perusahaan.filter((c) => c.telepon).length}, WhatsApp ${dataset.perusahaan.filter((c) => c.whatsapp).length}, email ${dataset.perusahaan.filter((c) => c.email).length}, website ${dataset.perusahaan.filter((c) => c.website).length}, Instagram ${dataset.perusahaan.filter((c) => c.instagram).length}, halaman karir ${dataset.perusahaan.filter((c) => c.url_karir).length}, tanpa kontak sama sekali ${dataset.perusahaan.filter((c) => !c.telepon && !c.whatsapp && !c.email && !c.website && !c.instagram).length}.

## Perlu review (ragu, belum diputuskan AI) — ${review.length}

Tidak masuk direktori sampai diputuskan AI (jalankan shim lalu \`classify\`) atau lewat overrides.json.

${daftar(review.map((d) => `${nm(d.key)} · skor ${d.skor} · ${md(d.alasan)} · \`${d.key}\``))}

## Masuk lewat AI — ${aiMasuk.length} (cek acak)

${daftar(aiMasuk.map((d) => `${nm(d.key)} · ${d.jenis} · ${md(d.alasan)} · \`${d.key}\``))}

## Ditolak AI — ${aiTolak.length}

${daftar(aiTolak.map((d) => `${nm(d.key)} · ${md(d.alasan)} · \`${d.key}\``))}

## Masuk lewat aturan dengan skor mepet (4–5) — ${mepet.length}

Kategori seperti "Layanan dan Dukungan Komputer" kadang berisi toko/servis; tolak lewat overrides.json bila perlu.

${daftar(mepet.map((d) => `${nm(d.key)} · ${d.jenis} · skor ${d.skor} · ${md(d.alasan)} · \`${d.key}\``))}

## Website mati / dibajak di direktori — ${webBermasalah.length}

Tautan website ini tidak ditampilkan sebagai tautan aktif di aplikasi.

${daftar(webBermasalah.map((c) => `${md(c.nama)} · ${c.status_web} · ${md(c.website)} · ${md(alasanWeb(c))}`))}

## Seed tanpa tempat — ${(ctx.merged.seed_tanpa_tempat ?? []).length}

${daftar((ctx.merged.seed_tanpa_tempat ?? []).map((/** @type {any} */ s) => `${md(s.nama)} · ${s.alasan} · \`${s.key}\``))}

## Listing instansi yang dilebur — ${(ctx.merged.instansi_dilebur ?? []).length}

${daftar((ctx.merged.instansi_dilebur ?? []).map((/** @type {any} */ l) => `${md(l.nama)} → ${md(l.ke)}`))}

## Lowongan seed yang tidak cocok dengan perusahaan — ${(ctx.merged.lowongan_tidak_cocok ?? []).length}

${daftar((ctx.merged.lowongan_tidak_cocok ?? []).map(md))}

## Masalah data

${daftar([
	...ctx.hasil.tanpaKeputusan.map(
		(k) => `kandidat tanpa keputusan classify: \`${k}\` (jalankan ulang classify)`
	),
	...ctx.hasil.ditolak.map(
		(d) => `entri gagal validasi: ${md(d.nama)} · ${md(d.galat)} · \`${d.key}\``
	),
	...ctx.hasil.fieldDibuang.map(
		(f) => `field tidak valid dibuang: ${md(f.nama)} · ${md(f.field.join('; '))}`
	),
	...ctx.hasil.hilang.map((c) => `entri lama tidak ada lagi: ${md(c.nama)} (\`${c.slug}\`)`)
])}
`;
}

// ---------------------------------------------------------------------------------------------

export function runExport() {
	const merged = loadMerged();
	const classified = loadClassified();
	const enriched = loadEnriched();
	if (merged.dibuat_pada && classified.dibuat_pada < merged.dibuat_pada) {
		console.warn('  ! classified.json lebih lama dari merged.json: jalankan `classify` dulu');
	}
	const lama = readJsonIfExists(DATASET_FILE);
	const sekarang = new Date().toISOString();
	const hari = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });
	const hasil = susunDataset({
		kandidat: merged.kandidat,
		keputusan: classified.keputusan,
		enriched,
		lama,
		hari,
		sekarang
	});
	writeJsonAtomic(DATASET_FILE, hasil.dataset);
	fs.writeFileSync(
		REPORT_FILE,
		susunLaporan({
			hasil,
			kandidat: merged.kandidat,
			keputusan: classified.keputusan,
			merged,
			classified,
			enriched,
			sekarang
		})
	);
	const masalah = hasil.ditolak.length + hasil.tanpaKeputusan.length;
	console.log(
		`✓ export: ${hasil.dataset.jumlah} perusahaan → data/companies.json (id dipakai ulang ${hasil.dipakaiUlang}, hilang ${hasil.hilang.length}) · laporan: data/laporan-pipeline.md${masalah ? ` · ! ${masalah} masalah, lihat laporan` : ''}`
	);
	return hasil;
}
