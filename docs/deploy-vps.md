# Deploy ke VPS Ubuntu

Situs ini berupa satu proses Node (SvelteKit adapter-node) dengan satu file SQLite. Tidak
memakai Docker. Panduan ini ditulis untuk Ubuntu 22.04/24.04 dengan Caddy sebagai reverse proxy
dan HTTPS otomatis. RAM 1 GB sudah cukup; bila `npm run build` terhenti karena kehabisan memori,
tambahkan swap.

## 1. Paket dasar

- Node.js 22 LTS atau 24 LTS dari [NodeSource](https://github.com/nodesource/distributions).
- `git`. Pasang juga `build-essential python3` bila `npm ci` gagal mem-build `better-sqlite3`
  (biasanya tidak perlu karena ada binary siap pakai).
- Caddy dari [repo resminya](https://caddyserver.com/docs/install#debian-ubuntu-raspbian).
- Firewall:

```sh
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp
sudo ufw enable
```

## 2. User, kode, dan konfigurasi

```sh
sudo useradd --system --create-home --home-dir /home/magang --shell /usr/sbin/nologin magang
sudo git clone https://github.com/devnolife/magang-it-sulsel.git /opt/magang-it-sulsel
sudo chown -R magang:magang /opt/magang-it-sulsel
sudo install -d -o magang -g magang /var/lib/magang-it-sulsel

cd /opt/magang-it-sulsel
sudo -u magang cp .env.example .env
sudo -u magang nano .env
```

Isi `.env` minimal:

```ini
DATABASE_PATH=/var/lib/magang-it-sulsel/app.db
ORIGIN=https://magang.example.com
# opsional, tampil publik untuk yang tidak punya akun GitHub
# PUBLIC_KONTAK_EMAIL=
```

`ORIGIN` wajib sama persis dengan alamat publik (termasuk `https://`). Nilai ini dipakai untuk
canonical, sitemap, dan pemeriksaan origin. Variabel pipeline (`SHIM_*`, `CDP_PORT`) tidak
dipakai di server.

## 3. Build dan isi database

```sh
sudo -u magang npm ci
sudo -u magang npm run build
sudo -u magang npm run db:import
```

## 4. Layanan systemd

```sh
sudo cp deploy/magang-it-sulsel.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now magang-it-sulsel
curl -sI http://127.0.0.1:3000 | head -n 1     # HTTP/1.1 200 OK
journalctl -u magang-it-sulsel -f               # log
```

## 5. Caddy

```sh
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile                  # ganti magang.example.com
sudo systemctl reload caddy
```

Belum punya domain? Pakai `<ip-dengan-tanda-hubung>.sslip.io` (mis. `203-0-113-10.sslip.io`)
di Caddyfile dan di `ORIGIN`. Caddy akan tetap mengambil sertifikat HTTPS.

Uji dari laptop: `npm run smoke -- https://magang.example.com`.

## Memperbarui

Setelah data atau kode baru di-push:

```sh
cd /opt/magang-it-sulsel
sudo -u magang git pull
sudo -u magang npm ci
sudo -u magang npm run build
sudo -u magang npm run db:import
sudo systemctl restart magang-it-sulsel
```

`db:import` tidak menghapus baris dan tidak mengubah entri yang disembunyikan. Bila import
melaporkan entri yang tidak ada lagi di JSON, sembunyikan dengan
`sudo -u magang npm run db:sembunyikan -- --hilang`.

## Menyembunyikan entri (minta hapus)

```sh
sudo -u magang npm run db:sembunyikan -- <slug>
sudo -u magang npm run db:sembunyikan -- --daftar
sudo -u magang npm run db:sembunyikan -- --tampilkan <slug>
```

Perubahan langsung berlaku tanpa restart. Supaya entrinya juga hilang dari dataset, tambahkan
override `"masuk": false` di `pipeline/overrides.json` (lihat README).

## Cadangan

Isi database bisa dibangun ulang dari `data/companies.json` dengan `db:import`. Satu-satunya
yang tidak ikut adalah daftar entri tersembunyi, jadi catat hasil
`npm run db:sembunyikan -- --daftar` atau salin file DB-nya sesekali (butuh paket `sqlite3`):

```sh
sudo -u magang sqlite3 /var/lib/magang-it-sulsel/app.db ".backup '/home/magang/app-$(date +%F).db'"
```
