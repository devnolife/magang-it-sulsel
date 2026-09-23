// Migrasi skema sebagai string SQL (ikut ter-bundle oleh Vite). Tambah entri baru di akhir;
// jangan ubah entri lama yang sudah pernah dijalankan di server.

const NOW = `(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

const FTS_COLS = 'nama, jenis, tags, alamat, kabkota, kecamatan, deskripsi';
const ftsValues = (/** @type {string} */ p) =>
	FTS_COLS.split(', ')
		.map((c) => `${p}.${c}`)
		.join(', ');

/** @type {{ version: number, name: string, sql: string }[]} */
export const MIGRATIONS = [
	{
		version: 1,
		name: 'skema awal',
		sql: `
CREATE TABLE companies (
	id TEXT PRIMARY KEY,
	slug TEXT NOT NULL UNIQUE,
	nama TEXT NOT NULL,
	jenis TEXT NOT NULL,
	tags TEXT NOT NULL DEFAULT '[]',
	deskripsi TEXT,
	alamat TEXT,
	kabkota TEXT NOT NULL,
	kecamatan TEXT,
	lat REAL,
	lng REAL,
	telepon TEXT,
	whatsapp TEXT,
	email TEXT,
	website TEXT,
	instagram TEXT,
	linkedin TEXT,
	url_karir TEXT,
	maps_url TEXT,
	osm_url TEXT,
	rating REAL,
	jumlah_ulasan INTEGER,
	status_web TEXT NOT NULL DEFAULT 'tidak-ada',
	peringatan TEXT,
	magang_bukti TEXT NOT NULL DEFAULT '[]',
	sumber TEXT NOT NULL DEFAULT '[]',
	source_keys TEXT NOT NULL DEFAULT '{}',
	klasifikasi TEXT,
	diperbarui_pada TEXT,
	origin TEXT NOT NULL DEFAULT 'pipeline' CHECK (origin IN ('pipeline', 'mahasiswa')),
	locked_fields TEXT NOT NULL DEFAULT '[]',
	hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
	missing_from_import INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT ${NOW},
	updated_at TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX companies_kabkota ON companies (kabkota);
CREATE INDEX companies_jenis ON companies (jenis);

CREATE VIRTUAL TABLE companies_fts USING fts5 (
	${FTS_COLS},
	content = 'companies',
	content_rowid = 'rowid',
	tokenize = 'unicode61 remove_diacritics 2'
);
CREATE TRIGGER companies_ai AFTER INSERT ON companies BEGIN
	INSERT INTO companies_fts (rowid, ${FTS_COLS}) VALUES (new.rowid, ${ftsValues('new')});
END;
CREATE TRIGGER companies_ad AFTER DELETE ON companies BEGIN
	INSERT INTO companies_fts (companies_fts, rowid, ${FTS_COLS})
	VALUES ('delete', old.rowid, ${ftsValues('old')});
END;
CREATE TRIGGER companies_au AFTER UPDATE OF ${FTS_COLS} ON companies BEGIN
	INSERT INTO companies_fts (companies_fts, rowid, ${FTS_COLS})
	VALUES ('delete', old.rowid, ${ftsValues('old')});
	INSERT INTO companies_fts (rowid, ${FTS_COLS}) VALUES (new.rowid, ${ftsValues('new')});
END;

CREATE TABLE submissions (
	id INTEGER PRIMARY KEY,
	type TEXT NOT NULL CHECK (type IN ('usulan', 'koreksi', 'pengalaman', 'lowongan')),
	company_id TEXT REFERENCES companies (id) ON DELETE SET NULL,
	payload TEXT NOT NULL,
	kontak_pengirim TEXT,
	status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
	ip_hash TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT ${NOW},
	reviewed_at TEXT,
	review_note TEXT
);
CREATE INDEX submissions_queue ON submissions (status, type, created_at);

CREATE TABLE experiences (
	id INTEGER PRIMARY KEY,
	company_id TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
	submission_id INTEGER REFERENCES submissions (id) ON DELETE SET NULL,
	tahun INTEGER NOT NULL,
	bidang TEXT NOT NULL,
	skema TEXT NOT NULL CHECK (skema IN ('mandiri', 'kampus', 'mbkm', 'pkl')),
	durasi_bulan INTEGER,
	uang_saku TEXT CHECK (uang_saku IN ('ada', 'tidak')),
	sertifikat TEXT CHECK (sertifikat IN ('ada', 'tidak')),
	catatan TEXT,
	nama_tampil TEXT NOT NULL DEFAULT 'Anonim',
	kampus TEXT,
	hidden INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX experiences_company ON experiences (company_id);

CREATE TABLE openings (
	id INTEGER PRIMARY KEY,
	company_id TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
	submission_id INTEGER REFERENCES submissions (id) ON DELETE SET NULL,
	judul TEXT NOT NULL,
	url TEXT,
	catatan TEXT,
	sumber TEXT NOT NULL CHECK (sumber IN ('pipeline', 'mahasiswa')),
	sumber_detail TEXT,
	is_magang INTEGER NOT NULL DEFAULT 0,
	ditemukan_pada TEXT NOT NULL,
	tutup_pada TEXT,
	kedaluwarsa_pada TEXT NOT NULL,
	hidden INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX openings_company ON openings (company_id, kedaluwarsa_pada);

CREATE TABLE rate_limits (
	bucket TEXT NOT NULL,
	ip_hash TEXT NOT NULL,
	window_start INTEGER NOT NULL,
	count INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (bucket, ip_hash, window_start)
) WITHOUT ROWID;

CREATE TABLE meta (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL
) WITHOUT ROWID;
`
	}
];

/**
 * Jalankan migrasi yang belum diterapkan (PRAGMA user_version). Aman dipanggil berulang.
 * @param {import('better-sqlite3').Database} db
 * @returns {number[]} versi yang baru diterapkan
 */
export function migrate(db) {
	const current = /** @type {number} */ (db.pragma('user_version', { simple: true }));
	const applied = [];
	for (const m of MIGRATIONS) {
		if (m.version <= current) continue;
		db.transaction(() => {
			db.exec(m.sql);
			db.pragma(`user_version = ${m.version}`);
		})();
		applied.push(m.version);
	}
	return applied;
}
