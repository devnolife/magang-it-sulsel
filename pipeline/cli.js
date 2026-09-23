#!/usr/bin/env node
// Pipeline data magang-it-sulsel. Jalankan: npm run pipeline -- <tahap> [opsi]
import { parseArgs } from 'node:util';

const HELP = `Pemakaian: npm run pipeline -- <tahap> [opsi]

Tahap:
  geo        unduh batas kab/kota & kecamatan dari OSM -> pipeline/config/*.geojson
  seed       baca pipeline/seed/*.json (kurasi, instansi, lowongan)
  maps       scraping hasil pencarian Google Maps (Chrome CDP :9335)
  osm        ambil tempat berunsur IT dari OpenStreetMap (Overpass)
  merge      gabung + dedupe semua sumber, tentukan kab/kota (cache/merged.json)
  detail     buka halaman tempat Maps untuk kandidat yang kontaknya belum lengkap
  enrich     cek website: status, email, WA, IG, LinkedIn, halaman karir, kata kunci magang
  classify   aturan skor + AI (copilot-text-shim) untuk kasus ragu + overrides.json
  export     validasi & tulis data/companies.json + data/laporan-pipeline.md
  all        seed -> maps -> osm -> merge -> detail -> merge -> enrich -> classify -> export

Opsi:
  --kab <slug>     batasi wilayah (boleh diulang), mis. --kab makassar
  --limit <n>      batas jumlah pencarian/halaman per run (maps, detail, enrich)
  --fresh          abaikan cache tahap ini
  --no-ai          lewati klasifikasi AI (kasus ragu masuk daftar review)
`;

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		kab: { type: 'string', multiple: true },
		limit: { type: 'string' },
		fresh: { type: 'boolean', default: false },
		'no-ai': { type: 'boolean', default: false },
		help: { type: 'boolean', short: 'h', default: false }
	}
});

const stage = positionals[0];
if (!stage || values.help) {
	console.log(HELP);
	process.exit(stage ? 0 : 1);
}

const limit = values.limit ? Number.parseInt(values.limit, 10) : Infinity;
const common = { kab: values.kab, limit, fresh: values.fresh };

/** @type {Record<string, () => Promise<unknown>>} */
const stages = {
	geo: async () => (await import('./steps/geo.js')).runGeo(),
	seed: async () => (await import('./sources/seed.js')).runSeed(),
	maps: async () => (await import('./sources/maps.js')).runMaps(common),
	osm: async () => (await import('./sources/osm.js')).runOsm(common),
	merge: async () => (await import('./steps/merge.js')).runMerge(),
	detail: async () => (await import('./steps/detail.js')).runDetail(common),
	enrich: async () => (await import('./steps/enrich.js')).runEnrich(common),
	classify: async () =>
		(await import('./steps/classify.js')).runClassify({
			ai: !values['no-ai'],
			fresh: values.fresh
		}),
	export: async () => (await import('./steps/export.js')).runExport(),
	all: async () => {
		for (const s of [
			'seed',
			'maps',
			'osm',
			'merge',
			'detail',
			'merge',
			'enrich',
			'classify',
			'export'
		]) {
			console.log(`\n=== ${s} ===`);
			await stages[s]();
		}
	}
};

if (!stages[stage]) {
	console.error(`Tahap tidak dikenal: ${stage}\n\n${HELP}`);
	process.exit(1);
}

try {
	await stages[stage]();
} catch (err) {
	if (err instanceof Error && err.name === 'BlockedError') {
		console.error(`\n✗ ${err.message}`);
		process.exit(2);
	}
	console.error(err);
	process.exit(1);
}
