// robots.txt (RFC 9309): grup per user-agent, aturan allow/disallow dengan `*` dan `$`,
// pola terpanjang menang, seri dimenangkan allow. Murni, tanpa jaringan.

/**
 * @typedef {{ allow: boolean, pola: string, re: RegExp }} Aturan
 * @typedef {{ agents: string[], aturan: Aturan[] }} Grup
 */

/** @param {string} pola */
function polaKeRegex(pola) {
	const akhir = pola.endsWith('$');
	const inti = (akhir ? pola.slice(0, -1) : pola)
		.split('*')
		.map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
		.join('.*');
	return new RegExp(`^${inti}${akhir ? '$' : ''}`);
}

/**
 * @param {string} teks
 * @returns {Grup[]}
 */
export function parseRobots(teks) {
	/** @type {Grup[]} */
	const grup = [];
	/** @type {Grup | null} */
	let cur = null;
	let barisAgent = false;
	for (const raw of teks.split(/\r?\n/)) {
		const line = raw.replace(/#.*$/, '').trim();
		const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
		if (!m) continue;
		const field = m[1].toLowerCase();
		const value = m[2].trim();
		if (field === 'user-agent') {
			if (!cur || !barisAgent) {
				cur = { agents: [], aturan: [] };
				grup.push(cur);
			}
			cur.agents.push(value.toLowerCase());
			barisAgent = true;
		} else if (field === 'allow' || field === 'disallow') {
			barisAgent = false;
			if (!cur || !value) continue; // "Disallow:" kosong = tidak melarang apa pun
			cur.aturan.push({ allow: field === 'allow', pola: value, re: polaKeRegex(value) });
		}
	}
	return grup;
}

/**
 * @param {Grup[]} grup
 * @param {string} agent token produk, mis. "magang-it-sulsel"
 * @param {string} pathQuery path + query dari URL
 */
export function diizinkan(grup, agent, pathQuery) {
	if (pathQuery === '/robots.txt') return true;
	const token = agent.toLowerCase();
	let cocok = grup.filter((g) => g.agents.includes(token));
	if (!cocok.length) cocok = grup.filter((g) => g.agents.includes('*'));
	/** @type {Aturan | null} */
	let menang = null;
	for (const a of cocok.flatMap((g) => g.aturan)) {
		if (!a.re.test(pathQuery)) continue;
		if (
			!menang ||
			a.pola.length > menang.pola.length ||
			(a.pola.length === menang.pola.length && a.allow)
		) {
			menang = a;
		}
	}
	return menang ? menang.allow : true;
}

/**
 * Kebijakan dari hasil fetch robots.txt. 4xx = boleh semua. 5xx/gagal jaringan = hanya beranda
 * (dibutuhkan untuk cek status website), halaman lain tidak diambil.
 * @param {{ status: number, text: string } | null} res
 * @param {string} agent
 * @returns {(url: string) => boolean}
 */
export function kebijakanRobots(res, agent) {
	if (res && res.status >= 200 && res.status < 300) {
		const grup = parseRobots(res.text);
		return (url) => {
			const u = new URL(url);
			return diizinkan(grup, agent, `${u.pathname}${u.search}`);
		};
	}
	if (res && res.status >= 400 && res.status < 500) return () => true;
	return (url) => new URL(url).pathname === '/';
}
