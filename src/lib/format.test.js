import { describe, expect, it } from 'vitest';
import { formatAngka, formatRating, formatTanggal } from './format.js';

describe('format', () => {
	it('tanggal dalam WITA', () => {
		expect(formatTanggal('2026-09-23')).toBe('23 September 2026');
		// 20:00 UTC = 04:00 WITA keesokan harinya
		expect(formatTanggal('2026-09-23T20:00:00.000Z')).toBe('24 September 2026');
		expect(formatTanggal('2026-09-23', { pendek: true })).toBe('23 Sep 2026');
		expect(formatTanggal('bukan tanggal')).toBe('');
		expect(formatTanggal(null)).toBe('');
	});

	it('angka & rating gaya Indonesia', () => {
		expect(formatAngka(1234)).toBe('1.234');
		expect(formatRating(4)).toBe('4,0');
		expect(formatRating(4.86)).toBe('4,9');
	});
});
