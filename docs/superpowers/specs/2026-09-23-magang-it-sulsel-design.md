# Desain: magang-it-sulsel, direktori tempat magang IT di Sulawesi Selatan

> Status: disetujui 2026-09-23. Dokumen ini adalah spesifikasi desain; rincian implementasi
> dapat berkembang, tetapi keputusan di bawah menjadi acuan.

## Masalah & tujuan

Mahasiswa informatika di Sulsel sulit menemukan tempat magang lokal. Hasil sweep karirku menunjukkan
masalahnya: job board nyaris kosong untuk Sulsel, dan informasi perusahaan lokal tersebar di Google
Maps, website, dan Instagram.

Solusinya adalah repo publik baru **`devnolife/magang-it-sulsel`** yang berisi dua bagian.

1. **Pipeline data lokal** (tanpa Docker). Pipeline ini menghimpun perusahaan dan instansi yang punya
   unsur informatika di 24 kab/kota Sulsel. Sumbernya Google Maps, OpenStreetMap, website masing-masing
   perusahaan, dan data kurasi karirku. Setiap entri lalu diklasifikasikan dengan aturan kata kunci,
   ditambah AI lewat `copilot-text-shim` untuk kasus yang ragu.
2. **Aplikasi web SvelteKit dinamis** (adapter-node + SQLite di VPS Ubuntu). Mahasiswa bisa mencari,
   memfilter, melihat peta, dan menghubungi perusahaan. Mereka juga bisa mengirim usulan, koreksi,
   pengalaman magang, dan info lowongan. Semua kiriman dimoderasi oleh satu admin.

## Keputusan (hasil tanya-jawab)

| Topik                  | Keputusan                                                                                                                                                                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wilayah                | Seluruh Sulsel (24 kab/kota). Makassar dicari lebih rinci, per kecamatan.                                                                                                                                                                                                                     |
| Jenis yang masuk       | Software house / jasa aplikasi & web; konsultan IT / system integrator / jaringan & keamanan; ISP / telko / data center; digital agency / kreatif digital / studio game; instansi & perusahaan dengan divisi IT (Diskominfo, BPS, Telkom, bank, RS, kampus); startup / coworking / inkubator. |
| Jenis yang tidak masuk | Kursus / LPK, toko / servis komputer.                                                                                                                                                                                                                                                         |
| Sumber data            | Google Maps (scraping lokal lewat Chrome sendiri via CDP, tanpa login) + OSM Overpass + cek website + kurasi karirku.                                                                                                                                                                         |
| Klasifikasi            | Aturan skor, lalu AI (shim Copilot) untuk kasus ragu, lalu override manual.                                                                                                                                                                                                                   |
| Arsitektur             | Pendekatan C (dinamis): SvelteKit `adapter-node` + `better-sqlite3` di VPS Ubuntu. Scraping tetap berjalan di laptop.                                                                                                                                                                         |
| Repo                   | `devnolife/magang-it-sulsel`, publik, lisensi MIT.                                                                                                                                                                                                                                            |
| Deploy                 | Hanya panduan (`docs/deploy-vps.md`); user men-deploy sendiri. Awalnya diakses lewat IP (belum ada domain).                                                                                                                                                                                   |
| Isian mahasiswa        | Usulan perusahaan, koreksi / tutup / minta hapus, pengalaman magang, lowongan. Anonim, dengan honeypot + batas per IP. Semua masuk antrean moderasi.                                                                                                                                          |
| Moderator              | Satu admin; hash password disimpan di `.env` server.                                                                                                                                                                                                                                          |
| Fitur jelajah          | Pencarian, filter, peta Leaflet/OSM, tombol kontak, halaman detail (SEO), urut jarak GPS, unduh CSV, mode gelap.                                                                                                                                                                              |
| Tidak termasuk         | PWA, login mahasiswa, banyak moderator, auto-deploy, scraping terjadwal, Docker.                                                                                                                                                                                                              |

## Arsitektur

```
LAPTOP  (npm run pipeline -- <tahap>)                     VPS UBUNTU (panduan)
 Chrome :9335 ──► maps ─┐                                  git pull → npm ci → npm run build
 Overpass ──────► osm ──┼─► merge ─► enrich ─► classify    npm run db:import  (upsert, menghormati
 kurasi/instansi ► seed ┘                        │ AI       locked_fields dan hidden)
                                                 ▼ shim :8787            │
                              export ─► data/companies.json ──git──► var/app.db (SQLite)
                                        data/laporan-pipeline.md             ▲
                                                   SvelteKit adapter-node (systemd, di balik Caddy/Nginx)
                                                   ├ publik : cari · filter · peta · detail · CSV · sitemap
                                                   ├ form   : usulan · koreksi · pengalaman · lowongan → antrean
                                                   └ /admin : login → setujui/tolak · edit (kunci field) · sembunyikan
```

**Pembagian data.**

- `data/companies.json` adalah snapshot pipeline yang sudah di-review. Perubahannya terlihat di diff git,
  dan file ini sekaligus menjadi dataset publik.
- Database server adalah gabungan snapshot tersebut, isian mahasiswa yang disetujui, dan editan admin.
- Import tidak pernah menimpa field yang dikunci admin, tidak mengubah status `hidden`, dan tidak
  menyentuh perusahaan hasil usulan mahasiswa.

**Stack.**

- Svelte 5 (runes) + SvelteKit 2 dengan `adapter-node`. Bahasanya **JavaScript + JSDoc**, sama dengan
  karirku dan rule-based-jobsearch, dicek dengan `svelte-check`.
- CSS biasa dengan variabel untuk tema terang/gelap (tanpa Tailwind).
- Peta: Leaflet 1.9.4 + `leaflet.markercluster`, dimuat lazy di sisi klien. Tile dari OSM dengan atribusi.
- Database: `better-sqlite3` + migrasi SQL biasa (tanpa ORM), dengan FTS5 untuk pencarian.
- Scraper: `playwright-core` yang tersambung ke Chrome sistem lewat `connectOverCDP`, mengikuti pola
  `rule-based-jobsearch/src/browser.js`. Port 9335, profil `~/.magang-it-sulsel/chrome-profile`, terpisah
  dari 9333 (Hunter) dan 9334 (jev).
- Tooling: Vitest, Prettier + ESLint (via `sv add`), npm, Node 24 LTS.
- Modul murni (fungsi tanpa efek samping) diletakkan di `src/lib/shared/`, hanya memakai import relatif
  tanpa alias `$lib`, supaya bisa dipakai bersama oleh aplikasi dan script Node.

## Struktur repo

```
magang-it-sulsel/
├─ README.md                 (ID: tujuan, fitur, cara pakai lokal, pipeline, kontribusi, sumber & lisensi data)
├─ AGENTS.md                 (perintah, konvensi, aturan git: tanpa trailer Co-authored-by Copilot)
├─ LICENSE                   (MIT, untuk kode)
├─ .env.example              (DATABASE_PATH, ADMIN_PASSWORD_HASH, SESSION_SECRET, IP_HASH_SALT, ORIGIN,
│                             SHIM_URL, SHIM_TOKEN, CDP_PORT)
├─ docs/
│  ├─ deploy-vps.md
│  └─ superpowers/specs/2026-09-23-magang-it-sulsel-design.md
├─ deploy/                   (magang-it-sulsel.service, Caddyfile, nginx.conf, backup.sh)
├─ data/
│  ├─ companies.json         (snapshot pipeline, di-commit)
│  └─ laporan-pipeline.md    (jumlah per tahap, daftar ragu/dikecualikan, dibuat otomatis)
├─ pipeline/
│  ├─ cli.js                 (seed|maps|osm|merge|enrich|classify|export|all  --kab --limit --fresh)
│  ├─ config/                (wilayah.js, queries.js, klasifikasi.js, kabkota.geojson)
│  ├─ seed/                  (kurasi.json, instansi.json, jobstreet-sulsel-2026-09-23.json)
│  ├─ overrides.json         (include/exclude/jenis/field per key, diedit manual)
│  ├─ lib/                   (browser.js, cache.js, http.js, robots.js)
│  ├─ sources/               (maps.js, maps-parse.js, osm.js, seed.js)
│  ├─ steps/                 (merge.js, enrich.js, classify.js, export.js)
│  └─ cache/                 (gitignored: JSONL per query, hasil fetch website, jawaban AI)
├─ scripts/                  (db-migrate.js, db-import.js, admin-hash.js, smoke.js)
├─ src/
│  ├─ app.html               (script anti-flash untuk tema)
│  ├─ hooks.server.js        (guard admin, header keamanan)
│  ├─ lib/shared/            (company-schema, phone, slug, geo, jenis, magang-status, csv)
│  ├─ lib/server/            (db/, companies.js, submissions.js, validation.js, ratelimit.js, auth.js, tokens.js)
│  ├─ lib/components/        (SearchBar, Filters, CompanyCard, MapView, ContactButtons, MagangBadge,
│  │                          ThemeToggle, SubmissionForms)
│  └─ routes/                (lihat bagian Aplikasi web)
├─ tests/fixtures/           (HTML Maps & website contoh, companies.sample.json)
└─ .github/workflows/ci.yml  (check, lint, test, build; tanpa deploy)
```

## Kontrak data: `data/companies.json`

Divalidasi oleh `src/lib/shared/company-schema.js`, yang dipakai bersama oleh pipeline dan `db:import`.
Setiap entri punya field berikut.

- **Identitas & kategori**
  - `id`: stabil, misalnya `c_7k2m9q4x`. Dipakai ulang antar-run dengan mencocokkan source key.
  - `slug`: `nama-kabkota`, tetap setelah pertama kali dibuat.
  - `nama`
  - `jenis`: salah satu dari software, konsultan, isp, agency, instansi, startup.
  - `tags[]`, `deskripsi`
- **Lokasi**
  - `alamat`, `kabkota`, `kecamatan`, `lat`, `lng`
  - `kabkota` ditentukan lewat point-in-polygon terhadap `kabkota.geojson` (batas OSM admin_level=5).
- **Kontak**
  - `telepon` dalam format E.164.
  - `whatsapp`: hanya diisi untuk nomor seluler 08xx/628xx, ditampilkan dengan label "WA belum tentu aktif".
  - `email`, `website`, `instagram`, `linkedin`, `url_karir`
- **Tautan sumber & rating**
  - `maps_url`, `osm_url`, `rating`, `jumlah_ulasan`
- **Status website**
  - `status_web`: aktif, mati, dibajak, atau tidak-ada.
  - `peringatan`: contoh "website dibajak" atau "perusahaan memperingatkan penipuan lowongan".
- **Bukti magang & lowongan**
  - `magang_bukti[]`: `{tipe: halaman-karir | lowongan | kurasi, url, kutipan, tanggal}`
  - `lowongan[]`: berasal dari pipeline, misalnya JobStreet; kedaluwarsa otomatis.
- **Asal-usul data**
  - `sumber[]`: maps, osm, website, kurasi.
  - `source_keys`: `{google_fid, osm, domain, telepon}`
  - `klasifikasi`: `{metode: aturan | ai | manual, skor, alasan}`
  - `diperbarui_pada`

**Status magang** dihitung oleh `shared/magang-status.js` dan ditampilkan sebagai badge beserta daftar buktinya.

| Status          | Syarat                                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| terbukti        | Ada pengalaman magang yang disetujui, atau ada lowongan magang (dari pipeline maupun kiriman mahasiswa). |
| indikasi        | Halaman karir atau kurasi menyebut magang / internship / PKL / MBKM.                                     |
| belum diketahui | Selain dua kondisi di atas.                                                                              |

## Model database (SQLite, `var/app.db`)

- `companies`: kolom sesuai kontrak di atas, ditambah:
  - `origin` (pipeline | mahasiswa)
  - `locked_fields` (JSON)
  - `hidden`
  - `created_at`, `updated_at`
- `companies_fts`: tabel FTS5 berisi nama, jenis, tags, alamat, kabkota, dan deskripsi. Selalu sinkron
  lewat trigger.
- `submissions`: `type` (usulan | koreksi | pengalaman | lowongan), `company_id?`, `payload` (JSON),
  `status` (pending | approved | rejected), `kontak_pengirim?` (privat, tidak pernah ditampilkan),
  `ip_hash`, `created_at`, `reviewed_at`, `review_note`.
- `experiences`: diisi saat pengalaman disetujui. Kolom: tahun, bidang, skema (mandiri / kampus / MBKM /
  PKL), durasi_bulan, uang_saku, sertifikat, catatan ≤500, nama_tampil (default "Anonim"), kampus?
- `openings`: judul, url, tutup_pada? (bila kosong, kedaluwarsa 30 hari setelah disetujui), sumber
  (pipeline | mahasiswa).
- `rate_limits`: `ip_hash`, bucket, jendela waktu, jumlah; data lama dipangkas otomatis.
- `meta`: versi skema, waktu dan hash import terakhir.
- Migrasi berjalan otomatis saat server start, dan juga bisa dijalankan manual dengan `npm run db:migrate`.
  Import tetap eksplisit lewat `npm run db:import`.

## Pipeline data (`npm run pipeline -- <tahap> [--kab makassar] [--limit N] [--fresh]`)

1. **seed**
   - `kurasi.json`: diekspor sekali dari `karirku/data/hunter.db`. Isinya 14 perusahaan SULSEL beserta
     kontak, catatan, dan peringatan (misalnya Fortinusa soal penipuan, Upana yang dibajak, Magau yang
     terbukti menerima magang).
   - `instansi.json`: daftar kurasi Diskominfo dan BPS per kab/kota, Telkom, PLN UIW, Bank Sulselbar,
     Pelindo, Semen Tonasa, Vale, RS besar, serta unit TIK kampus. Setiap entri diverifikasi dan diberi
     query Maps.
   - `jobstreet-sulsel-2026-09-23.json`: 38 lowongan hasil sweep, dipakai sebagai bukti lowongan.
     Kedaluwarsa 45 hari setelah ditemukan.
2. **maps**
   - Query berasal dari `queries.js` × `wilayah.js`:
     - Makassar: semua query se-kota, ditambah query padat per kecamatan (15 kecamatan).
     - 23 kab/kota lain: set query ringkas.
   - Hasil diambil dari kartu feed (nama, kategori, alamat, telepon, website, rating). Koordinat dan
     feature id diambil dari URL tempat. Halaman detail hanya dibuka untuk entri yang kontaknya kosong
     (`--detail`).
   - Aturan sopan:
     - Hanya satu tab, dengan jeda acak antar-pencarian dan antar-scroll.
     - Batas pencarian per run.
     - Cache JSONL per query, sehingga run yang terputus bisa dilanjutkan.
     - Run langsung berhenti bila muncul captcha atau halaman `/sorry/`.
   - Parser dipisah di `maps-parse.js` dan diuji dengan fixture, supaya mudah diperbaiki saat DOM Maps berubah.
3. **osm**
   - Overpass `area["ISO3166-2"="ID-SN"]` dengan tag `office=it|telecommunication|coworking`,
     `amenity=coworking_space`, `telecom=data_center`, `office=government`, ditambah nama yang mengandung
     kata kunci IT.
   - Hasil dinormalkan ke bentuk tempat yang sama dengan sumber Maps.
4. **merge**
   - Dedupe berdasarkan `google_fid`, lalu OSM id, lalu domain website, lalu telepon E.164, lalu nama yang
     dinormalkan dengan jarak kurang dari 150 m.
   - Prioritas field: kurasi, lalu Maps, lalu OSM.
   - `kabkota` diisi lewat point-in-polygon. Tempat di luar Sulsel dibuang.
   - `id` dan `slug` dipakai ulang dari `data/companies.json` sebelumnya.
5. **enrich**
   - Mengambil homepage perusahaan dengan `fetch`, dengan timeout, batas ukuran, dan batas konkurensi. Bila
     isinya terlalu sedikit (SPA), halaman dirender ulang lewat Chrome. `robots.txt` dihormati.
   - Mendeteksi website mati, parkir, atau dibajak (kata kunci judi/slot dan konten asing).
   - Mengekstrak email, `wa.me`, IG/LinkedIn, dan tautan karir, lalu mencari kata kunci magang di halaman
     karir untuk mengisi `magang_bukti`.
   - Hasil fetch disimpan di cache.
6. **classify**
   - Skor dihitung dari tiga sinyal:
     - kategori Maps / tag OSM (sinyal kuat);
     - kata kunci nama (positif dan negatif, misalnya printing, konter, servis, warnet);
     - teks website.
   - Keputusan berdasarkan skor:

     | Skor                  | Keputusan                                    |
     | --------------------- | -------------------------------------------- |
     | Di atas ambang atas   | Masuk, dengan `jenis` sesuai sinyal terkuat. |
     | Di bawah ambang bawah | Dibuang.                                     |
     | Di antara keduanya    | Ragu, diteruskan ke AI.                      |

   - Kasus ragu dikirim ke AI lewat `copilot-text-shim` (`SHIM_URL`, sekitar 15 tempat per panggilan, jawaban
     JSON `{key, masuk, jenis, alasan}`, di-cache). Bila shim mati, entri itu masuk daftar review manual.
   - `overrides.json` selalu menang atas hasil aturan maupun AI.
7. **export**
   - Validasi skema, urutkan secara stabil, lalu tulis `data/companies.json` dan `data/laporan-pipeline.md`.
8. **all**: menjalankan semua tahap di atas berurutan, dan melewati tahap yang cache-nya masih valid.

## Aplikasi web

| Route                                              | Isi                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                | Direktori. Search box (FTS5 prefix, fallback LIKE). Filter kab/kota, jenis (chip), status magang, dan "ada lowongan aktif"; semua filter tersimpan di URL sehingga bisa dibagikan. Tersedia jumlah per filter (facet). Daftar kartu dirender bertahap ("Muat lebih banyak"). Panel peta (cluster marker; klik kartu memindahkan peta ke lokasinya). Urutan: relevansi / nama / **terdekat**. |
| `/perusahaan/[slug]`                               | Info lengkap, tombol kontak, peta mini, badge magang beserta bukti, peringatan, pengalaman magang, lowongan aktif, dan form koreksi/pengalaman/lowongan. Meta SEO dan canonical.                                                                                                                                                                                                             |
| `/usulkan`                                         | Form usulan perusahaan baru.                                                                                                                                                                                                                                                                                                                                                                 |
| `/data.csv`                                        | Ekspor CSV UTF-8 (BOM) sesuai filter aktif. Perusahaan tersembunyi dan data pengirim tidak ikut.                                                                                                                                                                                                                                                                                             |
| `/tentang`                                         | Sumber data, atribusi (© OpenStreetMap contributors, ODbL), cara menentukan status magang, tips aman magang (jangan bayar untuk magang, waspada penipuan), dan cara minta hapus data.                                                                                                                                                                                                        |
| `/sitemap.xml`, `/robots.txt`                      | Dibuat dinamis dari `ORIGIN`. `/admin` di-disallow.                                                                                                                                                                                                                                                                                                                                          |
| `/admin/login`, `/admin`, `/admin/perusahaan/[id]` | Antrean per jenis kiriman dengan jumlahnya; aksi setujui (usulan dapat diedit sebelum dibuat), tolak (dengan catatan), edit perusahaan (field yang diedit otomatis dikunci), sembunyikan/tampilkan, logout. `noindex`.                                                                                                                                                                       |

- **Urut terdekat** dihitung di klien. Posisi GPS tidak pernah dikirim ke server, dan jarak ditampilkan di
  setiap kartu.
- **Tombol kontak**: WA (`wa.me`), telepon (`tel:`), email (`mailto:`), website, IG, dan Google Maps.
  Tombol untuk data kosong disembunyikan. Website yang mati atau dibajak tidak diberi tautan.
- **Mode gelap** mengikuti `prefers-color-scheme` dan bisa diubah lewat toggle (disimpan di localStorage,
  tanpa kedip saat memuat). Tile peta digelapkan dengan filter CSS.
- **Aksesibilitas & tampilan**: mobile-first, label form lengkap, fokus terlihat, dan jumlah hasil diumumkan
  lewat `aria-live`. Seluruh UI berbahasa Indonesia.

## Isian mahasiswa & moderasi

- **Form** memakai SvelteKit form actions + `use:enhance`, jadi tetap berfungsi tanpa JavaScript.
  Validasinya ada di `lib/server/validation.js`: panjang maksimum, URL harus http/https, tahun dan tanggal
  harus valid.
  - Usulan: nama, jenis, kab/kota, alamat, website, telepon/WA, email, IG, link Maps, alasan unsur IT,
    kontak pengirim (opsional).
  - Koreksi: jenis koreksi (data salah / tutup-pindah / minta hapus data / lainnya), rincian, kontak (opsional).
  - Pengalaman: kolom sesuai tabel `experiences`.
  - Lowongan: judul, URL, tanggal tutup (opsional), catatan.
- **Anti-spam** (tanpa layanan pihak ketiga):
  - honeypot;
  - token waktu bertanda HMAC: kiriman ditolak bila lebih cepat dari 3 detik atau lebih lama dari 2 jam;
  - batas 5 kiriman per jam dan 20 per hari per `ip_hash`. IP di-HMAC dengan `IP_HASH_SALT` dan tidak
    pernah disimpan mentah.
  - CSRF ditangani oleh pemeriksaan origin bawaan SvelteKit.
- **Moderasi**. Semua kiriman berstatus pending sampai admin memutuskan.
  - Menyetujui **usulan** akan membuat perusahaan baru dengan `origin=mahasiswa`, dan field yang diisi
    langsung dikunci.
  - Menyetujui **pengalaman** atau **lowongan** memindahkannya ke tabel `experiences` atau `openings`.
  - **Koreksi** ditindaklanjuti dengan mengedit perusahaan atau menyembunyikannya, lalu ditandai selesai.
- **Admin**:
  - `ADMIN_PASSWORD_HASH` berformat scrypt `node:crypto` dan dibuat dengan `npm run admin:hash`.
  - Cookie sesi bertanda HMAC (`SESSION_SECRET`) dengan atribut httpOnly dan sameSite=strict, `secure`
    bila memakai https, kedaluwarsa 12 jam.
  - Login dibatasi 5 percobaan per 15 menit per IP.

## Keamanan & privasi

- CSP lewat `kit.csp`: `default-src 'self'`; `img-src` hanya self, data:, dan tile OSM; `frame-ancestors
'none'`; `form-action 'self'`. Ditambah header `nosniff` dan `Referrer-Policy`. Aset Leaflet
  di-bundle, tidak diambil dari CDN.
- Tidak ada `{@html}` untuk konten pengguna. Tautan dari kiriman mahasiswa diberi
  `rel="nofollow ugc noopener"`.
- `adapter-node` di balik proxy memakai `ADDRESS_HEADER=X-Forwarded-For` dan `XFF_DEPTH=1`, serta
  `BODY_SIZE_LIMIT` yang kecil.
- Kontak pengirim hanya terlihat oleh admin. Pengalaman tampil anonim secara default. Permintaan hapus data
  diterima lewat form koreksi.
- Di Maps tidak ada login akun Google. Yang diambil hanya fakta bisnis; teks ulasan dan foto tidak diambil,
  dan setiap entri menautkan balik ke Maps.

## Deploy VPS (panduan `docs/deploy-vps.md` + template `deploy/`)

1. Siapkan Ubuntu 22.04/24.04: Node 24 LTS (NodeSource), git, build-essential (cadangan bila perlu
   mem-build better-sqlite3), ufw (22/80/443), dan user sistem `magang`.
2. Clone ke `/opt/magang-it-sulsel`, lalu isi `.env`: `ORIGIN`, secrets, dan
   `DATABASE_PATH=/var/lib/magang-it-sulsel/app.db`.
3. Jalankan `npm ci && npm run build && npm run db:migrate && npm run db:import`.
4. Pasang systemd unit (`node build`, `HOST=127.0.0.1`, `PORT=3000`, `EnvironmentFile`, restart otomatis).
5. Pasang reverse proxy: Caddy (disarankan, HTTPS otomatis) atau Nginx.
   - Selama belum punya domain, pakai `<ip>.sslip.io` di Caddy agar login admin tidak lewat HTTP polos.
   - Alternatifnya, buka `/admin` hanya lewat SSH tunnel.
6. Pasang backup: `deploy/backup.sh` (`sqlite3 .backup`, simpan 7 hari) dijadwalkan lewat cron.
7. Urutan pembaruan: `git pull` → `npm ci` → `npm run build` → `npm run db:import` → `systemctl restart`.

## Verifikasi

- `npm run check`, `npm run lint`, dan `npm test` (Vitest) mencakup:
  - normalisasi telepon/WA, slug, haversine, point-in-polygon, status magang, skema;
  - parser Maps/OSM/website (dengan fixture), merge/dedupe, aturan klasifikasi;
  - migrasi, import (kunci field, `hidden`, id stabil), validasi form, rate limit, auth (scrypt dan cookie).
- `npm run build`, lalu `scripts/smoke.js` dijalankan terhadap `node build` dengan DB sementara:
  - halaman publik, pencarian dan filter, detail, CSV, sitemap/robots;
  - kiriman valid, honeypot, dan rate limit;
  - login admin, lalu setujui, lalu entri tampil.
- Cek UI lewat chrome-devtools: desktop dan mobile, terang dan gelap, peta, dan urut terdekat dengan
  geolokasi palsu.
- Pipeline:
  - pilot Makassar dengan `--limit` untuk memvalidasi parser;
  - run penuh Sulsel yang bisa dilanjutkan bila terputus;
  - cek acak 10 entri terhadap Maps;
  - baca `laporan-pipeline.md` sebelum `data/companies.json` di-commit.
- Review keamanan untuk bagian auth, form, dan admin dilakukan lewat agent code-review.

## Risiko & mitigasi

| Risiko                              | Mitigasi                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| ToS Google Maps (captcha/blokir IP) | Run lokal tanpa login, jeda acak, berhenti saat captcha, hanya fakta bisnis, tautan balik. OSM dan kurasi tetap jadi cadangan. |
| DOM Maps berubah                    | Parser diisolasi dan diuji dengan fixture; run bisa dilanjutkan dari cache.                                                    |
| Salah klasifikasi                   | Aturan, AI, review daftar ragu, `overrides.json`, dan form koreksi.                                                            |
| Spam isian anonim                   | Moderasi wajib, honeypot, token waktu, rate limit. Turnstile bisa ditambahkan nanti.                                           |
| Belum ada domain (HTTP)             | Caddy + sslip.io untuk HTTPS, atau admin lewat SSH tunnel.                                                                     |
| Lisensi OSM (ODbL)                  | Atribusi di peta, halaman tentang, dan README. Sumber dicatat per entri.                                                       |
| Data DB di VPS hilang               | Backup harian via cron. Snapshot pipeline tetap tersimpan di git.                                                              |
| Shim Copilot tidak berjalan         | Klasifikasi AI dilewati; entri ragu masuk daftar review manual.                                                                |

## Urutan implementasi

1. Fondasi repo: scaffold, lib `shared` (kontrak data), CI.
2. Lapisan DB: koneksi, migrasi, FTS5, import `data/companies.json`.
3. Pipeline: konfigurasi wilayah dan query, seed, Maps, OSM, merge, enrich, classify, export.
4. Web: direktori, detail, CSV, isian mahasiswa, admin.
5. Pengerasan keamanan, panduan deploy VPS, run data pertama, verifikasi end-to-end.
