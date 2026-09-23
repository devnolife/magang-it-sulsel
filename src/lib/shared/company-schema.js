import { z } from 'zod';
import { JENIS_KEYS } from './jenis.js';
import { KABKOTA } from './wilayah.js';

/** Kontrak `data/companies.json`: dipakai pipeline (export) dan scripts/db-import.js. */

const httpUrl = z.url({ protocol: /^https?$/ }).max(500);
const isoDate = z.iso.date();
const e164 = z.string().regex(/^\+62\d{7,13}$/);

export const TIPE_BUKTI = /** @type {const} */ ([
	'lowongan',
	'halaman-karir',
	'kurasi',
	'pengalaman'
]);
export const STATUS_WEB = /** @type {const} */ (['aktif', 'mati', 'dibajak', 'tidak-ada']);
export const SUMBER = /** @type {const} */ (['maps', 'osm', 'website', 'kurasi']);

export const BuktiSchema = z.object({
	tipe: z.enum(TIPE_BUKTI),
	url: httpUrl.nullish(),
	kutipan: z.string().max(300).nullish(),
	tanggal: isoDate.nullish()
});

export const LowonganPipelineSchema = z.object({
	judul: z.string().min(2).max(200),
	url: httpUrl,
	sumber: z.string().min(2).max(40),
	ditemukan_pada: isoDate,
	tutup_pada: isoDate.nullish()
});

export const CompanySchema = z.object({
	id: z.string().regex(/^c_[a-z0-9]{6,16}$/),
	slug: z
		.string()
		.max(90)
		.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
	nama: z.string().min(2).max(160),
	jenis: z.enum(JENIS_KEYS),
	tags: z.array(z.string().max(60)).max(20).default([]),
	deskripsi: z.string().max(600).nullish(),
	alamat: z.string().max(300).nullish(),
	kabkota: z.enum(KABKOTA.map((k) => k.slug)),
	kecamatan: z.string().max(80).nullish(),
	lat: z.number().min(-90).max(90).nullish(),
	lng: z.number().min(-180).max(180).nullish(),
	telepon: e164.nullish(),
	whatsapp: e164.nullish(),
	email: z.email().max(160).nullish(),
	website: httpUrl.nullish(),
	instagram: httpUrl.nullish(),
	linkedin: httpUrl.nullish(),
	url_karir: httpUrl.nullish(),
	maps_url: httpUrl.nullish(),
	osm_url: httpUrl.nullish(),
	rating: z.number().min(0).max(5).nullish(),
	jumlah_ulasan: z.number().int().min(0).nullish(),
	status_web: z.enum(STATUS_WEB).default('tidak-ada'),
	peringatan: z.string().max(300).nullish(),
	magang_bukti: z.array(BuktiSchema).max(20).default([]),
	lowongan: z.array(LowonganPipelineSchema).max(50).default([]),
	sumber: z.array(z.enum(SUMBER)).min(1),
	source_keys: z
		.object({
			google_fid: z.string().max(80).nullish(),
			osm: z.string().max(40).nullish(),
			domain: z.string().max(120).nullish(),
			telepon: e164.nullish()
		})
		.default({}),
	klasifikasi: z.object({
		metode: z.enum(['aturan', 'ai', 'manual']),
		skor: z.number().nullish(),
		alasan: z.string().max(300).nullish()
	}),
	diperbarui_pada: isoDate
});

export const DatasetSchema = z.object({
	versi: z.literal(1),
	dibuat_pada: z.iso.datetime({ offset: true }),
	atribusi: z.array(z.string()),
	jumlah: z.number().int().min(0),
	perusahaan: z.array(CompanySchema)
});

/**
 * @typedef {z.infer<typeof CompanySchema>} CompanyRecord
 * @typedef {z.infer<typeof DatasetSchema>} Dataset
 */

/**
 * Validasi dataset; lempar Error berisi daftar masalah yang mudah dibaca.
 * @param {unknown} data
 * @returns {Dataset}
 */
export function parseDataset(data) {
	const result = DatasetSchema.safeParse(data);
	if (result.success) {
		const ids = new Set();
		const slugs = new Set();
		for (const c of result.data.perusahaan) {
			if (ids.has(c.id)) throw new Error(`id ganda: ${c.id}`);
			if (slugs.has(c.slug)) throw new Error(`slug ganda: ${c.slug}`);
			ids.add(c.id);
			slugs.add(c.slug);
		}
		if (result.data.jumlah !== result.data.perusahaan.length) {
			throw new Error(
				`jumlah (${result.data.jumlah}) != perusahaan.length (${result.data.perusahaan.length})`
			);
		}
		return result.data;
	}
	const lines = result.error.issues.slice(0, 20).map((i) => `- ${i.path.join('.')}: ${i.message}`);
	throw new Error(`companies.json tidak valid:\n${lines.join('\n')}`);
}
