import { describe, expect, it } from 'vitest';
import { normalizeOsm, OSM_QUERY } from './osm.js';

describe('normalizeOsm', () => {
	it('mengubah node & way (center) ke Tempat, membuang tanpa nama/di luar Sulsel', () => {
		const places = normalizeOsm([
			{
				type: 'node',
				id: 11,
				lat: -5.14,
				lon: 119.42,
				tags: {
					name: 'PT Contoh Teknologi',
					office: 'it',
					phone: '0411 123456',
					website: 'https://contoh.id',
					'addr:street': 'Jalan Contoh',
					'addr:housenumber': '5',
					'addr:city': 'Makassar'
				}
			},
			{
				type: 'way',
				id: 22,
				center: { lat: -5.2, lon: 119.45 },
				tags: { name: 'Ruang Kerja Contoh', amenity: 'coworking_space' }
			},
			{ type: 'node', id: 33, lat: -5.1, lon: 119.4, tags: { office: 'it' } },
			{ type: 'node', id: 44, lat: -6.2, lon: 106.8, tags: { name: 'Di Jakarta', office: 'it' } }
		]);
		expect(places).toHaveLength(2);
		expect(places[0]).toMatchObject({
			sumber: 'osm',
			key: 'osm:node/11',
			nama: 'PT Contoh Teknologi',
			kategori: 'Kantor IT',
			alamat: 'Jalan Contoh No. 5, Makassar',
			telepon: '0411 123456',
			website: 'https://contoh.id',
			osm_url: 'https://www.openstreetmap.org/node/11',
			tags_osm: { office: 'it' }
		});
		expect(places[1]).toMatchObject({
			key: 'osm:way/22',
			kategori: 'Ruang Kerja Bersama',
			lat: -5.2,
			lng: 119.45
		});
	});

	it('query Overpass memuat regex nama yang ter-escape benar', () => {
		expect(OSM_QUERY).toContain('\\\\bBPS\\\\b');
		expect(OSM_QUERY).toContain('\\\\bIT\\\\b');
	});
});
