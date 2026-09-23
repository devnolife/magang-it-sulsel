/** Kode area 2 digit di Indonesia (sisanya 3 digit, mis. 0411 Makassar). */
const AREA_2_DIGIT = new Set(['21', '22', '24', '31', '61']);

/**
 * Normalkan nomor telepon Indonesia ke E.164 (+62...). Mengembalikan null bila
 * tidak masuk akal (nomor pendek, kode negara lain).
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
export function normalizePhone(raw) {
	if (!raw) return null;
	let s = String(raw).trim();
	// Buang ekstensi / catatan setelah nomor: "0411-123456 ext 12", "0812... (WA)".
	s = s.replace(/\s*(ext\.?|ekst\.?|x)\s*\d+\s*$/i, '');
	const plus = s.startsWith('+');
	let digits = s.replace(/\D/g, '');
	if (!digits) return null;
	if (plus) {
		if (!digits.startsWith('62')) return null;
	} else if (digits.startsWith('0062')) {
		digits = digits.slice(2);
	} else if (digits.startsWith('62')) {
		// sudah berkode negara tanpa '+'
	} else if (digits.startsWith('0')) {
		digits = '62' + digits.slice(1);
	} else if (digits.startsWith('8') && digits.length >= 9 && digits.length <= 12) {
		digits = '62' + digits;
	} else {
		return null;
	}
	const national = digits.slice(2);
	if (national.startsWith('0')) return null;
	if (national.length < 7 || national.length > 13) return null;
	if (national.startsWith('8') && national.length < 9) return null;
	return '+' + digits;
}

/**
 * Nomor seluler (08xx) biasanya bisa dihubungi lewat WhatsApp.
 * @param {string | null | undefined} e164
 */
export function isMobile(e164) {
	return !!e164 && /^\+628\d{8,11}$/.test(e164);
}

/**
 * @param {string | null | undefined} e164
 * @returns {string | null}
 */
export function waLink(e164) {
	return isMobile(e164) ? `https://wa.me/${/** @type {string} */ (e164).slice(1)}` : null;
}

/**
 * Tampilan lokal: "0812-3456-7890" atau "(0411) 123456".
 * @param {string | null | undefined} e164
 */
export function formatPhone(e164) {
	if (!e164) return '';
	if (!e164.startsWith('+62')) return e164;
	const national = '0' + e164.slice(3);
	if (national.startsWith('08')) {
		return national.replace(/^(\d{4})(\d{4})(\d+)$/, '$1-$2-$3');
	}
	const two = national.slice(1, 3);
	const areaLen = AREA_2_DIGIT.has(two) ? 3 : 4;
	return `(${national.slice(0, areaLen)}) ${national.slice(areaLen)}`;
}

/**
 * Ambil nomor dari URL WhatsApp (wa.me/62812..., api.whatsapp.com/send?phone=...).
 * @param {string} url
 * @returns {string | null}
 */
export function phoneFromWaUrl(url) {
	try {
		const u = new URL(url);
		const host = u.hostname.replace(/^www\./, '');
		if (host === 'wa.me') return normalizePhone(u.pathname.split('/')[1] || '');
		if (host.endsWith('whatsapp.com')) return normalizePhone(u.searchParams.get('phone') || '');
	} catch {
		// bukan URL valid
	}
	return null;
}
