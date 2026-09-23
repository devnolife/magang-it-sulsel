import { resolve } from '$app/paths';
import { parseFilters } from '$lib/server/companies.js';
import { getDb } from '$lib/server/db/index.js';
import { barisCsv, KOLOM_CSV } from '$lib/server/ekspor.js';
import { toCsv } from '$lib/shared/csv.js';

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
	const filters = parseFilters(url.searchParams);
	const rows = barisCsv(getDb(), filters, {
		urlDetail: (slug) => new URL(resolve('/perusahaan/[slug]', { slug }), url).href
	});
	const tanggal = new Date().toISOString().slice(0, 10);
	return new Response(toCsv(rows, KOLOM_CSV), {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="magang-it-sulsel-${tanggal}.csv"`,
			'cache-control': 'no-store',
			'x-robots-tag': 'noindex'
		}
	});
}
