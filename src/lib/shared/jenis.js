/**
 * Jenis tempat yang masuk direktori. Urutan objek = urutan tampil di filter.
 * @typedef {'software' | 'konsultan' | 'isp' | 'agency' | 'instansi' | 'startup'} Jenis
 */

/** @type {Record<Jenis, { label: string, short: string, color: string }>} */
export const JENIS = {
	software: { label: 'Software house & aplikasi', short: 'Software', color: '#2563eb' },
	konsultan: { label: 'Konsultan IT & jaringan', short: 'Konsultan IT', color: '#7c3aed' },
	isp: { label: 'ISP & telekomunikasi', short: 'ISP/Telko', color: '#0891b2' },
	agency: { label: 'Digital agency & kreatif', short: 'Agency', color: '#db2777' },
	instansi: { label: 'Instansi & divisi IT', short: 'Instansi', color: '#b45309' },
	startup: { label: 'Startup & coworking', short: 'Startup', color: '#15803d' }
};

/** @type {Jenis[]} */
export const JENIS_KEYS = /** @type {Jenis[]} */ (Object.keys(JENIS));

/**
 * @param {unknown} value
 * @returns {value is Jenis}
 */
export function isJenis(value) {
	return typeof value === 'string' && Object.hasOwn(JENIS, value);
}
