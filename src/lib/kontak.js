// Tautan kontak untuk kartu & halaman detail. Semua href disaring di sini (hanya http/https,
// tel:, mailto:, wa.me) supaya komponen tinggal merender.
import { formatPhone, waLink } from './shared/phone.js';

/**
 * @typedef {'wa' | 'tel' | 'email' | 'web' | 'ig' | 'li' | 'maps'} JenisKontak
 * @typedef {'whatsapp' | 'phone' | 'mail' | 'globe' | 'instagram' | 'linkedin' | 'map'} IkonKontak
 * @typedef {{ jenis: JenisKontak, href: string, label: string, nilai: string, ikon: IkonKontak, eksternal: boolean, catatan: string | null }} Kontak
 * @typedef {{ nama: string, whatsapp?: string | null, telepon?: string | null, email?: string | null, website?: string | null, instagram?: string | null, linkedin?: string | null, maps_url?: string | null }} SumberKontak
 */

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"']+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;
const E164_RE = /^\+\d{8,15}$/;

export const SUBJEK_EMAIL = 'Pertanyaan kesempatan magang';

/**
 * URL http/https yang sudah dinormalkan, atau null untuk skema lain (javascript:, data:, ...).
 * @param {string | null | undefined} url
 * @param {string} [hostAkhiran] wajib berakhiran host ini, mis. "instagram.com"
 */
export function urlAman(url, hostAkhiran) {
	if (!url) return null;
	try {
		const u = new URL(url);
		if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
		if (hostAkhiran) {
			const h = u.hostname.toLowerCase();
			if (h !== hostAkhiran && !h.endsWith(`.${hostAkhiran}`)) return null;
		}
		return u.href;
	} catch {
		return null;
	}
}

/**
 * Nama untuk sapaan: buang ekor promosi setelah pemisah ("X || IT Solution ...", "X - Jasa ...").
 * @param {string} nama
 */
export function namaSapaan(nama) {
	const depan = nama.split(/\s*(?:\|{1,2}|–|—|\s-\s)\s*/)[0].trim();
	return (depan || nama.trim()).slice(0, 80);
}

/** @param {string} nama */
export function pesanWa(nama) {
	return `Halo ${namaSapaan(nama)}, saya mahasiswa informatika. Apakah ada kesempatan magang/PKL di tempat Anda?`;
}

/** @param {string} url */
function hostTampil(url) {
	return new URL(url).hostname.replace(/^www\./, '');
}

/** @param {string} url */
function akunInstagram(url) {
	const akun = new URL(url).pathname.split('/').filter(Boolean)[0];
	return akun ? `@${akun}` : 'Instagram';
}

/**
 * Urutan: WhatsApp, telepon, email, situs, Instagram, LinkedIn (hanya mode lengkap), Maps.
 * Data kosong atau tidak aman tidak menghasilkan tombol.
 * @param {SumberKontak} c
 * @param {{ lengkap?: boolean }} [opsi]
 * @returns {Kontak[]}
 */
export function daftarKontak(c, opsi = {}) {
	/** @type {Kontak[]} */
	const out = [];
	const wa = waLink(c.whatsapp);
	if (wa) {
		out.push({
			jenis: 'wa',
			href: `${wa}?text=${encodeURIComponent(pesanWa(c.nama))}`,
			label: 'WhatsApp',
			nilai: formatPhone(c.whatsapp),
			ikon: 'whatsapp',
			eksternal: true,
			catatan: 'Nomor seluler dari Google Maps atau situsnya; belum tentu aktif di WhatsApp.'
		});
	}
	if (c.telepon && E164_RE.test(c.telepon)) {
		out.push({
			jenis: 'tel',
			href: `tel:${c.telepon}`,
			label: 'Telepon',
			nilai: formatPhone(c.telepon),
			ikon: 'phone',
			eksternal: false,
			catatan: null
		});
	}
	if (c.email && EMAIL_RE.test(c.email)) {
		out.push({
			jenis: 'email',
			href: `mailto:${c.email}?subject=${encodeURIComponent(SUBJEK_EMAIL)}`,
			label: 'Email',
			nilai: c.email,
			ikon: 'mail',
			eksternal: false,
			catatan: null
		});
	}
	const web = urlAman(c.website);
	if (web) {
		out.push({
			jenis: 'web',
			href: web,
			label: 'Situs web',
			nilai: hostTampil(web),
			ikon: 'globe',
			eksternal: true,
			catatan: null
		});
	}
	const ig = urlAman(c.instagram, 'instagram.com');
	if (ig) {
		out.push({
			jenis: 'ig',
			href: ig,
			label: 'Instagram',
			nilai: akunInstagram(ig),
			ikon: 'instagram',
			eksternal: true,
			catatan: null
		});
	}
	const li = opsi.lengkap ? urlAman(c.linkedin, 'linkedin.com') : null;
	if (li) {
		out.push({
			jenis: 'li',
			href: li,
			label: 'LinkedIn',
			nilai: 'LinkedIn',
			ikon: 'linkedin',
			eksternal: true,
			catatan: null
		});
	}
	const maps = urlAman(c.maps_url);
	if (maps) {
		out.push({
			jenis: 'maps',
			href: maps,
			label: 'Google Maps',
			nilai: 'Buka di Maps',
			ikon: 'map',
			eksternal: true,
			catatan: null
		});
	}
	return out;
}

/**
 * rel untuk tautan keluar; kiriman mahasiswa diberi nofollow ugc.
 * @param {'pipeline' | 'mahasiswa' | string} origin
 */
export function relEksternal(origin) {
	return origin === 'mahasiswa'
		? 'external nofollow ugc noopener noreferrer'
		: 'external noopener noreferrer';
}
