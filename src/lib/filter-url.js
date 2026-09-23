// Filter halaman depan <-> query string. Parameter bawaan dibuang supaya URL tetap pendek dan
// mudah dibagikan; urutan kunci tetap supaya URL yang sama selalu identik.

/** Banyak kartu per "Tampilkan lagi" (parameter `n` di URL). */
export const LANGKAH = 30;
const MAKS_TAMPIL = 5000;

/**
 * `n` dari URL, dibulatkan ke kelipatan LANGKAH dan dibatasi.
 * @param {string | null} nilai
 */
export function bacaJumlahTampil(nilai) {
	const n = Number.parseInt(nilai ?? '', 10);
	if (!Number.isFinite(n) || n <= LANGKAH) return LANGKAH;
	return Math.min(Math.ceil(n / LANGKAH) * LANGKAH, MAKS_TAMPIL);
}

/**
 * @typedef {{ q?: string, kab?: readonly string[], jenis?: readonly string[], magang?: readonly string[], lowongan?: boolean, urut?: string }} FilterUrl
 */

/**
 * @param {FilterUrl} f
 * @param {{ n?: number, tanpaUrut?: boolean }} [opsi]
 */
export function queryFilter(f, opsi = {}) {
	const sp = new URLSearchParams();
	const q = (f.q || '').trim();
	if (q) sp.set('q', q);
	for (const k of f.kab || []) sp.append('kab', k);
	for (const j of f.jenis || []) sp.append('jenis', j);
	for (const m of f.magang || []) sp.append('magang', m);
	if (f.lowongan) sp.set('lowongan', '1');
	if (!opsi.tanpaUrut && f.urut && f.urut !== 'relevansi') sp.set('urut', f.urut);
	if (opsi.n) sp.set('n', String(opsi.n));
	return sp.toString();
}

/**
 * @param {FormData} fd isi form #saring
 */
export function queryDariForm(fd) {
	const teks = (/** @type {string} */ k) => {
		const v = fd.get(k);
		return typeof v === 'string' ? v : '';
	};
	const daftar = (/** @type {string} */ k) =>
		fd.getAll(k).filter((v) => typeof v === 'string' && v !== '');
	return queryFilter({
		q: teks('q'),
		kab: /** @type {string[]} */ (daftar('kab')),
		jenis: /** @type {string[]} */ (daftar('jenis')),
		magang: /** @type {string[]} */ (daftar('magang')),
		lowongan: teks('lowongan') === '1',
		urut: teks('urut')
	});
}

/**
 * Banyaknya filter aktif (kata kunci dihitung satu).
 * @param {Required<Omit<FilterUrl, 'urut'>>} f
 */
export function jumlahFilterAktif(f) {
	return (f.q ? 1 : 0) + f.kab.length + f.jenis.length + f.magang.length + (f.lowongan ? 1 : 0);
}
