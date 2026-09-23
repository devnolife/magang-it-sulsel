// Tahap `seed`: baca & validasi pipeline/seed/*.json (kurasi, instansi, lowongan JobStreet).
// Entri seed yang punya `query_maps` juga menjadi pencarian Maps tambahan (lihat seedSearches).
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { BuktiSchema, STATUS_WEB } from '../../src/lib/shared/company-schema.js';
import { JENIS_KEYS } from '../../src/lib/shared/jenis.js';
import { normalizePhone } from '../../src/lib/shared/phone.js';
import { slugify } from '../../src/lib/shared/slug.js';
import { KABKOTA, kabkotaBySlug } from '../../src/lib/shared/wilayah.js';
import { readJson } from '../lib/cache.js';
import { SEED_DIR } from '../lib/paths.js';

const httpUrl = z.url({ protocol: /^https?$/ });
const regexStr = z.string().refine((s) => {
	try {
		new RegExp(s, 'i');
		return true;
	} catch {
		return false;
	}
}, 'regex tidak valid');

export const SeedEntrySchema = z
	.object({
		key: z.string().regex(/^(kurasi|instansi):[a-z0-9.-]+$/),
		nama: z.string().min(2).max(160).optional(),
		label: z.string().max(160).optional(),
		jenis: z.enum(JENIS_KEYS),
		masuk: z.boolean().nullable().default(true),
		kabkota: z
			.enum(KABKOTA.map((k) => k.slug))
			.nullable()
			.optional(),
		alamat: z.string().max(300).optional(),
		website: httpUrl.optional(),
		url_karir: httpUrl.optional(),
		email: z.email().optional(),
		telepon: z.string().max(40).optional(),
		whatsapp: z.string().max(40).optional(),
		instagram: httpUrl.optional(),
		linkedin: httpUrl.optional(),
		deskripsi: z.string().max(600).optional(),
		peringatan: z.string().max(300).optional(),
		status_web: z.enum(STATUS_WEB).optional(),
		tags: z.array(z.string().max(60)).max(20).default([]),
		magang_bukti: z.array(BuktiSchema).max(20).default([]),
		query_maps: z.string().max(200).optional(),
		cocok: z.array(regexStr).optional(),
		tolak: regexStr.optional(),
		catatan: z.string().optional()
	})
	.refine((e) => e.nama || e.label, 'nama atau label wajib diisi');

export const SeedLowonganSchema = z.object({
	sumber: z.string().min(2).max(40),
	id: z.string(),
	judul: z.string().min(2).max(200),
	perusahaan: z.string().min(1).max(200),
	url: httpUrl,
	lokasi: z.string().nullable(),
	kategori: z.string(),
	ditemukan_pada: z.iso.date()
});

/**
 * @typedef {z.infer<typeof SeedEntrySchema> & { asal: 'kurasi' | 'instansi' }} SeedEntry
 * @typedef {z.infer<typeof SeedLowonganSchema>} SeedLowongan
 */

/**
 * @param {string} file
 * @param {z.ZodType} schema
 * @param {string} field
 */
function readList(file, schema, field) {
	const data = readJson(file);
	const parsed = z.object({ [field]: z.array(schema) }).safeParse(data);
	if (!parsed.success) {
		const lines = parsed.error.issues
			.slice(0, 10)
			.map((i) => `- ${i.path.join('.')}: ${i.message}`);
		throw new Error(`${path.relative(process.cwd(), file)} tidak valid:\n${lines.join('\n')}`);
	}
	return /** @type {any[]} */ (parsed.data[field]);
}

/**
 * @param {{ dir?: string }} [opts]
 * @returns {{ entri: SeedEntry[], lowongan: SeedLowongan[] }}
 */
export function loadSeed(opts = {}) {
	const dir = opts.dir ?? SEED_DIR;
	/** @type {SeedEntry[]} */
	const entri = [];
	for (const asal of /** @type {const} */ (['kurasi', 'instansi'])) {
		const file = path.join(dir, `${asal}.json`);
		if (!fs.existsSync(file)) continue;
		for (const e of readList(file, SeedEntrySchema, 'entri')) {
			entri.push({
				...e,
				asal,
				telepon: normalizePhone(e.telepon) ?? undefined,
				whatsapp: normalizePhone(e.whatsapp) ?? undefined
			});
		}
	}
	const keys = new Set();
	for (const e of entri) {
		if (keys.has(e.key)) throw new Error(`key seed ganda: ${e.key}`);
		keys.add(e.key);
	}
	/** @type {SeedLowongan[]} */
	const lowongan = [];
	if (fs.existsSync(dir)) {
		for (const f of fs.readdirSync(dir).sort()) {
			if (/^(jobstreet|lowongan)-.*\.json$/.test(f)) {
				lowongan.push(...readList(path.join(dir, f), SeedLowonganSchema, 'lowongan'));
			}
		}
	}
	return { entri, lowongan };
}

/** @param {string} key */
export const seedSearchId = (key) => `seed--${slugify(key.replace(':', '-'))}`;

/**
 * Pencarian Maps tambahan untuk entri seed (mencari koordinat, alamat, dan kontak resmi).
 * @param {{ kab?: string[] }} [opts]
 * @returns {import('../config/queries.js').MapsSearch[]}
 */
export function seedSearches(opts = {}) {
	const only = opts.kab?.length ? new Set(opts.kab) : null;
	/** @type {import('../config/queries.js').MapsSearch[]} */
	const out = [];
	let entri;
	try {
		entri = loadSeed().entri;
	} catch (err) {
		console.warn(`  ! seed tidak terbaca, pencarian seed dilewati: ${err}`);
		return out;
	}
	for (const e of entri) {
		if (!e.query_maps || e.masuk === false) continue;
		if (only && !(e.kabkota && only.has(e.kabkota))) continue;
		const k = kabkotaBySlug(e.kabkota) ?? kabkotaBySlug('makassar');
		const pusat = /** @type {[number, number]} */ (k?.pusat);
		out.push({
			id: seedSearchId(e.key),
			kab: e.kabkota ?? 'makassar',
			query: `seed:${e.key}`,
			text: e.query_maps,
			lat: pusat[0],
			lng: pusat[1],
			zoom: !e.kabkota ? 10 : k?.tipe === 'kota' ? 13 : 11,
			label: `Seed ${e.nama ?? e.label}`
		});
	}
	return out;
}

export function runSeed() {
	const { entri, lowongan } = loadSeed();
	/** @type {Record<string, number>} */
	const perStatus = { wajib: 0, pelengkap: 0, dikeluarkan: 0 };
	for (const e of entri) {
		perStatus[e.masuk === true ? 'wajib' : e.masuk === null ? 'pelengkap' : 'dikeluarkan']++;
	}
	const kurasi = entri.filter((e) => e.asal === 'kurasi').length;
	console.log(
		`✓ seed: ${kurasi} kurasi + ${entri.length - kurasi} instansi`,
		perStatus,
		`· ${lowongan.length} lowongan`,
		`· ${entri.filter((e) => e.query_maps && e.masuk !== false).length} pencarian Maps seed`
	);
	return { entri, lowongan };
}
