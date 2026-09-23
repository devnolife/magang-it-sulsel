// Analisis halaman website perusahaan (murni, dari HTML): status (aktif / mati / dibajak), kontak,
// tautan karir, dan kalimat yang menyebut magang.
import * as cheerio from 'cheerio';
import { MAGANG_RE } from '../../src/lib/shared/magang-status.js';
import { isMobile, normalizePhone, phoneFromWaUrl } from '../../src/lib/shared/phone.js';

/** Judul halaman bawaan server / parkir domain / akun hosting diblokir. */
const JUDUL_MATI =
	/^(welcome to nginx|apache2? .*default page|test page for|index of \/|iis windows server|default (web )?(site )?page|web server'?s default page|account suspended|suspended|domain .*(for sale|dijual)|this domain|parked|hugedomains|site not found|website not found|domain (has )?expired|404 not found|403 forbidden|coming soon|under construction|website (sedang )?(dalam )?(perbaikan|maintenance)|maintenance mode)\b/i;
/** Isi halaman pendek yang menandakan domain parkir / kedaluwarsa / belum dipasang. */
const ISI_MATI =
	/(this domain (may be |is )?for sale|buy this domain|domain (ini )?(sedang )?dijual|parked (free|by|domain)|parkingcrew|sedoparking|(account|website|site|situs)( anda| ini)? (is |has been |telah |sedang )?(suspended|ditangguhkan|disuspend)|akun .{0,40}(ditangguhkan|disuspend)|hosting .{0,40}(berakhir|expired|habis)|domain .{0,40}(expired|kedaluwarsa|kadaluarsa)|future home of something quite cool|there is no website configured|domain not configured|it works!|default (web )?page|coming soon|under construction|segera hadir)/i;

/** Istilah spam judi (situs dibajak). Kata umum ("judi" di berita) sengaja tidak masuk. */
const JUDI =
	/\b(slot ?gacor|gacor|slot online|situs slot|slot ?88|slot demo|maxwin|scatter hitam|togel|toto ?(macau|hk|sgp|4d)|bandar (togel|judi|slot)|judi (online|bola|slot)|casino online|sbobet|pragmatic play|mahjong ways|link alternatif|deposit (pulsa|dana)|rtp (slot|live))\b/gi;
const CJK = /[\u3040-\u30ff\u3400-\u9fff]/g;

const KARIR_RE =
	/\b(karir|karier|career|careers|lowongan|loker|rekrut\w*|recruit\w*|join (us|our team)|bergabung|hiring|vacanc\w*|jobs?|magang|internship)\b/i;
/** Segmen path halaman karir (utuh, supaya artikel "tips-karir-..." tidak ikut). */
const SEGMEN_KARIR =
	/^(karir|karier|careers?|lowongan(-kerja)?|loker|rekrutmen|recruitment|join-?us|jobs?|magang|internship|vacanc(y|ies)|hiring)$/i;
const HOST_KARIR = /^(karir|karier|careers?|jobs|recruitment|rekrutmen)\./i;
/** Platform lowongan: tautan ke sini dipakai sebagai url_karir tetapi tidak diambil. */
const PLATFORM_KARIR =
	/(^|\.)(jobstreet\.co\.id|id\.jobstreet\.com|jobstreet\.com|glints\.com|kalibrr\.(com|id)|karirhub\.kemnaker\.go\.id|dealls\.com|loker\.id|topkarir\.com|indeed\.com|jobs\.id|karir\.com|lever\.co|greenhouse\.io|workable\.com)$/i;

/**
 * Tautan sesitus yang menuju halaman karir: segmen path khas karir, subdomain karir, atau teks
 * menu pendek ("Karir", "Join Us"). Beranda tanpa query tidak dihitung.
 * @param {URL} u
 * @param {string} teks
 */
function tautanKarir(u, teks) {
	if (HOST_KARIR.test(u.hostname)) return true;
	const seg = u.pathname
		.split('/')
		.filter(Boolean)
		.map((s) => decodeURIComponent(s).replace(/\.(html?|php|aspx?)$/i, ''));
	if (!seg.length && !u.search) return false;
	if (seg.length <= 3 && seg.some((s) => SEGMEN_KARIR.test(s))) return true;
	return teks.split(' ').length <= 4 && KARIR_RE.test(teks);
}

/**
 * @param {string} url
 * @returns {boolean} true bila tautan menuju platform lowongan (JobStreet, Glints, dst.)
 */
export function platformKarir(url) {
	try {
		return PLATFORM_KARIR.test(tanpaWww(new URL(url).hostname));
	} catch {
		return false;
	}
}
const REKRUT_RE =
	/\b(buka|dibuka|membuka|menerima|terima|open|lowongan|daftar|pendaftaran|recruit\w*|hiring|kesempatan|program|kuota|batch|apply|lamar\w*)\b/i;

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}/gi;
const EMAIL_PALSU =
	/(\.(png|jpe?g|gif|webp|svg|css|js)$|@(example|domain|email|yourdomain|yoursite|website|sentry|wixpress|mysite|company)\.|^(user|nama|name|test|contoh|email|your|info@info)@)/i;

const BLOK =
	'p,div,li,h1,h2,h3,h4,h5,h6,section,article,td,th,tr,header,footer,nav,ul,ol,dd,dt,blockquote,main,aside,form,table,figure,figcaption';

/** @param {string} s */
const rapikan = (s) => s.replace(/[\s\u00a0]+/g, ' ').trim();

/** Pemisah blok (karakter privat): baris baru di sumber HTML bukan batas kalimat. */
const BATAS = '\uE000';

/**
 * @param {cheerio.CheerioAPI} $
 * @returns {string[]}
 */
function daftarKalimat($) {
	$('script,style,noscript,svg,template,iframe').remove();
	$('br').replaceWith(BATAS);
	$(BLOK).each((_, el) => {
		$(el).append(BATAS);
	});
	const out = [];
	for (const line of $.root().text().split(BATAS)) {
		const t = rapikan(line);
		if (t.length < 3) continue;
		for (const s of t.split(/(?<=[.!?])\s+/)) if (s.length >= 3 && s.length <= 600) out.push(s);
	}
	return out;
}

/** @param {string} host */
const tanpaWww = (host) => host.toLowerCase().replace(/^www\d?\./, '');

/**
 * @param {string} href
 * @param {string} base
 */
function absolut(href, base) {
	try {
		const u = new URL(href, base);
		return /^https?:$/.test(u.protocol) ? u : null;
	} catch {
		return null;
	}
}

/**
 * Tantangan anti-bot (Cloudflare dsb.): website hidup tetapi tidak bisa dicek otomatis.
 * @param {string} html
 */
export function tantanganBot(html) {
	return /cf-browser-verification|challenge-platform|cf_chl_|just a moment\.\.\.|checking your browser|attention required! \| cloudflare|ddos-guard/i.test(
		html.slice(0, 20000)
	);
}

/**
 * @typedef {{
 *   judul: string | null, deskripsi: string | null, bahasa: string | null, panjang_teks: number,
 *   status: 'aktif' | 'mati' | 'dibajak', alasan: string | null,
 *   email: string[], whatsapp: string[], telepon: string[],
 *   instagram: string | null, linkedin: string | null,
 *   tautan_karir: string[], magang: string[], spa: boolean, refresh: string | null
 * }} AnalisisHalaman
 */

/**
 * @param {string} html
 * @param {string} url URL akhir halaman (untuk tautan relatif & email sedomain)
 * @returns {AnalisisHalaman}
 */
export function analisisHalaman(html, url) {
	const $ = cheerio.load(html);
	const pageUrl = new URL(url);
	const host = tanpaWww(pageUrl.hostname);
	pageUrl.hash = '';
	const halaman = pageUrl.href;
	const judul =
		rapikan($('title').first().text()) || $('meta[property="og:title"]').attr('content');
	const deskripsi =
		rapikan(
			$('meta[name="description"]').attr('content') ||
				$('meta[property="og:description"]').attr('content') ||
				''
		).slice(0, 300) || null;
	const bahasa = $('html').attr('lang')?.toLowerCase() || null;
	const refreshAttr = $('meta[http-equiv="refresh" i]').attr('content') || '';
	const refreshUrl = refreshAttr.match(/url\s*=\s*['"]?([^'";]+)/i)?.[1];
	const refresh = refreshUrl ? (absolut(refreshUrl, url)?.toString() ?? null) : null;

	/** @type {string[]} */
	const email = [];
	/** @type {string[]} */
	const whatsapp = [];
	/** @type {string[]} */
	const telepon = [];
	/** @type {string | null} */
	let instagram = null;
	/** @type {string | null} */
	let linkedin = null;
	/** @type {string[]} */
	const karir = [];
	const tambah = (/** @type {string[]} */ a, /** @type {string | null} */ v) => {
		if (v && !a.includes(v)) a.push(v);
	};

	$('a[href]').each((_, el) => {
		const href = ($(el).attr('href') || '').trim();
		const teks = rapikan($(el).text());
		if (/^mailto:/i.test(href)) {
			tambah(email, decodeURIComponent(href.slice(7).split('?')[0]).trim().toLowerCase());
			return;
		}
		if (/^tel:/i.test(href)) {
			tambah(telepon, normalizePhone(decodeURIComponent(href.slice(4))));
			return;
		}
		const u = absolut(href, url);
		if (!u) return;
		const h = tanpaWww(u.hostname);
		if (h === 'wa.me' || h.endsWith('whatsapp.com')) {
			const no = phoneFromWaUrl(u.toString());
			if (isMobile(no)) tambah(whatsapp, no);
			return;
		}
		if (h.endsWith('instagram.com')) {
			const seg = u.pathname.split('/').filter(Boolean)[0];
			if (
				!instagram &&
				seg &&
				!/^(p|reel|reels|explore|accounts|stories|tv|direct|share|about|legal)$/i.test(seg)
			) {
				instagram = `https://www.instagram.com/${seg.toLowerCase()}/`;
			}
			return;
		}
		if (h.endsWith('linkedin.com')) {
			const m = u.pathname.match(/^\/company\/([^/]+)/i);
			if (!linkedin && m) linkedin = `https://www.linkedin.com/company/${m[1].toLowerCase()}/`;
			return;
		}
		u.hash = '';
		if (PLATFORM_KARIR.test(h)) {
			tambah(karir, u.toString());
		} else if (
			(h === host || h.endsWith(`.${host}`)) &&
			u.href !== halaman &&
			tautanKarir(u, teks)
		) {
			tambah(karir, u.toString());
		}
	});

	const kalimat = daftarKalimat($);
	const teks = kalimat.join(' ');
	for (const m of teks.matchAll(EMAIL_RE)) tambah(email, m[0].toLowerCase());
	const emailBersih = email
		.filter((e) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(e) && !EMAIL_PALSU.test(e))
		.filter((e) => e.split('@')[0].length <= 40)
		.sort((a, b) => Number(sedomain(b, host)) - Number(sedomain(a, host)));

	const magang = [
		...new Set(kalimat.filter((s) => MAGANG_RE.test(s) && REKRUT_RE.test(s)).map(potong))
	].slice(0, 3);

	/** @type {'aktif' | 'mati' | 'dibajak'} */
	let status = 'aktif';
	/** @type {string | null} */
	let alasan = null;
	const judi = new Set(
		[...`${judul ?? ''} ${teks} ${$('a').text()}`.matchAll(JUDI)].map((m) => m[0].toLowerCase())
	);
	const judulJudi = !!judul && new RegExp(JUDI.source, 'i').test(judul);
	const cjk = judul ? (judul.match(CJK)?.length ?? 0) / judul.length : 0;
	if (judi.size >= 2 || judulJudi || cjk > 0.3) {
		status = 'dibajak';
		alasan =
			cjk > 0.3
				? 'judul berisi teks spam berhuruf Jepang/Cina'
				: `berisi istilah judi: ${[...judi].slice(0, 3).join(', ')}`;
	} else if (judul && JUDUL_MATI.test(judul)) {
		status = 'mati';
		alasan = `halaman bawaan/parkir: "${judul.slice(0, 60)}"`;
	} else if (teks.length < 1500 && ISI_MATI.test(teks)) {
		status = 'mati';
		alasan = `halaman parkir/kedaluwarsa: "${teks.match(ISI_MATI)?.[0]}"`;
	}

	const spa =
		teks.length < 200 &&
		/id=["'](root|app|__next|__nuxt)["']|__NEXT_DATA__|ng-version|data-reactroot|window\.__NUXT__/i.test(
			html
		);

	return {
		judul: judul ? judul.slice(0, 200) : null,
		deskripsi,
		bahasa,
		panjang_teks: teks.length,
		status,
		alasan,
		email: emailBersih.slice(0, 3),
		whatsapp: whatsapp.slice(0, 3),
		telepon: telepon.slice(0, 3),
		instagram,
		linkedin,
		tautan_karir: karir.slice(0, 5),
		magang,
		spa,
		refresh
	};
}

/**
 * Kalimat yang menyebut magang di halaman karir (tanpa syarat kata rekrutmen).
 * @param {string} html
 * @returns {string[]}
 */
export function kutipanMagang(html) {
	const kalimat = daftarKalimat(cheerio.load(html));
	return [...new Set(kalimat.filter((s) => MAGANG_RE.test(s)).map(potong))].slice(0, 3);
}

/** @param {string} s */
function potong(s) {
	return s.length <= 300 ? s : `${s.slice(0, 297).replace(/\s+\S*$/, '')}...`;
}

/**
 * @param {string} email
 * @param {string} host
 */
function sedomain(email, host) {
	const dom = email.split('@')[1] ?? '';
	const akar = host.split('.').slice(-3).join('.');
	return dom === host || host.endsWith(`.${dom}`) || dom.endsWith(akar);
}
