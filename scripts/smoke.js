#!/usr/bin/env node
// Uji asap terhadap server yang sudah berjalan, misalnya setelah `npm run build && npm start`:
//   npm run smoke -- [http://127.0.0.1:3000]
import process from 'node:process';

const base = new URL(process.argv[2] || process.env.SMOKE_URL || 'http://127.0.0.1:3000');

let gagal = 0;

/**
 * @param {string} nama
 * @param {() => Promise<string | void>} fn
 */
async function uji(nama, fn) {
	try {
		const info = await fn();
		console.log(`✓ ${nama}${info ? ` · ${info}` : ''}`);
	} catch (err) {
		gagal++;
		console.log(`✗ ${nama}: ${err instanceof Error ? err.message : err}`);
	}
}

/**
 * @param {unknown} kondisi
 * @param {string} pesan
 * @returns {asserts kondisi}
 */
function pastikan(kondisi, pesan) {
	if (!kondisi) throw new Error(pesan);
}

/**
 * @param {string} path
 * @param {{ status?: number, tipe?: string }} [harap]
 */
async function ambil(path, harap = {}) {
	const res = await fetch(new URL(path, base), {
		redirect: 'manual',
		signal: AbortSignal.timeout(20_000)
	});
	const bytes = new Uint8Array(await res.arrayBuffer());
	const body = new TextDecoder().decode(bytes);
	const status = harap.status ?? 200;
	pastikan(res.status === status, `status ${res.status}, seharusnya ${status}`);
	const tipe = res.headers.get('content-type') ?? '';
	if (harap.tipe) pastikan(tipe.startsWith(harap.tipe), `content-type "${tipe}"`);
	return { res, body, bytes };
}

/** @param {Response} res */
function cekHeaderKeamanan(res) {
	const h = res.headers;
	pastikan(h.get('x-content-type-options') === 'nosniff', 'x-content-type-options bukan nosniff');
	pastikan(h.get('referrer-policy'), 'referrer-policy tidak ada');
}

/** @param {string} html */
const judul = (html) => html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? '(tanpa judul)';

let halamanPerusahaan = '';

await uji('beranda', async () => {
	const { res, body } = await ambil('/', { tipe: 'text/html' });
	cekHeaderKeamanan(res);
	const csp = res.headers.get('content-security-policy') ?? '';
	pastikan(csp.includes("default-src 'self'"), 'CSP tidak ada atau tanpa default-src');
	pastikan(csp.includes("frame-ancestors 'none'"), "CSP tanpa frame-ancestors 'none'");
	return judul(body);
});

await uji('cari + filter kab/kota', async () => {
	const { body } = await ambil('/?q=software&kab=makassar', { tipe: 'text/html' });
	const kartu = new Set(body.match(/perusahaan\/[a-z0-9-]+/g) ?? []);
	pastikan(kartu.size > 0, 'tidak ada kartu perusahaan');
	return `${kartu.size} tautan perusahaan`;
});

await uji('tentang', async () => {
	const { body } = await ambil('/tentang', { tipe: 'text/html' });
	pastikan(body.includes('OpenStreetMap'), 'atribusi OpenStreetMap tidak ada');
	return judul(body);
});

await uji('usulkan', async () => {
	const { body } = await ambil('/usulkan', { tipe: 'text/html' });
	for (const t of ['usulan-tempat', 'koreksi-data', 'cerita-magang']) {
		pastikan(body.includes(`issues/new?template=${t}.yml`), `tautan templat ${t} tidak ada`);
	}
	return judul(body);
});

await uji('sitemap.xml', async () => {
	const { body } = await ambil('/sitemap.xml', { tipe: 'application/xml' });
	const loc = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
	const perusahaan = loc.find((l) => l.includes('/perusahaan/'));
	pastikan(perusahaan, 'tidak ada halaman perusahaan di sitemap');
	// sitemap memakai ORIGIN; ambil path-nya saja supaya tetap bisa diuji di localhost
	halamanPerusahaan = new URL(perusahaan.replaceAll('&#38;', '&')).pathname;
	return `${loc.length} URL`;
});

await uji('halaman perusahaan', async () => {
	pastikan(halamanPerusahaan, 'dilewati: sitemap gagal');
	const { res, body } = await ambil(halamanPerusahaan, { tipe: 'text/html' });
	cekHeaderKeamanan(res);
	pastikan(body.includes('rel="canonical"'), 'canonical tidak ada');
	pastikan(body.includes('issues/new?template=koreksi-data.yml'), 'tautan koreksi tidak ada');
	return `${halamanPerusahaan} · ${judul(body)}`;
});

await uji('404 perusahaan tidak dikenal', async () => {
	await ambil(`/perusahaan/tidak-ada-${Date.now()}`, { status: 404, tipe: 'text/html' });
});

await uji('data.csv', async () => {
	const { res, body, bytes } = await ambil('/data.csv?kab=makassar', { tipe: 'text/csv' });
	pastikan(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf, 'tanpa BOM UTF-8');
	pastikan(body.startsWith('Nama,'), 'baris judul tidak diawali "Nama"');
	pastikan(/attachment/.test(res.headers.get('content-disposition') ?? ''), 'bukan unduhan');
	return `${body.trim().split('\r\n').length - 1} baris`;
});

await uji('robots.txt', async () => {
	const { body } = await ambil('/robots.txt', { tipe: 'text/plain' });
	pastikan(/^Sitemap: https?:\/\/\S+\/sitemap\.xml$/m.test(body), 'baris Sitemap tidak ada');
});

console.log(`\n${gagal ? `✗ ${gagal} uji gagal` : '✓ semua uji lolos'} (${base.origin})`);
process.exit(gagal ? 1 : 0);
