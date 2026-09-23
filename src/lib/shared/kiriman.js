// Label isian mahasiswa, dipakai bersama oleh form, validasi server, dan halaman detail.

/** @typedef {'mandiri' | 'kampus' | 'mbkm' | 'pkl'} Skema */

/** @type {Record<Skema, string>} */
export const SKEMA = {
	mandiri: 'Magang mandiri',
	kampus: 'Program kampus',
	mbkm: 'MBKM',
	pkl: 'PKL / kerja praktik'
};

/** @type {Skema[]} */
export const SKEMA_KEYS = /** @type {Skema[]} */ (Object.keys(SKEMA));
