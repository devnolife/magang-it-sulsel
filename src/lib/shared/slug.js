/**
 * @param {string} text
 * @param {number} [max]
 */
export function slugify(text, max = 80) {
	const slug = String(text)
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/&/g, ' dan ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	if (slug.length <= max) return slug;
	return slug.slice(0, max).replace(/-[^-]*$/, '') || slug.slice(0, max);
}

/**
 * Tambahkan akhiran -2, -3, ... bila slug sudah dipakai.
 * @param {string} base
 * @param {(slug: string) => boolean} taken
 */
export function uniqueSlug(base, taken) {
	const root = base || 'perusahaan';
	if (!taken(root)) return root;
	for (let i = 2; ; i++) {
		const candidate = `${root}-${i}`;
		if (!taken(candidate)) return candidate;
	}
}

/**
 * Kunci pembanding nama: tanpa badan usaha & tanda baca.
 * "PT. Magau Jaya Digital" -> "magau jaya digital"
 * @param {string | null | undefined} nama
 */
export function namaKey(nama) {
	return String(nama || '')
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/\b(pt|cv|ud|tbk|persero|perseroan terbatas|koperasi|yayasan)\b\.?/g, ' ')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.replace(/\s+/g, ' ');
}

const ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/**
 * Id pendek acak, mis. "c_7k2m9q4x".
 * @param {string} prefix
 * @param {number} [length]
 */
export function randomId(prefix, length = 8) {
	const bytes = crypto.getRandomValues(new Uint8Array(length));
	let out = '';
	for (const b of bytes) out += ID_ALPHABET[b % ID_ALPHABET.length];
	return `${prefix}_${out}`;
}
