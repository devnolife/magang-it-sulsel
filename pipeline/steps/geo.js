// Tahap `geo`: unduh batas kab/kota (admin_level=5) & kecamatan (admin_level=6) Sulsel dari OSM,
// sederhanakan, lalu tulis pipeline/config/{kabkota,kecamatan}.geojson (di-commit).
import fs from 'node:fs';
import path from 'node:path';
import { findArea } from '../../src/lib/shared/geo.js';
import { slugify } from '../../src/lib/shared/slug.js';
import { KABKOTA, kabkotaFromText } from '../../src/lib/shared/wilayah.js';
import { overpass } from '../lib/http.js';
import { interiorPoint, relationToGeometry, simplifyGeometry } from '../lib/osm-geom.js';
import { CONFIG_DIR } from '../lib/paths.js';

const QUERY = `[out:json][timeout:300];
area["ISO3166-2"="ID-SN"]["admin_level"="4"]->.a;
relation["boundary"="administrative"]["admin_level"~"^(5|6)$"](area.a);
out geom;`;

export async function runGeo() {
	console.log('• Overpass: batas administratif Sulsel (bisa 1-3 menit)…');
	const data = await overpass(QUERY, { timeoutMs: 330_000 });
	/** @type {any[]} */
	const rels = data.elements.filter((/** @type {any} */ e) => e.type === 'relation');

	const kabFeatures = [];
	for (const rel of rels.filter((r) => r.tags.admin_level === '5')) {
		const slug = kabkotaFromText(rel.tags.name);
		const geom = relationToGeometry(rel);
		if (!slug || !geom) {
			console.warn(`  ! lewati relasi ${rel.id} (${rel.tags.name})`);
			continue;
		}
		const k = /** @type {import('../../src/lib/shared/wilayah.js').KabKota} */ (
			KABKOTA.find((x) => x.slug === slug)
		);
		const g = simplifyGeometry(geom, 0.0004);
		kabFeatures.push({
			type: 'Feature',
			properties: { slug, nama: k.nama, osm: `relation/${rel.id}`, pusat: interiorPoint(g) },
			geometry: g
		});
	}
	const missing = KABKOTA.filter((k) => !kabFeatures.some((f) => f.properties.slug === k.slug));
	if (missing.length) {
		throw new Error(
			`Batas kab/kota tidak lengkap, hilang: ${missing.map((k) => k.slug).join(', ')}`
		);
	}
	kabFeatures.sort((a, b) => a.properties.slug.localeCompare(b.properties.slug));
	const kabFc = { type: 'FeatureCollection', features: kabFeatures };

	const kecFeatures = [];
	for (const rel of rels.filter((r) => r.tags.admin_level === '6')) {
		const geom = relationToGeometry(rel);
		if (!geom) continue;
		const g = simplifyGeometry(geom, 0.0002);
		const [lat, lng] = interiorPoint(g);
		const kabkota = findArea(lat, lng, /** @type {any} */ (kabFc));
		if (!kabkota) continue;
		const nama = String(rel.tags.name).trim();
		kecFeatures.push({
			type: 'Feature',
			properties: {
				slug: `${kabkota}--${slugify(nama)}`,
				nama,
				kabkota,
				osm: `relation/${rel.id}`,
				pusat: [lat, lng]
			},
			geometry: g
		});
	}
	kecFeatures.sort((a, b) => a.properties.slug.localeCompare(b.properties.slug));

	fs.mkdirSync(CONFIG_DIR, { recursive: true });
	write(path.join(CONFIG_DIR, 'kabkota.geojson'), kabFc);
	write(path.join(CONFIG_DIR, 'kecamatan.geojson'), {
		type: 'FeatureCollection',
		features: kecFeatures
	});
	const perKab = kecFeatures.reduce((/** @type {Record<string, number>} */ acc, f) => {
		acc[f.properties.kabkota] = (acc[f.properties.kabkota] || 0) + 1;
		return acc;
	}, {});
	console.log(`✓ ${kabFeatures.length} kab/kota, ${kecFeatures.length} kecamatan`, perKab);
}

/** @param {string} file @param {unknown} obj */
function write(file, obj) {
	// Satu fitur per baris: diff git tetap terbaca, ukuran tetap kecil.
	const fc = /** @type {{ features: unknown[] }} */ (obj);
	const body = fc.features.map((f) => JSON.stringify(f)).join(',\n');
	fs.writeFileSync(file, `{"type":"FeatureCollection","features":[\n${body}\n]}\n`);
	console.log(
		`  → ${path.relative(process.cwd(), file)} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`
	);
}
