import { describe, expect, it } from 'vitest';
import { diizinkan, kebijakanRobots, parseRobots } from './robots.js';

const ROBOTS = `
# contoh
User-agent: *
Disallow: /admin
Disallow: /*.pdf$
Allow: /admin/publik

User-agent: magang-it-sulsel
User-agent: botlain
Disallow: /karir/rahasia
Crawl-delay: 5

User-agent: SemrushBot
Disallow: /
`;

describe('robots.txt', () => {
	const grup = parseRobots(ROBOTS);

	it('mengelompokkan user-agent berurutan dalam satu grup', () => {
		expect(grup.map((g) => g.agents)).toEqual([
			['*'],
			['magang-it-sulsel', 'botlain'],
			['semrushbot']
		]);
	});

	it('grup khusus agent menggantikan grup *', () => {
		expect(diizinkan(grup, 'magang-it-sulsel', '/admin')).toBe(true);
		expect(diizinkan(grup, 'magang-it-sulsel', '/karir/rahasia/1')).toBe(false);
		expect(diizinkan(grup, 'Magang-IT-Sulsel', '/karir')).toBe(true);
	});

	it('pola terpanjang menang, wildcard & akhiran $', () => {
		expect(diizinkan(grup, 'bot-x', '/admin/login')).toBe(false);
		expect(diizinkan(grup, 'bot-x', '/admin/publik/info')).toBe(true);
		expect(diizinkan(grup, 'bot-x', '/file/profil.pdf')).toBe(false);
		expect(diizinkan(grup, 'bot-x', '/file/profil.pdf?v=2')).toBe(true);
		expect(diizinkan(grup, 'semrushbot', '/robots.txt')).toBe(true);
	});

	it('kebijakan dari status HTTP', () => {
		const ok = kebijakanRobots({ status: 200, text: 'User-agent: *\nDisallow: /karir' }, 'x');
		expect(ok('https://a.id/karir?id=1')).toBe(false);
		expect(ok('https://a.id/')).toBe(true);
		expect(kebijakanRobots({ status: 404, text: '' }, 'x')('https://a.id/karir')).toBe(true);
		const gagal = kebijakanRobots(null, 'x');
		expect([gagal('https://a.id/'), gagal('https://a.id/karir')]).toEqual([true, false]);
	});
});
