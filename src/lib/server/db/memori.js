// Basis data di memori untuk hosting tanpa disk tetap (Vercel). Dibangun sekali per instance dari
// data/companies.json yang ikut ter-bundle. Hanya dimuat lewat import dinamis di index.js, jadi
// build adapter-node tidak pernah memuat datanya.
import mentah from '../../../../data/companies.json?raw';
import { parseDataset } from '../../shared/company-schema.js';
import { importDataset } from './import.js';
import { openDb } from './open.js';

export function bukaDbMemori() {
	const db = openDb(':memory:');
	importDataset(db, parseDataset(JSON.parse(mentah)));
	return db;
}
