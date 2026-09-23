// Chrome khusus pipeline, disambung lewat CDP (pola dari rule-based-jobsearch/src/browser.js).
// Port & profil sengaja terpisah: 9333 = Hunter karirku, 9334 = jev-ultrafast, 9335 = pipeline ini.
import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

export const CDP_PORT = Number.parseInt(process.env.CDP_PORT || '9335', 10);
export const CHROME = process.env.CHROME_PATH || defaultChromePath();
export const PROFILE =
	process.env.CHROME_PROFILE || path.join(os.homedir(), '.magang-it-sulsel', 'chrome-profile');

/** @param {number} ms */
export function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

/** Jeda acak supaya ritme tidak seperti robot. */
export function jitter(minMs = 1500, maxMs = 4000) {
	return sleep(minMs + Math.random() * (maxMs - minMs));
}

/** @returns {Promise<boolean>} */
export function cdpAlive() {
	return new Promise((resolve) => {
		const req = http.get(
			{ host: '127.0.0.1', port: CDP_PORT, path: '/json/version', timeout: 3000 },
			(res) => {
				res.resume();
				resolve(res.statusCode === 200);
			}
		);
		req.on('error', () => resolve(false));
		req.on('timeout', () => {
			req.destroy();
			resolve(false);
		});
	});
}

export async function ensureChrome(startUrl = 'about:blank') {
	if (await cdpAlive()) return;
	fs.mkdirSync(PROFILE, { recursive: true });
	const child = spawn(
		CHROME,
		[
			`--remote-debugging-port=${CDP_PORT}`,
			'--remote-debugging-address=127.0.0.1',
			`--user-data-dir=${PROFILE}`,
			'--no-first-run',
			'--no-default-browser-check',
			'--lang=id-ID',
			'--window-size=1400,950',
			startUrl
		],
		{ detached: true, stdio: 'ignore' }
	);
	/** @type {Error | null} */
	let spawnError = null;
	child.once('error', (error) => {
		spawnError = error;
	});
	child.unref();
	for (let i = 0; i < 30; i++) {
		await sleep(1000);
		if (spawnError) throw new Error(`Gagal menjalankan Chrome di ${CHROME}: ${spawnError}`);
		if (await cdpAlive()) return;
	}
	throw new Error(`Chrome CDP tidak muncul di port ${CDP_PORT}`);
}

/**
 * Buka satu tab khusus, jalankan `fn(page)`, lalu tutup tab itu (Chrome tetap hidup).
 * @template T
 * @param {(page: import('playwright-core').Page) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withPage(fn) {
	await ensureChrome();
	const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
	/** @type {import('playwright-core').Page | undefined} */
	let page;
	try {
		const ctx = browser.contexts()[0];
		if (!ctx) throw new Error('Chrome CDP tidak punya browser context');
		page = await ctx.newPage();
		return await fn(page);
	} finally {
		if (page && !page.isClosed()) await page.close().catch(() => {});
		await browser.close().catch(() => {});
	}
}

/** Matikan semua proses Chrome yang memakai profil pipeline (khusus Windows). */
export function stopChrome() {
	return new Promise((resolve) => {
		if (process.platform !== 'win32') return resolve(undefined);
		const escaped = PROFILE.replace(/'/g, "''");
		execFile(
			'powershell',
			[
				'-NoProfile',
				'-Command',
				`Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*${escaped}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`
			],
			() => resolve(undefined)
		);
	});
}

function defaultChromePath() {
	if (process.platform === 'win32') {
		return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
	}
	if (process.platform === 'darwin') {
		return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
	}
	return 'google-chrome';
}
