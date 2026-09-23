# AGENTS.md — magang-it-sulsel

Direktori perusahaan & instansi berunsur informatika di Sulawesi Selatan untuk mahasiswa
yang mencari tempat magang. Dua bagian dalam satu repo:

| Bagian                                                       | Lokasi             | Jalan di          |
| ------------------------------------------------------------ | ------------------ | ----------------- |
| Pipeline data (scrape Maps + OSM + website + klasifikasi AI) | `pipeline/`        | laptop maintainer |
| Web SvelteKit (adapter-node + SQLite)                        | `src/`, `scripts/` | VPS Ubuntu        |

Kontrak di antara keduanya: `data/companies.json` (divalidasi `src/lib/shared/company-schema.js`).
Usulan, koreksi, dan cerita magang masuk lewat formulir GitHub Issues (`.github/ISSUE_TEMPLATE/`,
URL dibuat `src/lib/isu.js`); belum ada formulir web maupun panel admin.

## Perintah

```bash
npm install
npm run dev                 # web lokal (DB: ./var/app.db)
npm run db:import           # upsert data/companies.json -> SQLite
npm run db:import -- tests/fixtures/companies.sample.json   # data contoh
npm run check && npm run lint && npm test && npm run build
npm start                   # jalankan hasil build (port 3000)
npm run smoke -- http://127.0.0.1:3000   # uji asap terhadap server yang berjalan
npm run db:sembunyikan -- <slug>...      # sembunyikan entri (--tampilkan, --hilang, --daftar)
npm run pipeline -- <geo|seed|maps|osm|merge|detail|enrich|classify|export|all> [--kab makassar] [--limit N] [--no-ai]
```

## Konvensi

- JavaScript + JSDoc (bukan TypeScript), Svelte 5 runes, CSS biasa dengan variabel tema.
- `src/lib/shared/` = modul murni yang dipakai app **dan** script Node: hanya import relatif,
  jangan pakai `$lib`/`$env` di sana.
- `src/lib/server/db/open.js` juga dipakai script Node — jangan import `$env` di situ.
  Hanya `src/lib/server/db/index.js` yang membaca `$env/dynamic/private`.
- Migrasi DB = array SQL di `src/lib/server/db/migrations.js` (supaya ikut ter-bundle); tambahkan
  entri baru, jangan ubah entri lama.
- Import tidak pernah menimpa `locked_fields`, tidak mengubah `hidden`, dan tidak menyentuh
  perusahaan `origin = 'mahasiswa'`.
- Chrome pipeline memakai port **9335** + profil `~/.magang-it-sulsel/chrome-profile`
  (9333 = Hunter karirku, 9334 = jev-ultrafast). Scraper berhenti otomatis bila Google menampilkan
  captcha — jangan dipaksa.
- Klasifikasi AI memakai `copilot-text-shim` (`SHIM_URL`); jalankan `npm start` di
  `WraftWork/copilot-text-shim` sebelum `pipeline classify`. Bila shim mati, kasus ragu masuk
  daftar review manual (`data/laporan-pipeline.md`).
- `pipeline/overrides.json` selalu menang atas aturan & AI.
- UI dan teks berbahasa Indonesia.

## Aturan git

- JANGAN sertakan trailer "Co-authored-by: Copilot" di commit message.
- Jangan commit `.env`, `var/`, `pipeline/cache/`.
