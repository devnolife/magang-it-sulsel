// Parser HTML Google Maps (daftar hasil & panel tempat). Dipisah dari runner (maps.js) supaya
// bisa diuji dengan fixture dan cepat diperbaiki bila DOM Maps berubah.
import * as cheerio from 'cheerio';

/**
 * Bentuk "tempat mentah" yang dihasilkan semua sumber (maps, osm, seed) sebelum merge.
 * @typedef {object} Tempat
 * @property {'maps' | 'osm' | 'kurasi'} sumber
 * @property {string} key                  kunci unik per sumber, mis. "maps:0x..:0x.." atau "osm:node/1"
 * @property {string} nama
 * @property {string | null} kategori      kategori Maps ("Perusahaan Software") atau ringkasan tag OSM
 * @property {Record<string, string>} [tags_osm]
 * @property {string | null} alamat
 * @property {number | null} lat
 * @property {number | null} lng
 * @property {string | null} telepon       mentah; dinormalkan saat merge
 * @property {string | null} website
 * @property {string | null} [email]
 * @property {number | null} rating
 * @property {number | null} jumlah_ulasan
 * @property {string | null} maps_url
 * @property {string | null} osm_url
 * @property {string | null} google_fid
 * @property {string | null} [place_id]
 * @property {'tutup-permanen' | 'tutup-sementara' | null} status_tempat
 * @property {boolean} [sponsor]
 * @property {string} [query]              query pencarian asal (untuk laporan)
 */

const PUA = /[\uE000-\uF8FF]/g; // glyph ikon google-symbols
const SPACES = /[\s\u00a0\u202f]+/g;

/** @param {string | null | undefined} s */
export function cleanText(s) {
	if (!s) return '';
	return s.replace(PUA, ' ').replace(SPACES, ' ').trim();
}

/**
 * Ambil fid, koordinat, dan place_id dari URL tempat Maps
 * (`.../data=!4m7!3m6!1s0x..:0x..!8m2!3d-5.18!4d119.38!16s%2Fg%2F11..!19sChIJ...`).
 * @param {string | null | undefined} href
 */
export function parsePlaceUrl(href) {
	/** @type {{ fid: string | null, lat: number | null, lng: number | null, placeId: string | null }} */
	const out = { fid: null, lat: null, lng: null, placeId: null };
	if (!href) return out;
	const fid = href.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);
	const lat = href.match(/!3d(-?\d+(?:\.\d+)?)/);
	const lng = href.match(/!4d(-?\d+(?:\.\d+)?)/);
	const pid = href.match(/!19s(ChIJ[\w-]+)/);
	if (fid) out.fid = fid[1].toLowerCase();
	if (lat && lng) {
		out.lat = Number(lat[1]);
		out.lng = Number(lng[1]);
	} else {
		const at = href.match(/@(-?\d+\.\d+),(-?\d+\.\d+),/);
		if (at) {
			out.lat = Number(at[1]);
			out.lng = Number(at[2]);
		}
	}
	if (pid) out.placeId = pid[1];
	return out;
}

/**
 * URL Maps yang rapi untuk ditampilkan (format resmi Maps URLs bila ada place_id).
 * @param {string} nama
 * @param {{ placeId: string | null, lat: number | null, lng: number | null }} u
 * @param {string | null | undefined} href
 */
export function mapsUrlFor(nama, u, href) {
	if (u.placeId) {
		return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nama)}&query_place_id=${u.placeId}`;
	}
	if (href) {
		try {
			const url = new URL(href, 'https://www.google.com');
			for (const p of ['authuser', 'g_ep', 'rclk', 'entry', 'hl']) url.searchParams.delete(p);
			return url.toString();
		} catch {
			/* abaikan */
		}
	}
	if (u.lat != null && u.lng != null) {
		return `https://www.google.com/maps/search/?api=1&query=${u.lat},${u.lng}`;
	}
	return null;
}

/**
 * Buka pembungkus redirect Google (`/url?q=...`).
 * @param {string | null | undefined} href
 */
export function unwrapGoogleRedirect(href) {
	if (!href) return null;
	try {
		const url = new URL(href, 'https://www.google.com');
		if (/(^|\.)google\.[a-z.]+$/.test(url.hostname) && url.pathname === '/url') {
			return url.searchParams.get('q') || url.searchParams.get('url');
		}
		if (!/^https?:$/.test(url.protocol)) return null;
		return url.toString();
	} catch {
		return null;
	}
}

/**
 * "5,0 bintang 21 Ulasan" / "4,6 stars 1.234 Reviews" -> { rating, ulasan }
 * @param {string | null | undefined} label
 */
export function parseRatingLabel(label) {
	const text = cleanText(label);
	const r = text.match(/(\d(?:[.,]\d)?)\s*(?:bintang|stars?)/i);
	const n = text.match(/([\d.,]+)\s*(?:ulasan|reviews?)/i);
	return {
		rating: r ? Number(r[1].replace(',', '.')) : null,
		ulasan: n ? Number(n[1].replace(/[.,]/g, '')) : null
	};
}

const PHONE_RE = /(?:\+62|\(0\d{2,3}\)|0)[\d\s()-]{6,16}\d/;

/** @param {string} text */
function statusFromText(text) {
	if (/tutup permanen|permanently closed/i.test(text)) return 'tutup-permanen';
	if (/tutup sementara|temporarily closed/i.test(text)) return 'tutup-sementara';
	return null;
}

/**
 * Kategori Maps hampir tidak pernah berisi angka; segmen dengan nomor, plus code, atau berawalan
 * Jl., Blok, Ruko, dst. dianggap alamat.
 * @param {string} s
 */
export function looksLikeAddress(s) {
	return (
		/\d{2,}/.test(s) ||
		/\bno\.?\s*\d/i.test(s) ||
		/\b[a-z]{1,2}[-.]?\d\b/i.test(s) ||
		/^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/.test(s) ||
		/^(jl|jln|jalan|blk|blok|komp|kompleks|ruko|perum|perumahan|gg|gang|lorong|btn|kav|lt|lantai)\b/i.test(
			s
		)
	);
}

/**
 * Parse panel daftar hasil (`div[role="feed"]`).
 * @param {string} html
 * @param {{ query?: string }} [ctx]
 * @returns {{ places: Tempat[], end: boolean }}
 */
export function parseFeedHtml(html, ctx = {}) {
	const $ = cheerio.load(html);
	/** @type {Tempat[]} */
	const places = [];
	const seen = new Set();
	$('a[href*="/maps/place/"]').each((_, a) => {
		const $a = $(a);
		const href = $a.attr('href') || '';
		const u = parsePlaceUrl(href);
		const $card = $a.parent();
		const nama = cleanText($a.attr('aria-label') || $card.find('.qBF1Pd').first().text());
		if (!nama) return;
		const key = u.fid ? `maps:${u.fid}` : `maps:${nama.toLowerCase()}|${u.lat},${u.lng}`;
		if (seen.has(key)) return;
		seen.add(key);

		// Baris info: [kategori · alamat] lalu [jam buka · telepon]
		const rows = $card
			.find('.W4Efsd > .W4Efsd')
			.toArray()
			.map((row) => segments($, row));
		const first = rows[0] || [];
		/** @type {string | null} */
		let kategori = first[0] ?? null;
		let alamatParts = first.slice(1);
		if (kategori && (PHONE_RE.test(kategori) || looksLikeAddress(kategori))) {
			kategori = null;
			alamatParts = first;
		}
		const alamat = alamatParts.join(', ') || null;

		const allText = cleanText($card.text());
		let telepon = cleanText($card.find('.UsdlK').first().text()) || null;
		if (!telepon) {
			const m = rows.slice(1).flat().join(' ').match(PHONE_RE);
			telepon = m ? cleanText(m[0]) : null;
		}
		const webEl = $card
			.find(
				'a[data-value="Situs Web"], a[data-value="Website"], a[aria-label^="Kunjungi situs"], a[aria-label^="Visit"]'
			)
			.first();
		const website = unwrapGoogleRedirect(webEl.attr('href'));

		const ratingEl = $card.find('span[role="img"][aria-label]').first();
		let { rating, ulasan } = parseRatingLabel(ratingEl.attr('aria-label'));
		if (rating == null) {
			const r = cleanText($card.find('.MW4etd').first().text());
			rating = r ? Number(r.replace(',', '.')) : null;
		}
		if (ulasan == null) {
			const n = cleanText($card.find('.UY7F9').first().text()).replace(/[^\d]/g, '');
			ulasan = n ? Number(n) : null;
		}

		places.push({
			sumber: 'maps',
			key,
			nama,
			kategori,
			alamat,
			lat: u.lat,
			lng: u.lng,
			telepon,
			website,
			rating: Number.isFinite(rating) ? rating : null,
			jumlah_ulasan: Number.isFinite(ulasan) ? ulasan : null,
			maps_url: mapsUrlFor(nama, u, href),
			osm_url: null,
			google_fid: u.fid,
			place_id: u.placeId,
			status_tempat: statusFromText(allText),
			sponsor: /\b(Bersponsor|Sponsored)\b/.test(allText),
			...(ctx.query ? { query: ctx.query } : {})
		});
	});
	const end = /akhir daftar|end of the list/i.test($.root().text());
	return { places, end };
}

/**
 * Pisah teks satu baris info berdasarkan pemisah "·".
 * @param {import('cheerio').CheerioAPI} $
 * @param {import('domhandler').Element} row
 */
function segments($, row) {
	/** @type {string[]} */
	const texts = [];
	$(row)
		.find('*')
		.addBack()
		.contents()
		.each((_, n) => {
			if (n.type === 'text') texts.push(/** @type {import('domhandler').Text} */ (n).data);
		});
	return cleanText(texts.join(' '))
		.split('·')
		.map((s) => cleanText(s))
		.filter(Boolean);
}

/**
 * Parse panel tempat (`div[role="main"]` di halaman /maps/place/...).
 * @param {string} html
 * @param {string} url URL halaman (sumber fid & koordinat)
 * @param {{ query?: string }} [ctx]
 * @returns {Tempat | null}
 */
export function parsePlaceHtml(html, url, ctx = {}) {
	const $ = cheerio.load(html);
	const nama = cleanText($('h1').first().text());
	if (!nama) return null;
	const u = parsePlaceUrl(url);
	const kategori = cleanText($('button[jsaction*="category"]').first().text()) || null;
	const alamat =
		cleanText($('[data-item-id="address"]').attr('aria-label')).replace(
			/^(Alamat|Address):\s*/i,
			''
		) || null;
	const website = unwrapGoogleRedirect($('a[data-item-id="authority"]').attr('href'));
	const telId = $('[data-item-id^="phone:tel:"]').attr('data-item-id');
	const telepon = telId ? telId.slice('phone:tel:'.length) : null;

	/** @type {number | null} */
	let rating = null;
	/** @type {number | null} */
	let ulasan = null;
	const f7 = cleanText($('div.F7nice').first().text()); // "5,0(21)"
	const m = f7.match(/^(\d(?:[.,]\d)?)\s*\(([\d.,]+)\)/);
	if (m) {
		rating = Number(m[1].replace(',', '.'));
		ulasan = Number(m[2].replace(/[.,]/g, ''));
	} else {
		$('span[role="img"][aria-label]').each((_, el) => {
			// Kartu usaha lain di bagian "Di tempat ini" (halaman alamat gedung) bukan rating tempat ini.
			if ($(el).closest('[role="article"]').length) return;
			const p = parseRatingLabel($(el).attr('aria-label'));
			if (rating == null && p.rating != null) rating = p.rating;
			if (ulasan == null && p.ulasan != null) ulasan = p.ulasan;
		});
	}
	const key = u.fid ? `maps:${u.fid}` : `maps:${nama.toLowerCase()}|${u.lat},${u.lng}`;
	return {
		sumber: 'maps',
		key,
		nama,
		kategori,
		alamat,
		lat: u.lat,
		lng: u.lng,
		telepon,
		website,
		rating,
		jumlah_ulasan: ulasan,
		maps_url: mapsUrlFor(nama, u, url),
		osm_url: null,
		google_fid: u.fid,
		place_id: u.placeId,
		status_tempat: statusFromText(cleanText($.root().text()).slice(0, 4000)),
		...(ctx.query ? { query: ctx.query } : {})
	};
}

/**
 * Deteksi halaman blokir/captcha Google.
 * @param {string} url
 * @param {string} bodyText
 */
export function isBlocked(url, bodyText) {
	if (/\/sorry\/|consent\.google\./.test(url)) return true;
	return /unusual traffic|traffic yang tidak biasa|lalu lintas yang tidak biasa|not a robot|bukan robot/i.test(
		bodyText.slice(0, 5000)
	);
}
