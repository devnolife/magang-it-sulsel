// Tahap `classify`: putuskan kandidat mana yang masuk direktori beserta jenisnya.
// Urutan: overrides.json (manual) > seed kurasi/instansi (masuk true/false) > aturan skor
// (config/klasifikasi.js) > AI lewat copilot-text-shim untuk kasus ragu. Ragu yang belum dijawab
// AI tidak masuk dan dicatat untuk review. Hasil: pipeline/cache/classified.json.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { isJenis, JENIS_KEYS } from '../../src/lib/shared/jenis.js';
import { putusan, skorAturan } from '../config/klasifikasi.js';
import { readJson, readJsonIfExists, writeJsonAtomic } from '../lib/cache.js';
import { CACHE_DIR, OVERRIDES_FILE } from '../lib/paths.js';
import { parseJsonLonggar, shimChat, shimHidup } from '../lib/shim.js';
import { hasilWeb, loadEnriched } from './enrich.js';
import { domainKey, loadMerged } from './merge.js';

export const CLASSIFIED_FILE = path.join(CACHE_DIR, 'classified.json');
const AI_CACHE = path.join(CACHE_DIR, 'ai');
/** Naikkan bila prompt/kriteria berubah supaya jawaban lama tidak dipakai lagi. */
const AI_VERSI = 'v1';
const BATCH = 15;

/**
 * @typedef {import('./merge.js').Kandidat} Kandidat
 * @typedef {import('../../src/lib/shared/jenis.js').Jenis} Jenis
 * @typedef {import('./enrich.js').HasilWeb} HasilWeb
 * @typedef {z.infer<typeof OverrideSchema>} Override
 * @typedef {{ masuk: boolean, jenis: Jenis | null, alasan: string }} JawabanAi
 * @typedef {{
 *   key: string, masuk: boolean, jenis: Jenis | null, metode: 'manual' | 'aturan' | 'ai',
 *   skor: number, alasan: string, putusan_aturan: 'masuk' | 'buang' | 'ragu', review: boolean,
 *   override: Override | null
 * }} Keputusan
 */

export const OverrideSchema = z.object({
	masuk: z.boolean(),
	jenis: z.enum(JENIS_KEYS).optional(),
	alasan: z.string().max(300).optional(),
	nama: z.string().min(2).max(160).optional(),
	deskripsi: z.string().max(600).optional(),
	catatan: z.string().optional()
});

/** @returns {Record<string, Override>} */
export function loadOverrides(file = OVERRIDES_FILE) {
	if (!fs.existsSync(file)) return {};
	const parsed = z
		.object({ entri: z.record(z.string(), OverrideSchema) })
		.safeParse(readJson(file));
	if (!parsed.success) {
		const lines = parsed.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`);
		throw new Error(`overrides.json tidak valid:\n${lines.slice(0, 10).join('\n')}`);
	}
	return parsed.data.entri;
}

/**
 * Override dicari lewat key kandidat, key anggota klaster, key seed, lalu domain website.
 * @param {Kandidat} k
 * @param {Record<string, Override>} overrides
 */
export function cariOverride(k, overrides) {
	for (const kunci of [k.key, ...k.anggota, k.seed?.key, domainKey(k.website)]) {
		if (kunci && Object.hasOwn(overrides, kunci)) return overrides[kunci];
	}
	return null;
}

/**
 * Sinyal teks website hanya dipakai bila website hidup dan isinya benar-benar terbaca.
 * @param {HasilWeb | null} web
 */
function sinyalWeb(web) {
	return web && web.status === 'aktif' && web.dicek
		? { judul: web.judul, deskripsi: web.deskripsi }
		: null;
}

/**
 * Keputusan untuk semua kandidat (murni).
 * @param {Kandidat[]} kandidat
 * @param {{ enriched?: { situs: Record<string, HasilWeb> } | null, overrides?: Record<string, Override>, ai?: Map<string, JawabanAi> }} ctx
 * @returns {Keputusan[]}
 */
export function klasifikasikan(kandidat, ctx = {}) {
	return kandidat.map((k) => {
		const r = skorAturan(k, sinyalWeb(hasilWeb(ctx.enriched, k.website)));
		const p = putusan(r.skor);
		const alasanAturan = r.alasan.join('; ');
		const seedJenis = k.seed && isJenis(k.seed.jenis) ? k.seed.jenis : null;
		/** @type {Omit<Keputusan, 'masuk' | 'jenis' | 'metode' | 'alasan'>} */
		const dasar = { key: k.key, skor: r.skor, putusan_aturan: p, review: false, override: null };

		const o = ctx.overrides ? cariOverride(k, ctx.overrides) : null;
		if (o) {
			return {
				...dasar,
				masuk: o.masuk,
				jenis: o.jenis ?? seedJenis ?? r.jenis ?? 'software',
				metode: 'manual',
				alasan: o.alasan ?? 'keputusan manual (overrides.json)',
				override: o
			};
		}
		if (k.seed && typeof k.seed.masuk === 'boolean') {
			return {
				...dasar,
				masuk: k.seed.masuk,
				jenis: seedJenis ?? r.jenis ?? 'software',
				metode: 'manual',
				alasan: `${k.seed.asal === 'instansi' ? 'daftar instansi' : 'kurasi'} (${k.seed.key})`
			};
		}
		if (p !== 'ragu') {
			return {
				...dasar,
				masuk: p === 'masuk',
				jenis: seedJenis ?? r.jenis ?? 'software',
				metode: 'aturan',
				alasan: alasanAturan
			};
		}
		const j = ctx.ai?.get(k.key);
		if (j) {
			return {
				...dasar,
				masuk: j.masuk,
				jenis: j.jenis ?? seedJenis ?? r.jenis ?? 'software',
				metode: 'ai',
				alasan: `AI: ${j.alasan}`
			};
		}
		return {
			...dasar,
			masuk: false,
			jenis: seedJenis ?? r.jenis,
			metode: 'aturan',
			alasan: `ragu, belum diputuskan AI (${alasanAturan})`,
			review: true
		};
	});
}

// ---------------------------------------------------------------------------------------------
// AI

export const PROMPT_AI = `Kamu membantu menyusun direktori tempat magang bagi mahasiswa informatika di Sulawesi Selatan.
Untuk setiap tempat di INPUT, putuskan apakah pekerjaan inti tempat itu berunsur informatika dan masuk akal dihubungi mahasiswa IT untuk magang.

MASUK (masuk=true) bila intinya salah satu jenis ini:
- software: software house, pengembang aplikasi/web/game, perusahaan produk digital
- konsultan: konsultan IT, system integrator, jaringan, keamanan siber, dukungan IT untuk perusahaan
- isp: penyedia internet/telekomunikasi/data center/hosting yang punya kantor (bukan agen atau loket)
- agency: agensi digital/kreatif yang membuat website, aplikasi, konten digital, animasi, atau pemasaran digital
- startup: startup teknologi, inkubator, coworking space bertema teknologi
- instansi: dinas kominfo, BPS, atau unit TIK instansi/kampus

TIDAK MASUK (masuk=false): toko atau servis komputer/laptop/HP/printer/CCTV, konter pulsa, warnet dan game center, percetakan/fotokopi/sablon/reklame, kursus/LPK/sekolah/kampus (kecuali unit TIK-nya), gerai atau plaza operator, agen/sales pemasangan internet, RT/RW net rumahan, fotografer/videografer acara, event organizer, toko online umum, organisasi/komunitas/sekretariat, dan tempat yang usahanya tidak jelas.

Bila ragu atau datanya terlalu sedikit, pilih masuk=false.
Jawab JSON: {"hasil":[{"key":"<key dari INPUT>","masuk":true atau false,"jenis":"software|konsultan|isp|agency|startup|instansi" atau null,"alasan":"<maks 100 karakter, bahasa Indonesia>"}]} dengan tepat satu elemen untuk setiap tempat.`;

const JawabanSchema = z.object({
	hasil: z.array(
		z.object({
			key: z.string(),
			masuk: z.boolean(),
			jenis: z.string().nullish(),
			alasan: z.string().nullish()
		})
	)
});

/**
 * Data ringkas satu kandidat untuk AI (juga kunci cache jawaban).
 * @param {Kandidat} k
 * @param {HasilWeb | null} web
 */
export function itemAi(k, web) {
	const r = skorAturan(k, sinyalWeb(web));
	const w = sinyalWeb(web);
	return {
		key: k.key,
		nama: k.nama_asli,
		kategori: k.kategori.slice(0, 4),
		alamat: k.alamat ? k.alamat.slice(0, 120) : null,
		kabkota: k.kabkota,
		website: k.website,
		judul_web: w?.judul ?? null,
		deskripsi_web: w?.deskripsi ?? null,
		jumlah_ulasan: k.jumlah_ulasan,
		skor_aturan: r.skor,
		alasan_aturan: r.alasan.join('; ').slice(0, 200)
	};
}

/** @param {ReturnType<typeof itemAi>} item */
const berkasAi = (item) =>
	path.join(
		AI_CACHE,
		`${crypto
			.createHash('sha1')
			.update(`${AI_VERSI}\n${JSON.stringify(item)}`)
			.digest('hex')}.json`
	);

/**
 * Jawaban AI untuk kandidat ragu: dari cache, lalu (bila `tanya`) dari shim per batch.
 * @param {Kandidat[]} ragu
 * @param {{ enriched: { situs: Record<string, HasilWeb> }, tanya: boolean, fresh?: boolean }} opts
 * @returns {Promise<{ ai: Map<string, JawabanAi>, ditanya: number, gagal: number }>}
 */
async function jawabanAi(ragu, opts) {
	/** @type {Map<string, JawabanAi>} */
	const ai = new Map();
	/** @type {ReturnType<typeof itemAi>[]} */
	const belum = [];
	for (const k of ragu) {
		const item = itemAi(k, hasilWeb(opts.enriched, k.website));
		const c = opts.fresh ? null : readJsonIfExists(berkasAi(item));
		if (c?.jawaban) ai.set(k.key, c.jawaban);
		else belum.push(item);
	}
	let ditanya = 0;
	let gagal = 0;
	if (!opts.tanya || !belum.length) return { ai, ditanya, gagal };
	fs.mkdirSync(AI_CACHE, { recursive: true });
	for (let i = 0; i < belum.length; i += BATCH) {
		const batch = belum.slice(i, i + BATCH);
		const t0 = Date.now();
		try {
			const teks = await shimChat(
				[
					{ role: 'system', content: PROMPT_AI },
					{ role: 'user', content: JSON.stringify({ tempat: batch }) }
				],
				{ json: true }
			);
			const hasil = JawabanSchema.parse(parseJsonLonggar(teks)).hasil;
			for (const item of batch) {
				const h = hasil.find((x) => x.key === item.key);
				if (!h) {
					gagal++;
					continue;
				}
				/** @type {JawabanAi} */
				const jawaban = {
					masuk: h.masuk,
					jenis: isJenis(h.jenis) ? h.jenis : null,
					alasan: (h.alasan || (h.masuk ? 'berunsur IT' : 'bukan bidang IT')).slice(0, 150)
				};
				ai.set(item.key, jawaban);
				ditanya++;
				writeJsonAtomic(berkasAi(item), {
					dibuat_pada: new Date().toISOString(),
					item,
					jawaban
				});
			}
			console.log(
				`  AI ${Math.min(i + BATCH, belum.length)}/${belum.length} (${Math.round((Date.now() - t0) / 1000)}s)`
			);
		} catch (err) {
			gagal += batch.length;
			console.warn(
				`  ! AI batch ${i / BATCH + 1} gagal: ${err instanceof Error ? err.message : err}`
			);
		}
	}
	return { ai, ditanya, gagal };
}

/** @returns {{ dibuat_pada: string, keputusan: Keputusan[], [k: string]: any }} */
export function loadClassified() {
	if (!fs.existsSync(CLASSIFIED_FILE)) {
		throw new Error(
			'cache/classified.json belum ada: jalankan `npm run pipeline -- classify` dulu'
		);
	}
	return readJson(CLASSIFIED_FILE);
}

/** @param {{ ai?: boolean, fresh?: boolean }} [opts] */
export async function runClassify(opts = {}) {
	const { kandidat } = loadMerged();
	const enriched = loadEnriched();
	const overrides = loadOverrides();
	const awal = klasifikasikan(kandidat, { enriched, overrides });
	const byKey = new Map(kandidat.map((k) => [k.key, k]));
	const ragu = awal.filter((d) => d.review).map((d) => /** @type {Kandidat} */ (byKey.get(d.key)));

	let tanya = opts.ai !== false;
	if (tanya && ragu.length && !(await shimHidup())) {
		console.warn(
			'  ! copilot-text-shim tidak menjawab di SHIM_URL: kasus ragu tanpa jawaban tersimpan masuk daftar review (jalankan `npm start` di copilot-text-shim)'
		);
		tanya = false;
	}
	const { ai, ditanya, gagal } = await jawabanAi(ragu, { enriched, tanya, fresh: opts.fresh });
	const keputusan = klasifikasikan(kandidat, { enriched, overrides, ai });

	/** @type {Record<string, Record<string, number>>} */
	const perMetode = {};
	for (const d of keputusan) {
		const m = (perMetode[d.metode] ??= { masuk: 0, keluar: 0 });
		m[d.masuk ? 'masuk' : 'keluar']++;
	}
	const statistik = {
		kandidat: keputusan.length,
		masuk: keputusan.filter((d) => d.masuk).length,
		ragu: ragu.length,
		ai_tersimpan: ai.size - ditanya,
		ai_baru: ditanya,
		ai_gagal: gagal,
		review: keputusan.filter((d) => d.review).length,
		override: keputusan.filter((d) => d.override).length,
		per_metode: perMetode
	};
	writeJsonAtomic(CLASSIFIED_FILE, { dibuat_pada: new Date().toISOString(), statistik, keputusan });
	console.log(
		`✓ classify: ${statistik.masuk}/${statistik.kandidat} masuk`,
		perMetode,
		`· ragu ${statistik.ragu} (AI baru ${ditanya}, tersimpan ${statistik.ai_tersimpan}, gagal ${gagal}) · review ${statistik.review}`
	);
	return { statistik, keputusan };
}
