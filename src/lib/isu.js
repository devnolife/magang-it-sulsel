// Kiriman publik (usulan tempat, koreksi, cerita magang) lewat formulir GitHub Issues di repo
// proyek; pengelola memeriksanya lalu memasukkan ke data. Belum ada formulir & panel admin sendiri.

export const REPO_URL = 'https://github.com/devnolife/magang-it-sulsel';

/** @typedef {'usulan-tempat' | 'koreksi-data' | 'cerita-magang'} TemplatIsu */

/**
 * URL formulir isu baru. `isian` mengisi kolom teks formulir berdasarkan `id` kolomnya di
 * .github/ISSUE_TEMPLATE/<templat>.yml.
 * @param {TemplatIsu} templat
 * @param {{ judul?: string, isian?: Record<string, string> }} [opsi]
 */
export function urlIsu(templat, opsi = {}) {
	const sp = new URLSearchParams({ template: `${templat}.yml` });
	if (opsi.judul) sp.set('title', opsi.judul);
	for (const [k, v] of Object.entries(opsi.isian ?? {})) {
		if (v) sp.set(k, v);
	}
	return `${REPO_URL}/issues/new?${sp}`;
}

/**
 * Pencarian isu berjudul "<awalan> <nama>", mis. semua cerita magang untuk satu tempat.
 * @param {string} awalan
 * @param {string} nama
 */
export function urlCariIsu(awalan, nama) {
	const q = `is:issue in:title "${`${awalan} ${nama}`.replaceAll('"', '')}"`;
	return `${REPO_URL}/issues?${new URLSearchParams({ q })}`;
}
