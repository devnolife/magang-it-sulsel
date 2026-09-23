// Tahap detail: buka halaman tempat Maps untuk kandidat yang layak tetapi kontaknya belum lengkap
// (kartu hasil pencarian sering tanpa telepon/website). Hasilnya masuk ke kandidat pada `merge`
// berikutnya. Jangan dijalankan bersamaan dengan tahap `maps` (satu Chrome, risiko captcha).
import { AMBANG, skorAwal } from '../config/klasifikasi.js';
import { runMapsDetail } from '../sources/maps.js';
import { loadMerged } from './merge.js';

/**
 * Urutan: seed kurasi dulu, lalu skor aturan tertinggi, lalu jumlah ulasan.
 * @param {import('./merge.js').Kandidat[]} kandidat
 * @param {{ kab?: string[] }} [opts]
 * @returns {{ key: string, nama: string, maps_url: string | null }[]}
 */
export function pilihTargetDetail(kandidat, opts = {}) {
	return kandidat
		.filter((k) => k.key.startsWith('maps:') && k.maps_url && (!k.telepon || !k.website))
		.filter((k) => !opts.kab?.length || opts.kab.includes(k.kabkota))
		.map((k) => ({ k, skor: skorAwal(k) }))
		.filter((x) => x.skor > AMBANG.buang)
		.sort(
			(a, b) =>
				b.skor - a.skor ||
				(b.k.jumlah_ulasan ?? 0) - (a.k.jumlah_ulasan ?? 0) ||
				a.k.key.localeCompare(b.k.key)
		)
		.map(({ k }) => ({ key: k.key, nama: k.nama, maps_url: k.maps_url }));
}

/** @param {{ kab?: string[], limit?: number, fresh?: boolean }} [opts] */
export async function runDetail(opts = {}) {
	const { kandidat } = loadMerged();
	const targets = pilihTargetDetail(kandidat, opts);
	await runMapsDetail(targets, { limit: opts.limit, fresh: opts.fresh });
	console.log('  → jalankan `merge` lagi supaya data halaman detail masuk ke kandidat');
}
