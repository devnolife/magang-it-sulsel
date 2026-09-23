/**
 * Posisi pengguna untuk urut "terdekat" dan jarak di kartu. Hanya disimpan di memori
 * browser; tidak pernah dikirim ke server.
 * @typedef {'awal' | 'meminta' | 'ok' | 'ditolak' | 'gagal' | 'tidak-didukung'} StatusLokasi
 */

/** @type {{ status: StatusLokasi, lat: number | null, lng: number | null }} */
export const lokasi = $state({ status: 'awal', lat: null, lng: null });

export function mintaLokasi() {
	if (typeof navigator === 'undefined' || !navigator.geolocation) {
		lokasi.status = 'tidak-didukung';
		return;
	}
	lokasi.status = 'meminta';
	navigator.geolocation.getCurrentPosition(
		(pos) => {
			lokasi.lat = pos.coords.latitude;
			lokasi.lng = pos.coords.longitude;
			lokasi.status = 'ok';
		},
		(err) => {
			lokasi.status = err.code === err.PERMISSION_DENIED ? 'ditolak' : 'gagal';
		},
		{ enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 }
	);
}
