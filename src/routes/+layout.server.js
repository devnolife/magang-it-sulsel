import { getStats } from '$lib/server/companies.js';
import { getDb } from '$lib/server/db/index.js';

export function load() {
	return { stats: getStats(getDb()) };
}
