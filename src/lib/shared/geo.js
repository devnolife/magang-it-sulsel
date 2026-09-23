/**
 * Jarak garis lurus dalam km.
 * @param {{ lat: number, lng: number }} a
 * @param {{ lat: number, lng: number }} b
 */
export function haversineKm(a, b) {
	const R = 6371;
	const toRad = (/** @type {number} */ d) => (d * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * @param {number} km
 */
export function formatJarak(km) {
	if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
	if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
	return `${Math.round(km)} km`;
}

/**
 * Ray casting untuk satu ring [[lng, lat], ...].
 * @param {number} lng
 * @param {number} lat
 * @param {number[][]} ring
 */
function inRing(lng, lat, ring) {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

/**
 * @param {number} lng
 * @param {number} lat
 * @param {number[][][]} polygon ring luar + lubang
 */
function inPolygon(lng, lat, polygon) {
	if (!polygon.length || !inRing(lng, lat, polygon[0])) return false;
	for (let h = 1; h < polygon.length; h++) if (inRing(lng, lat, polygon[h])) return false;
	return true;
}

/**
 * @typedef {{ type: 'Polygon', coordinates: number[][][] } | { type: 'MultiPolygon', coordinates: number[][][][] }} AreaGeometry
 */

/**
 * @param {number} lat
 * @param {number} lng
 * @param {AreaGeometry} geometry
 */
export function pointInGeometry(lat, lng, geometry) {
	if (geometry.type === 'Polygon') return inPolygon(lng, lat, geometry.coordinates);
	return geometry.coordinates.some((poly) => inPolygon(lng, lat, poly));
}

/**
 * @param {number} lat
 * @param {number} lng
 * @param {{ features: { properties: { slug: string }, geometry: AreaGeometry }[] }} collection
 * @returns {string | null}
 */
export function findArea(lat, lng, collection) {
	for (const f of collection.features) {
		if (pointInGeometry(lat, lng, f.geometry)) return f.properties.slug;
	}
	return null;
}

/**
 * @param {number} lat
 * @param {number} lng
 * @param {readonly [number, number, number, number]} bbox [minLat, minLng, maxLat, maxLng]
 */
export function inBbox(lat, lng, bbox) {
	return lat >= bbox[0] && lat <= bbox[2] && lng >= bbox[1] && lng <= bbox[3];
}
