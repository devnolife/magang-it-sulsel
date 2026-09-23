import { error } from '@sveltejs/kit';
import { getCompanyBySlug, untukPublik } from '$lib/server/companies.js';
import { getDb } from '$lib/server/db/index.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
	const c = getCompanyBySlug(getDb(), params.slug);
	if (!c) {
		error(404, 'Tempat ini tidak ada di direktori, atau datanya sudah disembunyikan.');
	}
	return { c: untukPublik(c) };
}
