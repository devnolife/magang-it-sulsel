# Magang IT Sulsel

[![CI](https://github.com/devnolife/magang-it-sulsel/actions/workflows/ci.yml/badge.svg)](https://github.com/devnolife/magang-it-sulsel/actions/workflows/ci.yml)

Direktori terbuka perusahaan dan instansi berunsur informatika di Sulawesi Selatan, untuk
mahasiswa yang mencari tempat magang atau PKL. Setiap tempat punya kontak yang bisa langsung
dihubungi (WhatsApp, telepon, email, website, Instagram) dan posisinya di peta.

Status magang di direktori ini **bukan jaminan**. Banyak tempat menerima mahasiswa tanpa pernah
mengumumkannya, jadi tanyakan langsung lewat kontaknya.

## Isi data (snapshot 23 September 2026)

- **655 tempat** di 24 kabupaten/kota. Makassar 384, Gowa 61, Maros 24, Pinrang 20, Luwu Timur 20,
  dan lainnya.
- **Jenis:** software house 286, agensi digital 140, ISP & jaringan 106, instansi pemerintah 62,
  konsultan TI 41, startup 20.
- **Kontak:** telepon 566, WhatsApp 474, website aktif 338, Instagram 116, email 98, halaman karir 31.
- Toko/servis komputer, kursus, warnet, percetakan, dan gerai operator seluler **tidak** dimasukkan.

Dataset lengkap ada di [`data/companies.json`](data/companies.json). Ringkasan tiap tahap pipeline
ada di [`data/laporan-pipeline.md`](data/laporan-pipeline.md).

## Fitur

- Pencarian teks (SQLite FTS5) dengan filter kab/kota, jenis, dan status magang. Hasil bisa
  diurutkan menurut relevansi, nama, atau **terdekat**. Posisi GPS hanya dihitung di browser.
- Peta Leaflet + OpenStreetMap dengan klaster penanda. Halaman detail punya peta mini.
- Halaman detail: semua kontak, bukti magang (halaman karir, catatan kurasi), dan peringatan
  bila situs mati, ditangguhkan, atau dibajak.
- Unduh CSV sesuai filter yang sedang aktif (`/data.csv`).
- Usulan tempat, koreksi data, dan cerita magang lewat formulir GitHub Issues.
- Tema terang/gelap. Tetap berfungsi tanpa JavaScript. Tanpa akun, iklan, atau pelacak.

## Struktur

| Folder             | Isi                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `src/`             | Aplikasi SvelteKit (adapter-node) + SQLite (better-sqlite3).                                  |
| `pipeline/`        | Pengumpulan data, dijalankan di laptop: Google Maps, OpenStreetMap, cek website, klasifikasi. |
| `data/`            | Hasil pipeline yang di-commit: `companies.json` + laporan.                                    |
| `scripts/`         | Migrasi & import DB, sembunyikan entri, uji asap, gambar siluet peta.                         |
| `deploy/`, `docs/` | Templat systemd & Caddy, [panduan deploy VPS](docs/deploy-vps.md).                            |
| `.github/`         | CI dan formulir isu (usulan, koreksi, cerita magang).                                         |

## Menjalankan di laptop

Butuh Node.js 22.12 atau lebih baru.

```sh
npm ci
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
npm run db:import           # data/companies.json -> ./var/app.db
npm run dev
```

Build produksi dan uji asap:

```sh
npm run build
npm start                   # http://localhost:3000
npm run smoke -- http://127.0.0.1:3000
```

Pemeriksaan yang juga dijalankan CI: `npm run check`, `npm run lint`, `npm test`.

## Memperbarui data

Pipeline hanya perlu dijalankan di laptop. Server cukup menerima `data/companies.json` yang sudah
jadi.

```sh
npm run pipeline -- all                 # semua tahap berurutan
npm run pipeline -- maps --kab gowa     # satu tahap, satu wilayah
npm run pipeline -- --help              # daftar tahap & opsi
```

| Tahap      | Fungsi                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| `geo`      | Unduh batas kab/kota & kecamatan dari OSM.                                                                  |
| `seed`     | Baca `pipeline/seed/*.json` (kurasi manual, instansi, lowongan).                                            |
| `maps`     | Scraping hasil pencarian Google Maps.                                                                       |
| `osm`      | Ambil tempat berunsur IT dari OpenStreetMap (Overpass).                                                     |
| `merge`    | Gabung & hapus duplikat semua sumber, tentukan kab/kota.                                                    |
| `detail`   | Buka halaman tempat di Maps untuk kandidat yang kontaknya belum lengkap.                                    |
| `enrich`   | Cek website: status, email, WA, IG, LinkedIn, halaman karir, kata kunci magang. `--render` untuk situs SPA. |
| `classify` | Skor aturan + AI untuk kasus ragu, lalu `pipeline/overrides.json`.                                          |
| `export`   | Validasi & tulis `data/companies.json` + `data/laporan-pipeline.md`.                                        |

Catatan:

- `maps`, `detail`, dan `enrich --render` membuka Chrome sendiri di port CDP 9335 dengan profil
  terpisah (`CDP_PORT`, `CHROME_PATH`, `CHROME_PROFILE` di `.env`). Jedanya sengaja pelan supaya
  tidak diblokir, jadi satu putaran penuh bisa makan waktu berjam-jam. Semua tahap memakai cache
  di `pipeline/cache/` dan bisa dilanjutkan.
- `classify` memakai model AI lewat server lokal yang kompatibel dengan API OpenAI (`SHIM_URL`,
  `SHIM_TOKEN`, `SHIM_MODEL`; penulis memakai copilot-text-shim), hanya untuk kasus yang skornya
  ragu. Tanpa server itu, pakai `--no-ai` dan kasus ragu masuk daftar review di laporan.
- Setelah `export`, jalankan `npm run db:import`, periksa situsnya, lalu commit `data/`.

## Moderasi tanpa panel admin

Semua kiriman masuk sebagai isu GitHub dan diperiksa manual.

| Kiriman             | Tindakan                                                                                                                                                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Usulan tempat       | Tambahkan entri ke `pipeline/seed/kurasi.json` (key `kurasi:<domain>`; isi `query_maps` supaya listing Maps-nya ikut dicari), lalu jalankan `seed`, `maps`, `merge`, `enrich`, `classify`, `export`.                                                            |
| Koreksi data        | Tambahkan entri di `pipeline/overrides.json` dengan key `maps:<source_keys.google_fid>`, `osm:<tipe>/<id>`, `kurasi:<domain>`, atau domain website. Isinya `masuk`, dan opsional `jenis`, `nama`, `deskripsi`, `alasan`. Lalu jalankan `classify` dan `export`. |
| Cerita magang       | Tambahkan bukti `{"tipe": "pengalaman", "url": "<link isu>", "kutipan": "…", "tanggal": "YYYY-MM-DD"}` ke `magang_bukti` entri kurasinya. Status tempat menjadi "Terbukti".                                                                                     |
| Minta hapus / tutup | Override `"masuk": false`, lalu di server: `npm run db:sembunyikan -- <slug>`.                                                                                                                                                                                  |

`db:import` tidak pernah menghapus baris. Entri yang tidak ada lagi di JSON dilaporkan saat
import, lalu bisa disembunyikan sekaligus dengan `npm run db:sembunyikan -- --hilang`. Entri yang
disembunyikan tetap tersembunyi walau data diimpor ulang. Lihat daftarnya dengan
`npm run db:sembunyikan -- --daftar`, dan tampilkan lagi dengan `--tampilkan <slug>`.

## Deploy

Lihat [docs/deploy-vps.md](docs/deploy-vps.md): Ubuntu, Node, systemd, dan Caddy (HTTPS
otomatis). Tidak memakai Docker.

## Lisensi & atribusi

- Kode: [MIT](LICENSE).
- Data tempat dari OpenStreetMap © OpenStreetMap contributors, lisensi
  [ODbL 1.0](https://www.openstreetmap.org/copyright). Ubin peta © OpenStreetMap.
- Fakta bisnis publik dari Google Maps. Setiap entri menautkan balik ke listing aslinya. Proyek
  ini tidak berafiliasi dengan Google atau perusahaan mana pun yang tercantum.
