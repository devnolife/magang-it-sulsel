# magang-it-sulsel

Direktori perusahaan dan instansi yang punya unsur **informatika** di **Sulawesi Selatan**:
software house, konsultan IT, ISP, digital agency, startup/coworking, serta instansi dengan unit TIK.
Mahasiswa bisa mencari tempat magang, melihat kontak (WA, telepon, email, website, Maps), dan berbagi
pengalaman magang.

> README lengkap (fitur, cara pakai, pipeline data, kontribusi, lisensi data) sedang ditulis.

## Mulai cepat

```bash
npm install
cp .env.example .env          # isi SESSION_SECRET, IP_HASH_SALT, ADMIN_PASSWORD_HASH
npm run db:import -- tests/fixtures/companies.sample.json
npm run dev
```

Lisensi kode: MIT. Data peta © OpenStreetMap contributors (ODbL).
