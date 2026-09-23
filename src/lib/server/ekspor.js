// Ekspor CSV direktori: filter & urutan sama dengan halaman depan, tanpa data pengirim kiriman.
import { JENIS } from '../shared/jenis.js';
import { MAGANG_STATUS } from '../shared/magang-status.js';
import { formatPhone } from '../shared/phone.js';
import { kabkotaBySlug } from '../shared/wilayah.js';
import { diDomain, hostDari, listCompanies } from './companies.js';

/**
 * @typedef {{
 *   nama: string, jenis: string, kabkota: string, kecamatan: string | null, alamat: string | null,
 *   status_magang: string, lowongan_aktif: number, whatsapp: string, telepon: string,
 *   email: string | null, website: string | null, instagram: string | null,
 *   linkedin: string | null, url_karir: string | null, catatan: string | null,
 *   rating: number | null, jumlah_ulasan: number | null, lat: number | null, lng: number | null,
 *   maps_url: string | null, halaman: string
 * }} BarisCsv
 */

/** @type {{ key: keyof BarisCsv, label: string }[]} */
export const KOLOM_CSV = [
	{ key: 'nama', label: 'Nama' },
	{ key: 'jenis', label: 'Jenis' },
	{ key: 'kabkota', label: 'Kabupaten/Kota' },
	{ key: 'kecamatan', label: 'Kecamatan' },
	{ key: 'alamat', label: 'Alamat' },
	{ key: 'status_magang', label: 'Status magang' },
	{ key: 'lowongan_aktif', label: 'Lowongan aktif' },
	{ key: 'whatsapp', label: 'WhatsApp' },
	{ key: 'telepon', label: 'Telepon' },
	{ key: 'email', label: 'Email' },
	{ key: 'website', label: 'Situs web' },
	{ key: 'instagram', label: 'Instagram' },
	{ key: 'linkedin', label: 'LinkedIn' },
	{ key: 'url_karir', label: 'Halaman karir' },
	{ key: 'catatan', label: 'Catatan' },
	{ key: 'rating', label: 'Rating Google' },
	{ key: 'jumlah_ulasan', label: 'Jumlah ulasan' },
	{ key: 'lat', label: 'Lintang' },
	{ key: 'lng', label: 'Bujur' },
	{ key: 'maps_url', label: 'Google Maps' },
	{ key: 'halaman', label: 'Halaman direktori' }
];

/**
 * @param {import('better-sqlite3').Database} db
 * @param {import('./companies.js').Filters} f
 * @param {{ urlDetail: (slug: string) => string, today?: string }} opsi
 * @returns {BarisCsv[]}
 */
export function barisCsv(db, f, opsi) {
	const { items } = listCompanies(db, f, { today: opsi.today });
	/** @type {Map<string, { peringatan: string | null, url_karir: string | null, status_web: string, website: string | null }>} */
	const ekstra = new Map(
		db
			.prepare(
				'SELECT id, peringatan, url_karir, status_web, website FROM companies WHERE hidden = 0'
			)
			.all()
			.map((/** @type {any} */ r) => [r.id, r])
	);
	return items.map((c) => {
		const e = ekstra.get(c.id);
		const hostBermasalah = e && e.status_web !== 'aktif' ? hostDari(e.website) : null;
		return {
			nama: c.nama,
			jenis: JENIS[c.jenis].label,
			kabkota: kabkotaBySlug(c.kabkota)?.nama ?? c.kabkota,
			kecamatan: c.kecamatan,
			alamat: c.alamat,
			status_magang: MAGANG_STATUS[c.magang].label,
			lowongan_aktif: c.lowongan_aktif,
			whatsapp: formatPhone(c.whatsapp),
			telepon: formatPhone(c.telepon),
			email: c.email,
			website: c.website,
			instagram: c.instagram,
			linkedin: c.linkedin,
			url_karir: e && !diDomain(e.url_karir, hostBermasalah) ? e.url_karir : null,
			catatan: e?.peringatan ?? null,
			rating: c.rating,
			jumlah_ulasan: c.jumlah_ulasan,
			lat: c.lat,
			lng: c.lng,
			maps_url: c.maps_url,
			halaman: opsi.urlDetail(c.slug)
		};
	});
}
