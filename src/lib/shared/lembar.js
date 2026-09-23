// "Lembar" = peta kecil bergaya atlas di halaman depan. Proyeksi equirectangular sederhana
// (koreksi cos lintang < 0,5% di Sulsel, diabaikan), dipotong ke daratan + Selayar.
// Dipakai bersama oleh scripts/gen-lembar.js (siluet statis) dan LembarAtlas.svelte (titik).

export const BATAS_LEMBAR = /** @type {const} */ ({
	barat: 118.55,
	timur: 121.85,
	utara: -1.85,
	selatan: -6.8
});

export const TINGGI_LEMBAR = 1000;
/** unit viewBox per derajat */
export const SKALA_LEMBAR = TINGGI_LEMBAR / (BATAS_LEMBAR.utara - BATAS_LEMBAR.selatan);
export const LEBAR_LEMBAR = Math.round((BATAS_LEMBAR.timur - BATAS_LEMBAR.barat) * SKALA_LEMBAR);

/**
 * @param {number} lat
 * @param {number} lng
 * @returns {[number, number]} [x, y] dalam unit viewBox
 */
export function proyeksiLembar(lat, lng) {
	return [(lng - BATAS_LEMBAR.barat) * SKALA_LEMBAR, (BATAS_LEMBAR.utara - lat) * SKALA_LEMBAR];
}

/** Label kota di lembar; posisi dari titik pusat kab/kota di kabkota.geojson. */
export const LABEL_LEMBAR = /** @type {const} */ ([
	{ nama: 'Makassar', lat: -5.135, lng: 119.423, sisi: 'kiri' },
	{ nama: 'Parepare', lat: -4.013, lng: 119.625, sisi: 'kiri' },
	{ nama: 'Palopo', lat: -2.992, lng: 120.196, sisi: 'kanan' },
	{ nama: 'Watampone', lat: -4.539, lng: 120.327, sisi: 'kanan' },
	{ nama: 'Benteng', lat: -6.118, lng: 120.458, sisi: 'kanan' },
	{ nama: 'Rantepao', lat: -2.969, lng: 119.898, sisi: 'kiri' }
]);
