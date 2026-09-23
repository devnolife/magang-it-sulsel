// Klien copilot-text-shim: API OpenAI-compatible di loopback yang memakai langganan Copilot
// (WraftWork/copilot-text-shim, `npm start`). Dipakai tahap classify untuk kasus ragu.

const baseUrl = () => (process.env.SHIM_URL || 'http://127.0.0.1:8787/v1').replace(/\/+$/, '');

/** /healthz ada di akar server (bukan di bawah /v1) dan tidak butuh token. */
export async function shimHidup() {
	try {
		const res = await fetch(`${new URL(baseUrl()).origin}/healthz`, {
			signal: AbortSignal.timeout(3000)
		});
		return res.ok;
	} catch {
		return false;
	}
}

/**
 * @param {{ role: 'system' | 'user', content: string }[]} messages
 * @param {{ json?: boolean, timeoutMs?: number }} [opts]
 * @returns {Promise<string>} isi jawaban asisten
 */
export async function shimChat(messages, opts = {}) {
	const res = await fetch(`${baseUrl()}/chat/completions`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${process.env.SHIM_TOKEN || 'copilot-local'}`
		},
		body: JSON.stringify({
			model: process.env.SHIM_MODEL || 'copilot',
			messages,
			...(opts.json ? { response_format: { type: 'json_object' } } : {})
		}),
		signal: AbortSignal.timeout(opts.timeoutMs ?? 180_000)
	});
	const body = await res.json().catch(() => null);
	if (!res.ok) throw new Error(`shim HTTP ${res.status}: ${body?.error?.message ?? ''}`.trim());
	const content = body?.choices?.[0]?.message?.content;
	if (typeof content !== 'string' || !content.trim()) throw new Error('shim: jawaban kosong');
	return content;
}

/**
 * JSON dari jawaban model (kadang dibungkus ```json atau diberi kalimat pembuka).
 * @param {string} teks
 * @returns {unknown}
 */
export function parseJsonLonggar(teks) {
	const bersih = teks
		.replace(/^\s*```(?:json)?\s*/i, '')
		.replace(/\s*```\s*$/, '')
		.trim();
	try {
		return JSON.parse(bersih);
	} catch {
		const a = bersih.indexOf('{');
		const b = bersih.lastIndexOf('}');
		if (a >= 0 && b > a) return JSON.parse(bersih.slice(a, b + 1));
		throw new Error(`jawaban bukan JSON: ${bersih.slice(0, 120)}`);
	}
}
