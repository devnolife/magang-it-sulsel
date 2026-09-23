// Format tampilan (id-ID). Zona waktu dipatok ke WITA supaya hasil server dan browser sama.

const TANGGAL = new Intl.DateTimeFormat('id-ID', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: 'Asia/Makassar'
});
const TANGGAL_PENDEK = new Intl.DateTimeFormat('id-ID', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	timeZone: 'Asia/Makassar'
});
const ANGKA = new Intl.NumberFormat('id-ID');
const RATING = new Intl.NumberFormat('id-ID', {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1
});

/**
 * "2026-09-23" atau ISO datetime → "23 September 2026".
 * @param {string | null | undefined} value
 * @param {{ pendek?: boolean }} [opts]
 */
export function formatTanggal(value, opts = {}) {
	if (!value) return '';
	const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00+08:00` : value);
	if (Number.isNaN(date.getTime())) return '';
	return (opts.pendek ? TANGGAL_PENDEK : TANGGAL).format(date);
}

/** @param {number} n */
export function formatAngka(n) {
	return ANGKA.format(n);
}

/** @param {number} n */
export function formatRating(n) {
	return RATING.format(n);
}
