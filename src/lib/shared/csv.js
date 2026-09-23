/**
 * @param {unknown} value
 */
function cell(value) {
	if (value === null || value === undefined) return '';
	if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
	let s = Array.isArray(value) ? value.join('; ') : String(value);
	// Cegah formula injection saat dibuka di Excel/Sheets.
	if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
	return /[",\n\r;]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * CSV UTF-8 dengan BOM supaya Excel membaca karakter Indonesia dengan benar.
 * @template {Record<string, unknown>} T
 * @param {T[]} rows
 * @param {{ key: keyof T & string, label: string }[]} columns
 */
export function toCsv(rows, columns) {
	const header = columns.map((c) => cell(c.label)).join(',');
	const body = rows.map((row) => columns.map((c) => cell(row[c.key])).join(','));
	return '\ufeff' + [header, ...body].join('\r\n') + '\r\n';
}
