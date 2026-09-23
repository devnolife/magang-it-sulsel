import { resolve } from '$app/paths';

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
	// akar situs (mendukung paths.base), mis. "/"
	const akar = new URL(resolve('/'), url).pathname;
	const body = [
		'User-agent: *',
		`Disallow: ${akar}data.csv`,
		'',
		`Sitemap: ${new URL(resolve('/sitemap.xml'), url).href}`,
		''
	].join('\n');
	return new Response(body, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=86400'
		}
	});
}
