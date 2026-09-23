import { listCompanies, parseFilters, toListItem } from '$lib/server/companies.js';
import { getDb } from '$lib/server/db/index.js';

// Sengaja tidak membaca `n`: "Tampilkan lagi" hanya menjalankan ulang +page.js di browser,
// tanpa mengambil ulang seluruh daftar dari server.
/** @type {import('./$types').PageServerLoad} */
export function load({ url }) {
	const filters = parseFilters(url.searchParams);
	const { items, total, facets } = listCompanies(getDb(), filters);
	return { filters, total, facets, items: items.map(toListItem) };
}
