import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} file
 * @returns {any}
 */
export function readJson(file) {
	return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * @param {string} file
 * @param {any} [fallback]
 */
export function readJsonIfExists(file, fallback = null) {
	try {
		return readJson(file);
	} catch (err) {
		if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') return fallback;
		throw err;
	}
}

/**
 * Tulis JSON lewat file sementara lalu rename, supaya cache tidak setengah jadi bila proses mati.
 * @param {string} file
 * @param {unknown} data
 * @param {{ pretty?: boolean }} [opts]
 */
export function writeJsonAtomic(file, data, opts = {}) {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	const tmp = `${file}.${process.pid}.tmp`;
	fs.writeFileSync(
		tmp,
		JSON.stringify(data, null, opts.pretty === false ? undefined : '\t') + '\n'
	);
	fs.renameSync(tmp, file);
}
