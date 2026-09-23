// Runner Google Maps lewat Chrome sendiri (CDP :9335), tanpa login. Satu tab, jeda acak,
// batas per run, cache per pencarian (bisa dilanjutkan), berhenti total bila muncul captcha.
import fs from 'node:fs';
import path from 'node:path';
import { planMapsSearches, searchUrl } from '../config/queries.js';
import { jitter, sleep, withPage } from '../lib/browser.js';
import { readJson, writeJsonAtomic } from '../lib/cache.js';
import { CACHE_DIR } from '../lib/paths.js';
import { isBlocked, parseFeedHtml, parsePlaceHtml } from './maps-parse.js';

export const MAPS_CACHE = path.join(CACHE_DIR, 'maps');
export const MAPS_DETAIL_CACHE = path.join(CACHE_DIR, 'maps-detail');

export class BlockedError extends Error {
	name = 'BlockedError';
}

/**
 * @typedef {import('./maps-parse.js').Tempat} Tempat
 * @typedef {{ id: string, kab: string, query: string, text: string, url: string, page_url?: string, kind: string, fetched_at: string, end: boolean, places: Tempat[] }} MapsCacheEntry
 */

/** @param {{ id: string }} s */
const cacheFile = (s) => path.join(MAPS_CACHE, `${s.id}.json`);

/**
 * @param {import('playwright-core').Page} page
 */
async function checkBlocked(page) {
	const text = await page
		.evaluate(() => document.body?.innerText?.slice(0, 5000) || '')
		.catch(() => '');
	if (isBlocked(page.url(), text)) {
		throw new BlockedError(
			'Google menampilkan pemeriksaan/captcha. Scraping dihentikan. Tunggu beberapa jam atau ' +
				'selesaikan pemeriksaan secara manual di jendela Chrome pipeline, lalu jalankan ulang ' +
				'(progres tersimpan di cache).'
		);
	}
}

/**
 * @param {import('playwright-core').Page} page
 * @param {import('../config/queries.js').MapsSearch} s
 * @param {number} maxResults
 * @returns {Promise<{ url: string, page_url: string, kind: string, end: boolean, places: Tempat[], html: string }>}
 */
async function runOne(page, s, maxResults) {
	const url = searchUrl(s);
	await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await sleep(2000);
	await checkBlocked(page);
	await page
		.waitForFunction(
			() =>
				document.querySelector('div[role="feed"]') ||
				document.querySelector('h1.DUwDvf') ||
				/tidak dapat menemukan|tidak menemukan hasil|can't find/i.test(
					document.body?.innerText || ''
				),
			undefined,
			{ timeout: 25_000 }
		)
		.catch(() => {});
	await checkBlocked(page);

	const hasFeed = await page.$('div[role="feed"]');
	if (!hasFeed) {
		if (page.url().includes('/maps/place/') || (await page.$('h1.DUwDvf'))) {
			// Hasil tunggal: Maps baru mengganti URL ke /maps/place/...!1s<fid>!3d<lat>!4d<lng> ±4 detik
			// kemudian. Sebelum itu URL masih URL pencarian (koordinatnya = pusat pencarian, bukan tempat).
			for (let i = 0; i < 20 && !/\/maps\/place\/.*!1s0x/.test(page.url()); i++) await sleep(500);
			await sleep(800);
			const html = await mainPanelHtml(page);
			const place = parsePlaceHtml(html, page.url(), { query: s.query });
			return {
				url,
				page_url: page.url(),
				kind: 'place',
				end: true,
				places: place ? [place] : [],
				html
			};
		}
		return { url, page_url: page.url(), kind: 'kosong', end: true, places: [], html: '' };
	}

	let last = 0;
	let stagnant = 0;
	for (let i = 0; i < 45; i++) {
		const state = await page.evaluate(() => {
			const feed = document.querySelector('div[role="feed"]');
			if (!feed) return { n: 0, end: true };
			feed.scrollTop = feed.scrollHeight;
			return {
				n: feed.querySelectorAll('a[href*="/maps/place/"]').length,
				end: /akhir daftar|end of the list/i.test(/** @type {HTMLElement} */ (feed).innerText)
			};
		});
		if (state.end || state.n >= maxResults) break;
		if (state.n === last) {
			if (++stagnant >= 4) break;
		} else stagnant = 0;
		last = state.n;
		await jitter(1200, 2600);
		await checkBlocked(page);
	}
	const html = await page.$eval('div[role="feed"]', (el) => el.outerHTML);
	const parsed = parseFeedHtml(html, { query: s.query });
	return { url, page_url: page.url(), kind: 'feed', end: parsed.end, places: parsed.places, html };
}

/** @param {import('playwright-core').Page} page */
function mainPanelHtml(page) {
	return page.evaluate(() => {
		const mains = [...document.querySelectorAll('div[role="main"]')];
		return mains.map((m) => m.outerHTML).sort((a, b) => b.length - a.length)[0] || '';
	});
}

/**
 * @param {{ kab?: string[], limit?: number, fresh?: boolean, maxResults?: number }} opts
 */
export async function runMaps(opts = {}) {
	const { kab, limit = Infinity, fresh = false, maxResults = 120 } = opts;
	const plan = planMapsSearches({ kab });
	fs.mkdirSync(MAPS_CACHE, { recursive: true });
	const todo = plan.filter((s) => fresh || !fs.existsSync(cacheFile(s)));
	const n = Math.min(todo.length, limit);
	console.log(
		`• Maps: ${plan.length} pencarian terencana, ${plan.length - todo.length} sudah di cache, ${n} dijalankan sekarang`
	);
	if (!n) return;
	let done = 0;
	await withPage(async (page) => {
		await page.setViewportSize({ width: 1366, height: 900 }).catch(() => {});
		for (const s of todo) {
			if (done >= limit) break;
			const t0 = Date.now();
			/** @type {Awaited<ReturnType<typeof runOne>> | undefined} */
			let result;
			for (let attempt = 1; attempt <= 2 && !result; attempt++) {
				try {
					result = await runOne(page, s, maxResults);
				} catch (err) {
					if (err instanceof BlockedError) throw err;
					console.warn(`  ! ${s.id} percobaan ${attempt} gagal: ${err}`);
					await jitter(5000, 9000);
				}
			}
			done++;
			if (!result) continue;
			const { html, ...rest } = result;
			/** @type {MapsCacheEntry} */
			const entry = {
				id: s.id,
				kab: s.kab,
				query: s.query,
				text: s.text,
				fetched_at: new Date().toISOString(),
				...rest
			};
			// HTML mentah disimpan supaya perbaikan parser bisa diterapkan tanpa scraping ulang.
			if (html) fs.writeFileSync(cacheFile(s).replace(/\.json$/, '.html'), html);
			writeJsonAtomic(cacheFile(s), entry);
			const secs = Math.round((Date.now() - t0) / 1000);
			console.log(
				`  [${done}/${n}] ${s.label} · "${s.query}" → ${result.places.length} tempat (${result.kind}${result.end ? ', akhir daftar' : ''}) ${secs}s`
			);
			if (done < n) await jitter(6000, 14000);
		}
	});
}

/**
 * Semua hasil Maps dari cache (pencarian + detail).
 * @returns {{ searches: MapsCacheEntry[], details: Map<string, Tempat> }}
 */
export function loadMapsCache() {
	/** @type {MapsCacheEntry[]} */
	const searches = [];
	if (fs.existsSync(MAPS_CACHE)) {
		for (const f of fs.readdirSync(MAPS_CACHE).sort()) {
			if (!f.endsWith('.json')) continue;
			/** @type {MapsCacheEntry} */
			const entry = readJson(path.join(MAPS_CACHE, f));
			const htmlFile = path.join(MAPS_CACHE, f.replace(/\.json$/, '.html'));
			if (fs.existsSync(htmlFile)) {
				const html = fs.readFileSync(htmlFile, 'utf8');
				if (entry.kind === 'feed') {
					entry.places = parseFeedHtml(html, { query: entry.query }).places;
				} else if (entry.kind === 'place' && entry.page_url) {
					const p = parsePlaceHtml(html, entry.page_url, { query: entry.query });
					entry.places = p ? [p] : [];
				}
			}
			searches.push(entry);
		}
	}
	/** @type {Map<string, Tempat>} */
	const details = new Map();
	if (fs.existsSync(MAPS_DETAIL_CACHE)) {
		for (const f of fs.readdirSync(MAPS_DETAIL_CACHE)) {
			if (!f.endsWith('.json')) continue;
			const d = readJson(path.join(MAPS_DETAIL_CACHE, f));
			const htmlFile = path.join(MAPS_DETAIL_CACHE, f.replace(/\.json$/, '.html'));
			if (fs.existsSync(htmlFile) && d.page_url) {
				d.place = parsePlaceHtml(fs.readFileSync(htmlFile, 'utf8'), d.page_url);
			}
			if (d?.place) details.set(d.key, d.place);
		}
	}
	return { searches, details };
}

/** @param {string} key */
const detailFile = (key) =>
	path.join(MAPS_DETAIL_CACHE, `${key.replace(/[^a-z0-9]+/gi, '_').slice(0, 120)}.json`);

/**
 * Buka halaman tempat untuk kandidat yang datanya belum lengkap (alamat lengkap + kontak).
 * @param {{ key: string, nama: string, maps_url: string | null }[]} targets
 * @param {{ limit?: number, fresh?: boolean }} [opts]
 */
export async function runMapsDetail(targets, opts = {}) {
	const { limit = Infinity, fresh = false } = opts;
	fs.mkdirSync(MAPS_DETAIL_CACHE, { recursive: true });
	const todo = targets.filter((t) => t.maps_url && (fresh || !fs.existsSync(detailFile(t.key))));
	const n = Math.min(todo.length, limit);
	console.log(`• Detail Maps: ${targets.length} kandidat, ${n} halaman dibuka sekarang`);
	if (!n) return;
	let done = 0;
	await withPage(async (page) => {
		for (const t of todo) {
			if (done >= limit) break;
			done++;
			try {
				await page.goto(/** @type {string} */ (t.maps_url), {
					waitUntil: 'domcontentloaded',
					timeout: 60_000
				});
				await sleep(2000);
				await checkBlocked(page);
				await page.waitForSelector('h1', { timeout: 20_000 }).catch(() => {});
				await sleep(1200);
				const html = await mainPanelHtml(page);
				const place = parsePlaceHtml(html, page.url());
				const file = detailFile(t.key);
				if (html) fs.writeFileSync(file.replace(/\.json$/, '.html'), html);
				writeJsonAtomic(file, {
					key: t.key,
					fetched_at: new Date().toISOString(),
					page_url: page.url(),
					place
				});
				console.log(
					`  [${done}/${n}] ${t.nama} → ${place ? [place.telepon, place.website].filter(Boolean).join(' · ') || 'tanpa kontak' : 'gagal'}`
				);
			} catch (err) {
				if (err instanceof BlockedError) throw err;
				console.warn(`  ! ${t.nama}: ${err}`);
			}
			if (done < n) await jitter(4000, 9000);
		}
	});
}
