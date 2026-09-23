// Rakit geometri relasi OSM (keluaran Overpass `out geom`) menjadi GeoJSON, lalu sederhanakan.
import { pointInGeometry } from '../../src/lib/shared/geo.js';

/** @typedef {[number, number]} LngLat */
/** @typedef {LngLat[]} Ring */
/** @typedef {{ type: 'Polygon', coordinates: Ring[] } | { type: 'MultiPolygon', coordinates: Ring[][] }} Geometry */

/** @param {LngLat} a @param {LngLat} b */
const same = (a, b) => a[0] === b[0] && a[1] === b[1];

/**
 * Sambung potongan way menjadi ring tertutup (ujung yang bertemu memakai node yang sama).
 * @param {Ring[]} ways
 * @returns {Ring[]}
 */
export function stitchRings(ways) {
	const pool = ways.filter((w) => w.length >= 2).map((w) => w.slice());
	/** @type {Ring[]} */
	const rings = [];
	while (pool.length) {
		let ring = /** @type {Ring} */ (pool.shift());
		while (!same(ring[0], ring[ring.length - 1])) {
			const end = ring[ring.length - 1];
			let found = -1;
			let reverse = false;
			for (let i = 0; i < pool.length; i++) {
				if (same(pool[i][0], end)) {
					found = i;
					break;
				}
				if (same(pool[i][pool[i].length - 1], end)) {
					found = i;
					reverse = true;
					break;
				}
			}
			if (found < 0) break;
			const next = pool.splice(found, 1)[0];
			if (reverse) next.reverse();
			ring = ring.concat(next.slice(1));
		}
		if (!same(ring[0], ring[ring.length - 1])) ring.push(ring[0]); // data bolong: paksa tutup
		if (ring.length >= 4) rings.push(ring);
	}
	return rings;
}

/**
 * @param {LngLat} pt
 * @param {Ring} ring
 */
function inRing(pt, ring) {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) {
			inside = !inside;
		}
	}
	return inside;
}

/**
 * @param {{ members?: { type: string, role?: string, geometry?: ({ lat: number, lon: number } | null)[] }[] }} rel
 * @returns {Geometry | null}
 */
export function relationToGeometry(rel) {
	/** @type {Ring[]} */
	const outer = [];
	/** @type {Ring[]} */
	const inner = [];
	for (const m of rel.members || []) {
		if (m.type !== 'way' || !m.geometry?.length) continue;
		/** @type {Ring} */
		const coords = [];
		for (const p of m.geometry) if (p) coords.push([p.lon, p.lat]);
		(m.role === 'inner' ? inner : outer).push(coords);
	}
	const polys = stitchRings(outer).map((r) => [r]);
	for (const hole of stitchRings(inner)) {
		const host = polys.find((p) => inRing(hole[0], p[0]));
		if (host) host.push(hole);
	}
	if (!polys.length) return null;
	return polys.length === 1
		? { type: 'Polygon', coordinates: polys[0] }
		: { type: 'MultiPolygon', coordinates: polys };
}

/**
 * Douglas-Peucker untuk satu ring; ring yang runtuh (<4 titik) dikembalikan utuh.
 * @param {Ring} ring
 * @param {number} tol toleransi dalam derajat
 * @returns {Ring}
 */
export function simplifyRing(ring, tol) {
	if (ring.length <= 5) return ring;
	const keep = new Uint8Array(ring.length);
	keep[0] = 1;
	keep[ring.length - 1] = 1;
	/** @type {[number, number][]} */
	const stack = [[0, ring.length - 1]];
	// Ring tertutup: titik awal = titik akhir, jadi pecah di titik terjauh dulu.
	let far = 0;
	let farD = -1;
	for (let i = 1; i < ring.length - 1; i++) {
		const d = (ring[i][0] - ring[0][0]) ** 2 + (ring[i][1] - ring[0][1]) ** 2;
		if (d > farD) {
			farD = d;
			far = i;
		}
	}
	keep[far] = 1;
	stack.length = 0;
	stack.push([0, far], [far, ring.length - 1]);
	while (stack.length) {
		const [s, e] = /** @type {[number, number]} */ (stack.pop());
		let idx = -1;
		let max = tol;
		for (let i = s + 1; i < e; i++) {
			const d = segDist(ring[i], ring[s], ring[e]);
			if (d > max) {
				max = d;
				idx = i;
			}
		}
		if (idx >= 0) {
			keep[idx] = 1;
			stack.push([s, idx], [idx, e]);
		}
	}
	/** @type {Ring} */
	const out = [];
	for (let i = 0; i < ring.length; i++) {
		if (keep[i]) out.push([round(ring[i][0]), round(ring[i][1])]);
	}
	return out.length >= 4 ? out : ring.map(([x, y]) => [round(x), round(y)]);
}

/** @param {number} n */
const round = (n) => Math.round(n * 1e5) / 1e5;

/** @param {LngLat} p @param {LngLat} a @param {LngLat} b */
function segDist(p, a, b) {
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	const len = dx * dx + dy * dy;
	let t = len ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len : 0;
	t = Math.max(0, Math.min(1, t));
	const x = a[0] + t * dx - p[0];
	const y = a[1] + t * dy - p[1];
	return Math.sqrt(x * x + y * y);
}

/**
 * @param {Geometry} g
 * @param {number} tol
 * @returns {Geometry}
 */
export function simplifyGeometry(g, tol) {
	if (g.type === 'Polygon') {
		return { type: 'Polygon', coordinates: g.coordinates.map((r) => simplifyRing(r, tol)) };
	}
	return {
		type: 'MultiPolygon',
		coordinates: g.coordinates.map((p) => p.map((r) => simplifyRing(r, tol)))
	};
}

/**
 * Titik yang pasti di dalam poligon terbesar (untuk pusat pencarian & penentuan induk wilayah).
 * @param {Geometry} g
 * @returns {[number, number]} [lat, lng]
 */
export function interiorPoint(g) {
	const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
	let best = polys[0];
	let bestArea = -1;
	for (const p of polys) {
		const a = Math.abs(ringArea(p[0]));
		if (a > bestArea) {
			bestArea = a;
			best = p;
		}
	}
	const ring = best[0];
	let cx = 0;
	let cy = 0;
	for (const [x, y] of ring) {
		cx += x;
		cy += y;
	}
	cx /= ring.length;
	cy /= ring.length;
	const geom = { type: 'Polygon', coordinates: best };
	if (pointInGeometry(cy, cx, geom)) return [cy, cx];
	// Garis horizontal lewat cy: ambil tengah potongan terlebar yang berada di dalam.
	/** @type {number[]} */
	const xs = [];
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		if (yi > cy !== yj > cy) xs.push(((xj - xi) * (cy - yi)) / (yj - yi) + xi);
	}
	xs.sort((a, b) => a - b);
	let mid = ring[0][0];
	let width = -1;
	for (let i = 0; i + 1 < xs.length; i += 2) {
		if (xs[i + 1] - xs[i] > width) {
			width = xs[i + 1] - xs[i];
			mid = (xs[i] + xs[i + 1]) / 2;
		}
	}
	return [cy, mid];
}

/** @param {Ring} ring */
function ringArea(ring) {
	let a = 0;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
	}
	return a / 2;
}
