// fetch dengan timeout, batas ukuran, dan User-Agent yang jujur.
export const USER_AGENT =
	'magang-it-sulsel/0.1 (+https://github.com/devnolife/magang-it-sulsel; direktori magang mahasiswa)';

export const OVERPASS_URLS = (
	process.env.OVERPASS_URL ||
	'https://overpass-api.de/api/interpreter,https://maps.mail.ru/osm/tools/overpass/api/interpreter'
)
	.split(',')
	.map((s) => s.trim())
	.filter(Boolean);

/**
 * @typedef {{ ok: boolean, status: number, url: string, contentType: string, text: string, truncated: boolean }} FetchResult
 */

/**
 * @param {string} url
 * @param {{ timeoutMs?: number, maxBytes?: number, headers?: Record<string, string>, method?: string, body?: string }} [opts]
 * @returns {Promise<FetchResult>}
 */
export async function fetchText(url, opts = {}) {
	const { timeoutMs = 15000, maxBytes = 1_500_000, headers = {}, method = 'GET', body } = opts;
	const res = await fetch(url, {
		method,
		body,
		redirect: 'follow',
		signal: AbortSignal.timeout(timeoutMs),
		headers: {
			'user-agent': USER_AGENT,
			'accept-language': 'id-ID,id;q=0.9,en;q=0.6',
			...headers
		}
	});
	const contentType = res.headers.get('content-type') || '';
	let truncated = false;
	/** @type {Uint8Array[]} */
	const chunks = [];
	let size = 0;
	if (res.body) {
		const reader = res.body.getReader();
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > maxBytes) {
				truncated = true;
				await reader.cancel().catch(() => {});
				break;
			}
			chunks.push(value);
		}
	}
	const buf = Buffer.concat(chunks);
	const charset = /charset=([\w-]+)/i.exec(contentType)?.[1]?.toLowerCase();
	let text;
	try {
		text = new TextDecoder(charset && charset !== 'utf8' ? charset : 'utf-8').decode(buf);
	} catch {
		text = buf.toString('utf8');
	}
	return { ok: res.ok, status: res.status, url: res.url || url, contentType, text, truncated };
}

/**
 * Jalankan query Overpass QL; coba mirror berikutnya bila gagal.
 * @param {string} query
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<any>}
 */
export async function overpass(query, opts = {}) {
	/** @type {unknown} */
	let lastError;
	for (const endpoint of OVERPASS_URLS) {
		try {
			const res = await fetchText(endpoint, {
				method: 'POST',
				body: new URLSearchParams({ data: query }).toString(),
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				timeoutMs: opts.timeoutMs ?? 240_000,
				maxBytes: 200_000_000
			});
			if (!res.ok)
				throw new Error(`Overpass ${endpoint} -> HTTP ${res.status}: ${res.text.slice(0, 200)}`);
			return JSON.parse(res.text);
		} catch (err) {
			lastError = err;
			console.warn(`  ! ${endpoint} gagal: ${err instanceof Error ? err.message : err}`);
		}
	}
	throw lastError;
}
