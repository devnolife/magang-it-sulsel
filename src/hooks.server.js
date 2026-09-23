// Header keamanan untuk semua respons halaman & endpoint. CSP diatur lewat kit.csp di vite.config.js.
// Berkas statis (/_app, favicon) dilayani adapter-node sebelum hook ini; header-nya diatur di proxy.

/** @type {Record<string, string>} */
const HEADER = {
	'x-content-type-options': 'nosniff',
	// Server tile OSM mewajibkan Referer; nilai ini hanya mengirim origin ke situs lain.
	'referrer-policy': 'strict-origin-when-cross-origin',
	'permissions-policy': 'geolocation=(self), camera=(), microphone=(), payment=(), usb=()',
	'cross-origin-opener-policy': 'same-origin'
};

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const response = await resolve(event);
	for (const [k, v] of Object.entries(HEADER)) {
		try {
			if (!response.headers.has(k)) response.headers.set(k, v);
		} catch {
			// header immutable (mis. Response.redirect dari endpoint): biarkan apa adanya
		}
	}
	return response;
}
