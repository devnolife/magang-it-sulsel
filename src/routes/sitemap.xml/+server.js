import { resolve } from '$app/paths';
import { queryFilter } from '$lib/filter-url.js';
import { getStats, listCompanies, listSlugs, parseFilters } from '$lib/server/companies.js';
import { getDb } from '$lib/server/db/index.js';
import { KABKOTA } from '$lib/shared/wilayah.js';

/** @param {string} s */
const xml = (s) => s.replace(/[<>&'"]/g, (ch) => `&#${ch.charCodeAt(0)};`);

// URL absolut dibangun dari url.origin (adapter-node mengambilnya dari ORIGIN).
/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
	const db = getDb();
	const abs = (/** @type {string} */ path) => new URL(path, url).href;
	const tglData = getStats(db).lastImport?.slice(0, 10) ?? null;
	const { facets } = listCompanies(db, parseFilters(new URLSearchParams()));

	/** @type {{ loc: string, lastmod: string | null }[]} */
	const entri = [
		{ loc: abs(resolve('/')), lastmod: tglData },
		// halaman per kab/kota punya judul sendiri ("Tempat magang IT di Gowa")
		...KABKOTA.filter((k) => facets.kab[k.slug]).map((k) => ({
			loc: abs(resolve(`/?${queryFilter({ kab: [k.slug] })}`)),
			lastmod: tglData
		})),
		{ loc: abs(resolve('/tentang')), lastmod: null },
		{ loc: abs(resolve('/usulkan')), lastmod: null },
		...listSlugs(db).map((s) => ({
			loc: abs(resolve('/perusahaan/[slug]', { slug: s.slug })),
			lastmod: s.updated_at.slice(0, 10)
		}))
	];

	const isi = entri
		.map(
			(e) =>
				`\t<url><loc>${xml(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`
		)
		.join('\n');
	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${isi}\n</urlset>\n`,
		{
			headers: {
				'content-type': 'application/xml; charset=utf-8',
				'cache-control': 'public, max-age=3600'
			}
		}
	);
}
