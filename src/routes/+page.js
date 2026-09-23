import { bacaJumlahTampil } from '$lib/filter-url.js';

/** @type {import('./$types').PageLoad} */
export function load({ data, url }) {
	return { ...data, n: bacaJumlahTampil(url.searchParams.get('n')) };
}
