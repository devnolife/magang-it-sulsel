// Email opsional untuk yang tidak punya akun GitHub (mis. pemilik usaha yang minta hapus data).
import { env } from '$env/dynamic/public';

/** @returns {string | null} */
export function emailKontak() {
	const e = env.PUBLIC_KONTAK_EMAIL?.trim() ?? '';
	return /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(e) ? e : null;
}
