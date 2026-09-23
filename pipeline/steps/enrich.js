// Tahap `enrich`: cek website kandidat (aktif / mati / dibajak), ambil kontak (email, WhatsApp,
// telepon, Instagram, LinkedIn), cari halaman karir & kalimat magang. Hanya fetch biasa dengan
// robots.txt dihormati; halaman SPA dirender lewat Chrome pipeline hanya dengan `--render`.
// Hasil: pipeline/cache/enriched.json (sinyal teks untuk classify, kontak & status untuk export).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { AMBANG, skorAwal } from '../config/klasifikasi.js';
import { sleep, withPage } from '../lib/browser.js';
import { readJsonIfExists, writeJsonAtomic } from '../lib/cache.js';
import { fetchText } from '../lib/http.js';
import { CACHE_DIR } from '../lib/paths.js';
import { kebijakanRobots } from '../lib/robots.js';
import { analisisHalaman, kutipanMagang, platformKarir, tantanganBot } from '../lib/web-parse.js';
import { loadMerged } from './merge.js';

export const ENRICHED_FILE = path.join(CACHE_DIR, 'enriched.json');
const WEB_CACHE = path.join(CACHE_DIR, 'web');
const AGENT = 'magang-it-sulsel';
const TTL_MS = 30 * 864e5;
const PARALEL = 6;
const JEDA_MS = 1000;

/**
 * @typedef {import('./merge.js').Kandidat} Kandidat
 * @typedef {import('./merge.js').Bukti} Bukti
 * @typedef {{ ok: boolean, status: number, url_akhir: string, contentType: string, text: string, error: string | null, fetched_at: string, dariCache?: boolean }} Halaman
 * @typedef {{
 *   ambil: (url: string, opts?: { ulang?: boolean }) => Promise<Halaman>,
 *   boleh: (url: string) => Promise<boolean>,
 *   render?: (url: string) => Promise<{ html: string, url_akhir: string } | { gagal: string } | null>,
 *   tunggu?: (ms: number) => Promise<void>
 * }} IoWeb
 */

/**
 * @typedef {object} HasilWeb
 * @property {string} url                 website kandidat (apa adanya)
 * @property {string | null} url_akhir     setelah redirect
 * @property {'aktif' | 'mati' | 'dibajak' | 'tidak-ada'} status
 * @property {string | null} alasan
 * @property {boolean} dicek               false = hidup tetapi isinya tidak bisa dicek
 * @property {boolean} hapus_website       tautan bukan website (Google Maps, business.site)
 * @property {string} dicek_pada
 * @property {number | null} http_status
 * @property {string | null} judul
 * @property {string | null} deskripsi
 * @property {string[]} email
 * @property {string[]} whatsapp
 * @property {string[]} telepon
 * @property {string | null} instagram
 * @property {string | null} linkedin
 * @property {string | null} url_karir
 * @property {Bukti[]} bukti
 * @property {boolean} spa
 * @property {boolean} dirender
 */

const HOST_GOOGLE = /(^|\.)(google\.[a-z.]+|goo\.gl|g\.page|g\.co)$/i;
const HOST_BUSINESS_SITE = /\.business\.site$/i;
const HOST_SOSIAL =
	/(^|\.)(facebook\.com|fb\.com|fb\.me|instagram\.com|linkedin\.com|tiktok\.com|youtube\.com|youtu\.be|twitter\.com|x\.com|t\.me|wa\.me|whatsapp\.com|linktr\.ee|heylink\.me|taplink\.cc|linkbio\.co|msha\.ke|lynk\.id|bio\.link|shopee\.co\.id|tokopedia\.com|bukalapak\.com|blibli\.com)$/i;
const HOST_PARKIR =
	/(^|\.)(sedoparking\.com|hugedomains\.com|dan\.com|afternic\.com|parkingcrew\.net|bodis\.com|above\.com|domainmarket\.com|sav\.com|undeveloped\.com|parklogic\.com|parked\.com|domainnamesales\.com|atom\.com|squadhelp\.com)$/i;
const GALAT_TLS = /CERT|SSL|TLS|SELF_SIGNED|UNABLE_TO_VERIFY|UNABLE_TO_GET_ISSUER/i;
const GALAT_DNS = /ENOTFOUND|ENODATA/;
const GALAT_TOLAK = /ECONNREFUSED/;

/** @param {string} host */
const tanpaWww = (host) => host.toLowerCase().replace(/^www\d?\./, '');

/** @param {string} url */
function gantiWww(url) {
	const u = new URL(url);
	u.hostname = /^www\./i.test(u.hostname) ? u.hostname.slice(4) : `www.${u.hostname}`;
	return u.toString();
}

/**
 * Kunci satu website: host tanpa www + path tanpa garis miring akhir (query & hash diabaikan).
 * @param {string | null | undefined} url
 */
export function kunciWeb(url) {
	if (!url) return null;
	try {
		const u = new URL(url);
		if (!/^https?:$/.test(u.protocol)) return null;
		return `${tanpaWww(u.hostname)}${u.pathname.replace(/\/+$/, '')}`;
	} catch {
		return null;
	}
}

/**
 * @param {{ situs?: Record<string, HasilWeb> } | null | undefined} enriched
 * @param {string | null | undefined} url
 * @returns {HasilWeb | null}
 */
export function hasilWeb(enriched, url) {
	const k = kunciWeb(url);
	return (k && enriched?.situs?.[k]) || null;
}

/**
 * Website yang layak dicek: skor awal cukup tinggi supaya sinyal website (+2) masih bisa
 * mengubah putusan. Satu website dipakai beberapa kandidat (mis. bps.go.id) cukup dicek sekali.
 * @param {Kandidat[]} kandidat
 * @param {{ kab?: string[] }} [opts]
 * @returns {{ kunci: string, url: string, keys: string[], skor: number }[]}
 */
export function pilihSitus(kandidat, opts = {}) {
	/** @type {Map<string, { kunci: string, url: string, keys: string[], skor: number }>} */
	const situs = new Map();
	for (const k of kandidat) {
		if (!k.website) continue;
		if (opts.kab?.length && !opts.kab.includes(k.kabkota)) continue;
		const skor = skorAwal(k);
		if (skor < AMBANG.buang - 1) continue;
		const kunci = kunciWeb(k.website);
		if (!kunci) continue;
		const s = situs.get(kunci) ?? { kunci, url: k.website, keys: [], skor };
		s.keys.push(k.key);
		s.skor = Math.max(s.skor, skor);
		situs.set(kunci, s);
	}
	return [...situs.values()].sort((a, b) => b.skor - a.skor || a.kunci.localeCompare(b.kunci));
}

/**
 * @param {string} url
 * @returns {HasilWeb}
 */
function kosong(url) {
	return {
		url,
		url_akhir: null,
		status: 'aktif',
		alasan: null,
		dicek: true,
		hapus_website: false,
		dicek_pada: new Date().toISOString().slice(0, 10),
		http_status: null,
		judul: null,
		deskripsi: null,
		email: [],
		whatsapp: [],
		telepon: [],
		instagram: null,
		linkedin: null,
		url_karir: null,
		bukti: [],
		spa: false,
		dirender: false
	};
}

/** @param {Halaman} h */
const isHtml = (h) =>
	/html|xml/i.test(h.contentType) || (!h.contentType && /<(html|body|title)\b/i.test(h.text));

/**
 * Ambil dengan satu kali ulang untuk galat sementara, dan http:// bila sertifikat HTTPS ditolak
 * atau port 443 menolak koneksi.
 * @param {string} url
 * @param {IoWeb} io
 */
async function ambilTahan(url, io) {
	let h = await io.ambil(url);
	const cobaHttp = h.error && (GALAT_TLS.test(h.error) || GALAT_TOLAK.test(h.error));
	if (cobaHttp && url.startsWith('https:')) {
		const h2 = await io.ambil(url.replace(/^https:/, 'http:'));
		return h2.error ? h : h2;
	}
	const sementara =
		(h.error && !GALAT_DNS.test(h.error) && !GALAT_TOLAK.test(h.error)) || h.status >= 500;
	if (sementara && !h.dariCache) {
		await (io.tunggu ?? sleep)(3000);
		h = await io.ambil(url, { ulang: true });
	}
	return h;
}

/**
 * @template T
 * @param {T[]} list
 * @param {T | null | undefined} v
 */
function tambah(list, v) {
	if (v && !list.includes(v)) list.push(v);
}

/**
 * Periksa satu website. Semua I/O lewat `io` supaya bisa diuji tanpa jaringan.
 * @param {string} url
 * @param {IoWeb} io
 * @returns {Promise<HasilWeb>}
 */
export async function periksaSitus(url, io) {
	const hasil = kosong(url);
	const u0 = new URL(url);
	const host0 = tanpaWww(u0.hostname);
	if (HOST_GOOGLE.test(host0) || HOST_BUSINESS_SITE.test(host0)) {
		return {
			...hasil,
			status: 'tidak-ada',
			dicek: false,
			hapus_website: true,
			alasan: HOST_GOOGLE.test(host0)
				? 'tautan Google, bukan website'
				: 'situs business.site sudah ditutup Google (2024)'
		};
	}
	if (HOST_SOSIAL.test(host0)) {
		return { ...hasil, dicek: false, alasan: 'media sosial / marketplace, tidak dicek' };
	}

	let target = url;
	let root = `${u0.origin}/`;
	if (!(await io.boleh(target))) {
		if (target !== root && (await io.boleh(root))) target = root;
		else return { ...hasil, dicek: false, alasan: 'robots.txt melarang pengecekan otomatis' };
	}
	let hal = await ambilTahan(target, io);
	if (hal.error && GALAT_DNS.test(hal.error)) {
		// "www." kadang tanpa record DNS padahal domain induknya hidup (luwutimurkab.go.id), dan sebaliknya.
		const alt = gantiWww(target);
		if (await io.boleh(alt)) {
			const h2 = await ambilTahan(alt, io);
			if (!h2.error || !GALAT_DNS.test(h2.error)) {
				hal = h2;
				target = alt;
				root = `${new URL(alt).origin}/`;
			}
		}
	}
	if (!hal.error && (hal.status === 404 || hal.status === 410) && target !== root) {
		if (await io.boleh(root)) {
			const h2 = await ambilTahan(root, io);
			if (!h2.error && h2.ok) hal = h2;
		}
	}
	hasil.dicek_pada = hal.fetched_at.slice(0, 10);
	if (hal.error) {
		if (GALAT_TLS.test(hal.error)) {
			return { ...hasil, dicek: false, alasan: `sertifikat HTTPS bermasalah (${hal.error})` };
		}
		if (GALAT_DNS.test(hal.error)) {
			return { ...hasil, status: 'mati', alasan: 'domain tidak ditemukan (DNS)' };
		}
		if (GALAT_TOLAK.test(hal.error)) {
			return { ...hasil, status: 'mati', alasan: 'server menolak koneksi (ECONNREFUSED)' };
		}
		// Timeout/koneksi diputus bisa berarti server lambat atau menolak klien non-browser
		// (pln.co.id hidup tetapi memutus fetch Node), jadi baru dianggap mati bila Chrome juga gagal.
		const r = io.render ? await io.render(target) : null;
		if (!r) {
			return {
				...hasil,
				dicek: false,
				alasan: `server tidak merespons saat dicek (${hal.error}), belum dipastikan lewat browser`
			};
		}
		if ('gagal' in r) {
			return {
				...hasil,
				status: 'mati',
				alasan: `server tidak merespons (${hal.error}; browser: ${r.gagal})`
			};
		}
		hal = {
			ok: true,
			status: 200,
			url_akhir: r.url_akhir,
			contentType: 'text/html',
			text: r.html,
			error: null,
			fetched_at: new Date().toISOString(),
			dariCache: true
		};
		hasil.dirender = true;
	}
	hasil.url_akhir = hal.url_akhir;
	hasil.http_status = hasil.dirender ? null : hal.status;
	const hostAkhir = tanpaWww(new URL(hal.url_akhir).hostname);
	if (HOST_PARKIR.test(hostAkhir)) {
		return { ...hasil, status: 'mati', alasan: `dialihkan ke penjual domain (${hostAkhir})` };
	}
	if (HOST_GOOGLE.test(hostAkhir)) {
		return {
			...hasil,
			status: 'tidak-ada',
			dicek: false,
			hapus_website: true,
			alasan: 'dialihkan ke Google, website tidak ada lagi'
		};
	}
	if (HOST_SOSIAL.test(hostAkhir)) {
		return { ...hasil, dicek: false, alasan: `dialihkan ke ${hostAkhir}` };
	}

	if (!hal.ok) {
		if ([401, 403, 429, 503].includes(hal.status) || tantanganBot(hal.text)) {
			if (isHtml(hal) && !tantanganBot(hal.text)) {
				const a = analisisHalaman(hal.text, hal.url_akhir);
				// "403 Forbidden" polos sering dari WAF hosting (Imunify360/ModSecurity) yang menolak
				// klien non-browser, bukan tanda website mati.
				const galatHttp = /^\s*(401|403|429|503)\b/.test(a.judul ?? '');
				if (a.status !== 'aktif' && !galatHttp) {
					return { ...hasil, status: a.status, alasan: a.alasan };
				}
			}
			return { ...hasil, dicek: false, alasan: `HTTP ${hal.status}: akses otomatis ditolak` };
		}
		return { ...hasil, status: 'mati', alasan: `HTTP ${hal.status}` };
	}
	if (tantanganBot(hal.text)) return { ...hasil, dicek: false, alasan: 'dilindungi anti-bot' };
	if (!isHtml(hal)) {
		return { ...hasil, alasan: `bukan halaman HTML (${hal.contentType.split(';')[0] || '?'})` };
	}

	let a = analisisHalaman(hal.text, hal.url_akhir);
	if (a.refresh && kunciWeb(a.refresh) !== kunciWeb(hal.url_akhir) && (await io.boleh(a.refresh))) {
		const h2 = await ambilTahan(a.refresh, io);
		if (!h2.error && h2.ok && isHtml(h2)) {
			hal = h2;
			hasil.url_akhir = h2.url_akhir;
			a = analisisHalaman(h2.text, h2.url_akhir);
		}
	}
	if (a.spa && io.render && !hasil.dirender) {
		const r = await io.render(hasil.url_akhir ?? url);
		if (r && 'html' in r) {
			a = analisisHalaman(r.html, r.url_akhir);
			hasil.dirender = true;
		}
	}

	Object.assign(hasil, {
		status: a.status,
		alasan: a.alasan,
		judul: a.judul,
		deskripsi: a.deskripsi,
		email: [...a.email],
		whatsapp: [...a.whatsapp],
		telepon: [...a.telepon],
		instagram: a.instagram,
		linkedin: a.linkedin,
		spa: a.spa
	});
	if (a.status !== 'aktif') return hasil;

	const beranda = kunciWeb(hasil.url_akhir);
	const platform = a.tautan_karir.filter(platformKarir);
	/** @type {string[]} */
	const karirOk = [];
	/** @type {string | null} */
	let karirBukti = null;
	for (const t of a.tautan_karir.filter((x) => !platformKarir(x)).slice(0, 2)) {
		if (!(await io.boleh(t))) continue;
		const h = await io.ambil(t);
		if (h.error || !h.ok || !isHtml(h) || kunciWeb(h.url_akhir) === beranda) continue;
		const b = analisisHalaman(h.text, h.url_akhir);
		if (b.status !== 'aktif') continue;
		karirOk.push(h.url_akhir);
		for (const e of b.email) tambah(hasil.email, e);
		for (const w of b.whatsapp) tambah(hasil.whatsapp, w);
		const kutipan = kutipanMagang(h.text);
		if (kutipan.length) {
			karirBukti ??= h.url_akhir;
			hasil.bukti.push({
				tipe: 'halaman-karir',
				url: h.url_akhir,
				kutipan: kutipan[0],
				tanggal: h.fetched_at.slice(0, 10)
			});
		}
	}
	hasil.email = hasil.email.slice(0, 3);
	hasil.whatsapp = hasil.whatsapp.slice(0, 3);
	hasil.url_karir = karirBukti ?? karirOk[0] ?? platform[0] ?? null;
	if (!hasil.bukti.length && a.magang.length) {
		hasil.bukti.push({
			tipe: 'halaman-karir',
			url: hasil.url_akhir,
			kutipan: a.magang[0],
			tanggal: hal.fetched_at.slice(0, 10)
		});
	}
	return hasil;
}

// ---------------------------------------------------------------------------------------------
// I/O: cache disk per URL (metadata JSON + HTML gzip), robots.txt per origin, render Chrome

/** @param {string} url */
const berkasWeb = (url) =>
	path.join(WEB_CACHE, crypto.createHash('sha1').update(url).digest('hex'));

/** @param {unknown} err */
function kodeGalat(err) {
	const e = /** @type {any} */ (err);
	if (e?.name === 'TimeoutError' || e?.name === 'AbortError') return 'TIMEOUT';
	return String(e?.cause?.code || e?.code || e?.cause?.message || e?.message || 'ERROR').slice(
		0,
		80
	);
}

/**
 * @param {string} url
 * @param {{ fresh?: boolean, ulang?: boolean, jeda: () => Promise<void> }} ctx
 * @returns {Promise<Halaman>}
 */
async function ambilCache(url, ctx) {
	const base = berkasWeb(url);
	const meta = ctx.fresh || ctx.ulang ? null : readJsonIfExists(`${base}.json`);
	// Kegagalan (mungkin sementara) hanya di-cache sehari.
	const ttl = meta && (meta.error || meta.status >= 500) ? 864e5 : TTL_MS;
	if (meta && Date.now() - Date.parse(meta.fetched_at) < ttl) {
		const gz = `${base}.html.gz`;
		const text = fs.existsSync(gz) ? zlib.gunzipSync(fs.readFileSync(gz)).toString('utf8') : '';
		return { ...meta, text, dariCache: true };
	}
	await ctx.jeda();
	/** @type {Halaman} */
	let h;
	try {
		const res = await fetchText(url, {
			timeoutMs: 15_000,
			maxBytes: 1_500_000,
			headers: { accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5' }
		});
		h = {
			ok: res.ok,
			status: res.status,
			url_akhir: res.url,
			contentType: res.contentType,
			text: res.text,
			error: null,
			fetched_at: new Date().toISOString()
		};
	} catch (err) {
		h = {
			ok: false,
			status: 0,
			url_akhir: url,
			contentType: '',
			text: '',
			error: kodeGalat(err),
			fetched_at: new Date().toISOString()
		};
	}
	fs.mkdirSync(WEB_CACHE, { recursive: true });
	const { text, ...meta2 } = h;
	const simpanTeks = text && /html|xml|text\/plain/i.test(h.contentType || 'text/html');
	if (simpanTeks) fs.writeFileSync(`${base}.html.gz`, zlib.gzipSync(text));
	else fs.rmSync(`${base}.html.gz`, { force: true });
	writeJsonAtomic(`${base}.json`, { url, ...meta2 });
	return { ...h, text: simpanTeks ? text : '', dariCache: false };
}

/**
 * @param {string} url
 * @param {{ fresh?: boolean, izinkan: boolean }} ctx
 * @returns {Promise<{ html: string, url_akhir: string } | { gagal: string } | 'belum'>}
 *   `gagal` = Chrome pun tidak bisa membuka (net::ERR_*); 'belum' = tidak dirender kali ini.
 */
async function renderCache(url, ctx) {
	const base = `${berkasWeb(url)}.render`;
	const meta = ctx.fresh ? null : readJsonIfExists(`${base}.json`);
	if (
		meta &&
		Date.now() - Date.parse(meta.fetched_at) < TTL_MS &&
		fs.existsSync(`${base}.html.gz`)
	) {
		const html = zlib.gunzipSync(fs.readFileSync(`${base}.html.gz`)).toString('utf8');
		return { html, url_akhir: meta.url_akhir };
	}
	if (!ctx.izinkan) return 'belum';
	try {
		const r = await withPage(async (page) => {
			await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
			await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
			await sleep(1500);
			return { html: await page.content(), url_akhir: page.url() };
		});
		fs.mkdirSync(WEB_CACHE, { recursive: true });
		fs.writeFileSync(`${base}.html.gz`, zlib.gzipSync(r.html));
		writeJsonAtomic(`${base}.json`, {
			url,
			url_akhir: r.url_akhir,
			fetched_at: new Date().toISOString()
		});
		return r;
	} catch (err) {
		const pesan = err instanceof Error ? err.message.split('\n')[0] : String(err);
		const net = pesan.match(/net::ERR_[A-Z_]+/)?.[0];
		// Galat sertifikat/aborsi berarti server menjawab; galat lain (timeout Playwright, Chrome
		// mati) belum membuktikan apa-apa dan dicoba lagi pada run berikutnya.
		if (net && !/ERR_(ABORTED|CERT_|SSL_)/.test(net)) return { gagal: net };
		console.warn(`  ! render ${url}: ${pesan}`);
		return 'belum';
	}
}

/** @returns {{ dibuat_pada?: string, situs: Record<string, HasilWeb> }} */
export function loadEnriched() {
	return readJsonIfExists(ENRICHED_FILE, { situs: {} });
}

/**
 * @param {{ kab?: string[], limit?: number, fresh?: boolean, render?: boolean }} [opts]
 */
export async function runEnrich(opts = {}) {
	const { kandidat } = loadMerged();
	const semua = pilihSitus(kandidat, opts);
	const situs = semua.slice(0, opts.limit ?? Infinity);
	console.log(
		`• Enrich: ${semua.length} website layak dicek, ${situs.length} diproses${opts.render ? ' (SPA dirender lewat Chrome)' : ''}`
	);

	/** @type {Map<string, Promise<(url: string) => boolean>>} */
	const robots = new Map();
	/** Website SPA / tidak merespons yang belum dipastikan lewat Chrome. */
	/** @type {string[]} */
	const belumRender = [];
	let renderAntre = Promise.resolve();
	let jaringan = 0;

	/** @param {() => Promise<void>} jeda */
	const buatIo = (jeda) => {
		/** @type {IoWeb} */
		const io = {
			ambil: async (url, o = {}) => {
				const h = await ambilCache(url, { fresh: opts.fresh, ulang: o.ulang, jeda });
				if (!h.dariCache) jaringan++;
				return h;
			},
			boleh: async (url) => {
				const origin = new URL(url).origin;
				let p = robots.get(origin);
				if (!p) {
					p = ambilCache(`${origin}/robots.txt`, { fresh: opts.fresh, jeda }).then((r) =>
						kebijakanRobots(
							r.error ? null : { status: r.status, text: isHtml(r) ? '' : r.text },
							AGENT
						)
					);
					robots.set(origin, p);
				}
				return (await p)(url);
			},
			render: async (url) => {
				const job = renderAntre.then(() =>
					renderCache(url, { fresh: opts.fresh, izinkan: !!opts.render })
				);
				renderAntre = job.then(
					() => {},
					() => {}
				);
				const r = await job;
				if (r === 'belum') {
					belumRender.push(url);
					return null;
				}
				return r;
			}
		};
		return io;
	};

	/** @type {Map<string, typeof situs>} */
	const perHost = new Map();
	for (const s of situs) {
		const host = tanpaWww(new URL(s.url).hostname);
		perHost.set(host, [...(perHost.get(host) ?? []), s]);
	}
	const antrean = [...perHost.values()];
	/** @type {Record<string, HasilWeb>} */
	const hasil = {};
	let selesai = 0;
	const t0 = Date.now();

	const pekerja = async () => {
		for (;;) {
			const grup = antrean.shift();
			if (!grup) return;
			let terakhir = 0;
			const io = buatIo(async () => {
				const w = terakhir + JEDA_MS - Date.now();
				if (w > 0) await sleep(w);
				terakhir = Date.now();
			});
			for (const s of grup) {
				try {
					hasil[s.kunci] = await periksaSitus(s.url, io);
				} catch (err) {
					console.warn(`  ! ${s.url}: ${err instanceof Error ? err.message : err}`);
					continue;
				}
				selesai++;
				if (selesai % 50 === 0 || selesai === situs.length) {
					const detik = Math.round((Date.now() - t0) / 1000);
					console.log(`  … ${selesai}/${situs.length} website (${jaringan} request, ${detik}s)`);
				}
			}
		}
	};
	await Promise.all(Array.from({ length: PARALEL }, pekerja));

	const lama = loadEnriched();
	writeJsonAtomic(ENRICHED_FILE, {
		dibuat_pada: new Date().toISOString(),
		situs: { ...lama.situs, ...hasil }
	});

	const list = Object.values(hasil);
	/** @type {Record<string, number>} */
	const perStatus = {};
	for (const h of list) perStatus[h.status] = (perStatus[h.status] || 0) + 1;
	console.log(
		`✓ enrich: ${list.length} website`,
		perStatus,
		`· tidak bisa dicek ${list.filter((h) => !h.dicek).length}`,
		`· url karir ${list.filter((h) => h.url_karir).length}`,
		`· bukti magang ${list.filter((h) => h.bukti.length).length}`,
		`· email ${list.filter((h) => h.email.length).length}`
	);
	if (belumRender.length) {
		console.log(
			`  → ${belumRender.length} website (SPA / tidak merespons) belum dipastikan lewat Chrome; ${opts.render ? 'lihat peringatan render di atas' : 'jalankan `enrich --render` (Chrome :9335, jangan bersamaan dengan maps/detail)'}`
		);
	}
	return hasil;
}
