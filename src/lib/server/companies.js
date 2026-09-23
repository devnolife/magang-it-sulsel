// Query baca untuk halaman publik. Semua fungsi menerima `db` supaya mudah diuji.
import { JENIS_KEYS } from '../shared/jenis.js';
import { deriveMagangStatus, MAGANG_STATUS_KEYS } from '../shared/magang-status.js';
import { KABKOTA } from '../shared/wilayah.js';

/**
 * @typedef {import('../shared/jenis.js').Jenis} Jenis
 * @typedef {import('../shared/magang-status.js').StatusMagang} StatusMagang
 * @typedef {{ q: string, kab: string[], jenis: Jenis[], magang: StatusMagang[], lowongan: boolean, urut: 'relevansi' | 'nama' | 'terdekat' }} Filters
 * @typedef {{
 *   id: string, slug: string, nama: string, jenis: Jenis, kabkota: string, kecamatan: string | null,
 *   alamat: string | null, lat: number | null, lng: number | null, telepon: string | null,
 *   whatsapp: string | null, email: string | null, website: string | null, status_web: string,
 *   instagram: string | null, linkedin: string | null, maps_url: string | null, rating: number | null,
 *   jumlah_ulasan: number | null, magang: StatusMagang, lowongan_aktif: number, peringatan: boolean,
 *   origin: 'pipeline' | 'mahasiswa', tags: string[]
 * }} Card
 */

const KAB_SET = new Set(KABKOTA.map((k) => k.slug));
const JENIS_SET = new Set(JENIS_KEYS);
const MAGANG_SET = new Set(MAGANG_STATUS_KEYS);

/**
 * Baca filter dari URLSearchParams; nilai tak dikenal dibuang diam-diam.
 * @param {URLSearchParams} sp
 * @returns {Filters}
 */
export function parseFilters(sp) {
	const list = (/** @type {string} */ key, /** @type {Set<string>} */ allowed) => [
		...new Set(
			sp
				.getAll(key)
				.flatMap((v) => v.split(','))
				.map((v) => v.trim())
				.filter((v) => allowed.has(v))
		)
	];
	const urut = sp.get('urut');
	return {
		q: (sp.get('q') || '').trim().slice(0, 100),
		kab: list('kab', KAB_SET),
		jenis: /** @type {Jenis[]} */ (list('jenis', JENIS_SET)),
		magang: /** @type {StatusMagang[]} */ (list('magang', MAGANG_SET)),
		lowongan: sp.get('lowongan') === '1',
		urut: urut === 'nama' || urut === 'terdekat' ? urut : 'relevansi'
	};
}

/**
 * Query FTS5 aman dari input bebas: setiap kata jadi prefix term, digabung AND.
 * @param {string} q
 * @returns {string | null}
 */
export function toFtsQuery(q) {
	const words = q
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.match(/[\p{L}\p{N}]+/gu);
	if (!words?.length) return null;
	return words
		.slice(0, 8)
		.map((w) => `"${w}"*`)
		.join(' ');
}

const CARD_COLS = `c.id, c.slug, c.nama, c.jenis, c.kabkota, c.kecamatan, c.alamat, c.lat, c.lng,
	c.telepon, c.whatsapp, c.email, c.website, c.status_web, c.instagram, c.linkedin, c.maps_url,
	c.rating, c.jumlah_ulasan, c.peringatan, c.magang_bukti, c.tags, c.origin,
	(SELECT COUNT(*) FROM experiences e WHERE e.company_id = c.id AND e.hidden = 0) AS n_pengalaman,
	(SELECT COUNT(*) FROM openings o WHERE o.company_id = c.id AND o.hidden = 0 AND o.is_magang = 1) AS n_lowongan_magang,
	(SELECT COUNT(*) FROM openings o WHERE o.company_id = c.id AND o.hidden = 0 AND o.kedaluwarsa_pada >= @today) AS n_lowongan_aktif`;

/**
 * @param {any} r baris SQL
 * @returns {Card & { _rank: number }}
 */
function toCard(r) {
	return {
		id: r.id,
		slug: r.slug,
		nama: r.nama,
		jenis: r.jenis,
		kabkota: r.kabkota,
		kecamatan: r.kecamatan,
		alamat: r.alamat,
		lat: r.lat,
		lng: r.lng,
		telepon: r.telepon,
		whatsapp: r.whatsapp,
		email: r.email,
		website: r.status_web === 'aktif' ? r.website : null,
		status_web: r.status_web,
		instagram: r.instagram,
		linkedin: r.linkedin,
		maps_url: r.maps_url,
		rating: r.rating,
		jumlah_ulasan: r.jumlah_ulasan,
		magang: deriveMagangStatus({
			bukti: JSON.parse(r.magang_bukti || '[]'),
			jumlahPengalaman: r.n_pengalaman,
			jumlahLowongan: r.n_lowongan_magang
		}),
		lowongan_aktif: r.n_lowongan_aktif,
		peringatan: !!r.peringatan,
		origin: r.origin,
		tags: JSON.parse(r.tags || '[]'),
		_rank: r.rank ?? 0
	};
}

/**
 * Kartu ringkas untuk daftar & peta di halaman depan. Seluruh hasil dikirim sekaligus
 * (urut terdekat dihitung di klien), jadi field yang hanya dipakai halaman detail dibuang.
 * @param {Card} c
 */
export function toListItem(c) {
	return {
		slug: c.slug,
		nama: c.nama,
		jenis: c.jenis,
		kabkota: c.kabkota,
		kecamatan: c.kecamatan,
		lat: c.lat,
		lng: c.lng,
		telepon: c.telepon,
		whatsapp: c.whatsapp,
		email: c.email,
		website: c.website,
		instagram: c.instagram,
		maps_url: c.maps_url,
		rating: c.rating,
		jumlah_ulasan: c.jumlah_ulasan,
		magang: c.magang,
		lowongan_aktif: c.lowongan_aktif,
		peringatan: c.peringatan,
		origin: c.origin,
		tags: c.tags.slice(0, 3)
	};
}

/** @typedef {ReturnType<typeof toListItem>} ListItem */

const MAGANG_WEIGHT = { terbukti: 4, indikasi: 2, belum: 0 };

/** Skor bawaan tanpa kata kunci: bukti magang > lowongan aktif > kelengkapan kontak > rating. */
function defaultScore(/** @type {Card} */ c) {
	let s = MAGANG_WEIGHT[c.magang];
	if (c.lowongan_aktif) s += 2;
	if (c.website) s += 1;
	if (c.whatsapp || c.telepon) s += 0.5;
	if (c.email) s += 0.5;
	if (c.rating != null && c.jumlah_ulasan) s += (c.rating / 5) * Math.min(1, c.jumlah_ulasan / 20);
	if (c.peringatan) s -= 3;
	return s;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {Filters} f
 * @param {{ today?: string }} [opts]
 */
export function listCompanies(db, f, opts = {}) {
	const today = opts.today || new Date().toISOString().slice(0, 10);
	const fts = f.q ? toFtsQuery(f.q) : null;
	/** @type {any[]} */
	let rows;
	if (fts) {
		try {
			rows = db
				.prepare(
					`SELECT ${CARD_COLS}, bm25(companies_fts, 10.0, 2.0, 4.0, 1.0, 3.0, 2.0, 1.0) AS rank
					 FROM companies_fts JOIN companies c ON c.rowid = companies_fts.rowid
					 WHERE companies_fts MATCH @fts AND c.hidden = 0`
				)
				.all({ fts, today });
		} catch {
			rows = likeSearch(db, f.q, today);
		}
	} else if (f.q) {
		rows = likeSearch(db, f.q, today);
	} else {
		rows = db
			.prepare(`SELECT ${CARD_COLS}, 0 AS rank FROM companies c WHERE c.hidden = 0`)
			.all({ today });
	}
	const cards = rows.map(toCard);

	const kab = new Set(f.kab);
	const jenis = new Set(f.jenis);
	const magang = new Set(f.magang);
	/** @param {Card} c @param {string | null} skip */
	const match = (c, skip) =>
		(skip === 'kab' || !kab.size || kab.has(c.kabkota)) &&
		(skip === 'jenis' || !jenis.size || jenis.has(c.jenis)) &&
		(skip === 'magang' || !magang.size || magang.has(c.magang)) &&
		(skip === 'lowongan' || !f.lowongan || c.lowongan_aktif > 0);

	/** @type {{ kab: Record<string, number>, jenis: Record<string, number>, magang: Record<string, number>, lowongan: number }} */
	const facets = { kab: {}, jenis: {}, magang: {}, lowongan: 0 };
	for (const c of cards) {
		if (match(c, 'kab')) facets.kab[c.kabkota] = (facets.kab[c.kabkota] || 0) + 1;
		if (match(c, 'jenis')) facets.jenis[c.jenis] = (facets.jenis[c.jenis] || 0) + 1;
		if (match(c, 'magang')) facets.magang[c.magang] = (facets.magang[c.magang] || 0) + 1;
		if (match(c, 'lowongan') && c.lowongan_aktif > 0) facets.lowongan++;
	}

	const items = cards.filter((c) => match(c, null));
	const byName = (/** @type {Card} */ a, /** @type {Card} */ b) =>
		a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
	if (f.urut === 'nama') items.sort(byName);
	else if (fts) items.sort((a, b) => a._rank - b._rank || defaultScore(b) - defaultScore(a));
	else items.sort((a, b) => defaultScore(b) - defaultScore(a) || byName(a, b));

	return {
		items: items.map(({ _rank, ...c }) => c),
		total: items.length,
		facets
	};
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} q
 * @param {string} today
 */
function likeSearch(db, q, today) {
	const pattern = `%${q.replace(/[\\%_]/g, (m) => '\\' + m)}%`;
	return db
		.prepare(
			`SELECT ${CARD_COLS}, 0 AS rank FROM companies c
			 WHERE c.hidden = 0 AND (c.nama LIKE @p ESCAPE '\\' OR c.alamat LIKE @p ESCAPE '\\' OR c.tags LIKE @p ESCAPE '\\')`
		)
		.all({ p: pattern, today });
}

/**
 * Data lengkap satu perusahaan untuk halaman detail.
 * @param {import('better-sqlite3').Database} db
 * @param {string} slug
 * @param {{ today?: string, includeHidden?: boolean }} [opts]
 */
export function getCompanyBySlug(db, slug, opts = {}) {
	const today = opts.today || new Date().toISOString().slice(0, 10);
	/** @type {any} */
	const r = db.prepare('SELECT * FROM companies WHERE slug = ?').get(slug);
	if (!r || (r.hidden && !opts.includeHidden)) return null;
	/** @type {{ id: number, tahun: number, bidang: string, skema: string, durasi_bulan: number | null, uang_saku: string | null, sertifikat: string | null, catatan: string | null, nama_tampil: string, kampus: string | null, created_at: string }[]} */
	const pengalaman = /** @type {any} */ (
		db
			.prepare(
				`SELECT id, tahun, bidang, skema, durasi_bulan, uang_saku, sertifikat, catatan, nama_tampil, kampus, created_at
				 FROM experiences WHERE company_id = ? AND hidden = 0 ORDER BY tahun DESC, id DESC`
			)
			.all(r.id)
	);
	/** @type {{ id: number, judul: string, url: string | null, catatan: string | null, sumber: string, sumber_detail: string | null, is_magang: number, ditemukan_pada: string, tutup_pada: string | null, kedaluwarsa_pada: string }[]} */
	const semuaLowongan = /** @type {any} */ (
		db
			.prepare(
				`SELECT id, judul, url, catatan, sumber, sumber_detail, is_magang, ditemukan_pada, tutup_pada, kedaluwarsa_pada
				 FROM openings WHERE company_id = ? AND hidden = 0 ORDER BY ditemukan_pada DESC, id DESC`
			)
			.all(r.id)
	);
	const lowongan = semuaLowongan.filter((o) => o.kedaluwarsa_pada >= today);
	/** @type {import('../shared/magang-status.js').BuktiMagang[]} */
	const bukti = JSON.parse(r.magang_bukti || '[]');
	const nLowonganMagang = semuaLowongan.filter((o) => o.is_magang).length;
	return {
		id: /** @type {string} */ (r.id),
		slug: /** @type {string} */ (r.slug),
		nama: /** @type {string} */ (r.nama),
		jenis: /** @type {Jenis} */ (r.jenis),
		tags: /** @type {string[]} */ (JSON.parse(r.tags || '[]')),
		deskripsi: /** @type {string | null} */ (r.deskripsi),
		alamat: /** @type {string | null} */ (r.alamat),
		kabkota: /** @type {string} */ (r.kabkota),
		kecamatan: /** @type {string | null} */ (r.kecamatan),
		lat: /** @type {number | null} */ (r.lat),
		lng: /** @type {number | null} */ (r.lng),
		telepon: /** @type {string | null} */ (r.telepon),
		whatsapp: /** @type {string | null} */ (r.whatsapp),
		email: /** @type {string | null} */ (r.email),
		website: /** @type {string | null} */ (r.website),
		status_web: /** @type {string} */ (r.status_web),
		instagram: /** @type {string | null} */ (r.instagram),
		linkedin: /** @type {string | null} */ (r.linkedin),
		url_karir: /** @type {string | null} */ (r.url_karir),
		maps_url: /** @type {string | null} */ (r.maps_url),
		osm_url: /** @type {string | null} */ (r.osm_url),
		rating: /** @type {number | null} */ (r.rating),
		jumlah_ulasan: /** @type {number | null} */ (r.jumlah_ulasan),
		peringatan: /** @type {string | null} */ (r.peringatan),
		sumber: /** @type {string[]} */ (JSON.parse(r.sumber || '[]')),
		origin: /** @type {'pipeline' | 'mahasiswa'} */ (r.origin),
		hidden: !!r.hidden,
		diperbarui_pada: /** @type {string | null} */ (r.diperbarui_pada),
		updated_at: /** @type {string} */ (r.updated_at),
		magang: deriveMagangStatus({
			bukti,
			jumlahPengalaman: pengalaman.length,
			jumlahLowongan: nLowonganMagang
		}),
		bukti,
		pengalaman,
		lowongan
	};
}

/** @typedef {NonNullable<ReturnType<typeof getCompanyBySlug>>} CompanyDetail */

/**
 * Host tanpa "www.", atau null bila bukan URL.
 * @param {string | null | undefined} url
 */
export function hostDari(url) {
	if (!url) return null;
	try {
		return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
	} catch {
		return null;
	}
}

/**
 * Apakah `url` berada di domain `host` (termasuk subdomainnya).
 * @param {string | null | undefined} url
 * @param {string | null} host
 */
export function diDomain(url, host) {
	const h = host && hostDari(url);
	return !!h && (h === host || h.endsWith(`.${host}`));
}

/**
 * Data detail untuk halaman publik. Situs yang mati/dibajak tidak pernah ditautkan, termasuk
 * halaman karir dan bukti di domain yang sama; host-nya tetap dikirim untuk teks peringatan.
 * @param {CompanyDetail} c
 */
export function untukPublik(c) {
	const { hidden: _hidden, updated_at: _updated, website, ...rest } = c;
	const aktif = c.status_web === 'aktif';
	const hostBermasalah = aktif ? null : hostDari(website);
	return {
		...rest,
		website: aktif ? website : null,
		web_host: hostBermasalah,
		url_karir: diDomain(c.url_karir, hostBermasalah) ? null : c.url_karir,
		bukti: c.bukti.map((b) => (diDomain(b.url, hostBermasalah) ? { ...b, url: null } : b))
	};
}

/** @typedef {ReturnType<typeof untukPublik>} CompanyPublik */

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} id
 */
export function slugById(db, id) {
	return /** @type {string | undefined} */ (
		db.prepare('SELECT slug FROM companies WHERE id = ? AND hidden = 0').pluck().get(id)
	);
}

/**
 * Semua slug publik + waktu ubah (sitemap).
 * @param {import('better-sqlite3').Database} db
 * @returns {{ slug: string, updated_at: string }[]}
 */
export function listSlugs(db) {
	return /** @type {any} */ (
		db.prepare('SELECT slug, updated_at FROM companies WHERE hidden = 0 ORDER BY slug').all()
	);
}

/**
 * Ringkasan untuk footer & halaman tentang.
 * @param {import('better-sqlite3').Database} db
 */
export function getStats(db) {
	const total = /** @type {number} */ (
		db.prepare('SELECT COUNT(*) FROM companies WHERE hidden = 0').pluck().get()
	);
	const kabkota = /** @type {number} */ (
		db.prepare('SELECT COUNT(DISTINCT kabkota) FROM companies WHERE hidden = 0').pluck().get()
	);
	const rows = /** @type {{ jenis: Jenis, n: number }[]} */ (
		db.prepare('SELECT jenis, COUNT(*) AS n FROM companies WHERE hidden = 0 GROUP BY jenis').all()
	);
	/** @type {Record<Jenis, number>} */
	const perJenis = /** @type {any} */ (Object.fromEntries(JENIS_KEYS.map((k) => [k, 0])));
	for (const r of rows) if (JENIS_SET.has(r.jenis)) perJenis[r.jenis] = r.n;
	const pengalaman = /** @type {number} */ (
		db.prepare('SELECT COUNT(*) FROM experiences WHERE hidden = 0').pluck().get()
	);
	const lastImport = /** @type {string | undefined} */ (
		db.prepare(`SELECT value FROM meta WHERE key = 'last_import_dataset'`).pluck().get()
	);
	return { total, kabkota, perJenis, pengalaman, lastImport: lastImport || null };
}
