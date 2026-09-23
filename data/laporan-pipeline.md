# Laporan pipeline

Dibuat otomatis oleh `npm run pipeline -- export` pada 2026-09-23T09:49:52.165Z. Baca laporan ini sebelum
meng-commit `data/companies.json`. Koreksi klasifikasi lewat `pipeline/overrides.json`, lalu jalankan
ulang `classify` dan `export`.

## Ringkasan

| Tahap | Jumlah |
|---|---|
| Tempat Google Maps | 2831 |
| Tempat OpenStreetMap | 36 |
| Kandidat setelah dedupe | 2706 |
| Dibuang saat merge | tutup-permanen: 20, di-luar-sulsel: 39, alamat-saja: 3 |
| Seed cocok dengan tempat | 69 |
| Website dicek | 461 (aktif 365, mati 91, dibajak 2, tidak-ada 3; tidak bisa dicek 65) |
| Kasus ragu → AI | 150 (jawaban baru 1, tersimpan 149, gagal 0) |
| Perlu review manual | 0 |
| **Masuk direktori** | **655** (id dipakai ulang 655) |

## Keputusan per metode

| Metode | Masuk | Tidak masuk |
|---|---|---|
| manual | 73 | 11 |
| ai | 46 | 104 |
| aturan | 536 | 1936 |

## Isi direktori

| Jenis | Jumlah |
|---|---|
| Software house & aplikasi | 286 |
| Digital agency & kreatif | 140 |
| ISP & telekomunikasi | 106 |
| Instansi & divisi IT | 62 |
| Konsultan IT & jaringan | 41 |
| Startup & coworking | 20 |

| Kab/kota | Jumlah |
|---|---|
| Kota Makassar | 384 |
| Kabupaten Gowa | 61 |
| Kabupaten Maros | 24 |
| Kabupaten Luwu Timur | 20 |
| Kabupaten Pinrang | 20 |
| Kabupaten Wajo | 13 |
| Kabupaten Bone | 12 |
| Kabupaten Luwu | 11 |
| Kota Parepare | 11 |
| Kabupaten Bulukumba | 10 |
| Kabupaten Soppeng | 10 |
| Kabupaten Luwu Utara | 9 |
| Kabupaten Jeneponto | 8 |
| Kota Palopo | 8 |
| Kabupaten Takalar | 8 |
| Kabupaten Sidenreng Rappang | 7 |
| Kabupaten Sinjai | 7 |
| Kabupaten Pangkajene dan Kepulauan | 6 |
| Kabupaten Kepulauan Selayar | 6 |
| Kabupaten Tana Toraja | 5 |
| Kabupaten Toraja Utara | 5 |
| Kabupaten Bantaeng | 4 |
| Kabupaten Enrekang | 4 |
| Kabupaten Barru | 2 |

| Status magang | Jumlah |
|---|---|
| Belum diketahui | 647 |
| Ada indikasi menerima magang | 8 |

| Status website | Jumlah |
|---|---|
| tidak-ada | 317 |
| aktif | 268 |
| mati | 69 |
| dibajak | 1 |

Kontak: telepon 566, WhatsApp 474, email 98, website 338, Instagram 116, halaman karir 31, tanpa kontak sama sekali 61.

## Perlu review (ragu, belum diputuskan AI) — 0

Tidak masuk direktori sampai diputuskan AI (jalankan shim lalu `classify`) atau lewat overrides.json.

_(tidak ada)_

## Masuk lewat AI — 46 (cek acak)

- Jasa Digital Marketing Makassar (Makassar) · agency · AI: Jasa pemasaran digital, cocok untuk magang IT · `maps:0x114273de14cc959:0xb98edc26af48b4f2`
- PT. (FALL) Developement and IT Group (Luwu Timur) · software · AI: Kelompok pengembangan dan IT · `maps:0x2d90630063e21d8d:0x238df0f352ffe02e`
- Anak Agency (Luwu Utara) · agency · AI: Jasa pembuatan website & SEO · `maps:0x2d91798ad2326831:0x377ae7da9470551d`
- Desain Logo Terbaik \| BackroomID (Luwu Timur) · agency · AI: Perancang grafis/desain logo, kreatif digital · `maps:0x2d91b5cd285ff3f7:0x32e0cad0f140f9`
- BASECAME GEOINFOTECH.ID ENREKANG (Enrekang) · software · AI: Perusahaan geoinformatika/teknologi · `maps:0x2d9441319e44e5ed:0x46dd13d04598bb0a`
- Indonesia Digital Marketing (Pinrang) · agency · AI: Jasa pemasaran digital · `maps:0x2d94491a35cd02c5:0x1b30340c833bfd9`
- Insoul Studio (Wajo) · agency · AI: Studio desain grafis/konten kreatif · `maps:0x2d95e797660f6099:0xf76f721fa0d64143`
- Jasa Web (Wajo) · agency · AI: Jasa pembuatan web · `maps:0x2d95e7b823dfc9d5:0xb4d0741f92b2d01d`
- Iguchi IT (Wajo) · konsultan · AI: Layanan IT · `maps:0x2d95e7eafaeaeb39:0xef99f11d13018ece`
- Mario Webs (Soppeng) · agency · AI: Jasa pembuatan web · `maps:0x2d95eb695916e1ad:0xa6b8f127b4561cea`
- anunnaianu (Kepulauan Selayar) · agency · AI: Perancang grafis/konten kreatif · `maps:0x2dba35662f28e885:0x83f2cdc8127fd9f1`
- artWork indonesia (Kepulauan Selayar) · agency · AI: Perancang grafis/konten kreatif · `maps:0x2dba35c8ab08ae6f:0x978640583a47ffa6`
- Sobat Jasa ID (Bulukumba) · agency · AI: Agensi desain, solusi kreatif & digital · `maps:0x2dbc0f1409ccb47d:0x2f72846b95bb315e`
- SRS DESIGN (Sinjai) · agency · AI: Perancang grafis/konten kreatif · `maps:0x2dbc27e9758ce5bb:0x7f1a0d95dfce1a08`
- FPLS Software (Soppeng) · software · AI: Jasa pembuatan website profesional · `maps:0x2dbe1d0054672883:0x7e28762f3690285e`
- IRM DESIGN (Bulukumba) · agency · AI: Perancang grafis/konten kreatif · `maps:0x2dbeab2d21481989:0x38c1d30d1b46cb1f`
- Codeinkamu - Jasa Instalasi Jaringan & IT Solution Makassar (Gowa) · konsultan · AI: Solusi IT, jaringan, & pembuatan website · `maps:0x2dbee193288b4125:0xce5299ae24550794`
- GID Artwork Studio (Makassar) · agency · AI: Perancang grafis/konten kreatif · `maps:0x2dbee27c404f4cdb:0xa5186eeefa08c15e`
- Fairtech Digital Indonesia (Gowa) · agency · AI: Creative technology & digital marketing · `maps:0x2dbee30b1da29a65:0xbeef2b570ba06090`
- Digisaurus Digital Transformation Company (Makassar) · konsultan · AI: Konsultan transformasi digital · `maps:0x2dbee333224e3a91:0x8f84a660da82004d`
- creasita CV. Creative Synergy Khatulistiwa (Makassar) · agency · AI: Agensi kreatif/periklanan · `maps:0x2dbee33a667c7fed:0xf952db63550cdac3`
- Klinik Konsultasi IT AIMP (Makassar) · konsultan · AI: Klinik konsultasi IT · `maps:0x2dbee33c076e29cf:0x9b92c1fe36bdaef6`
- Titik Mula Creative (Makassar) · agency · AI: Agensi kreatif/pemasaran digital · `maps:0x2dbee33df1ecb2bd:0xfc65de4d2feed65`
- mks.web.id (Makassar) · agency · AI: Jasa web/pemasaran digital · `maps:0x2dbee3600a353d53:0x164ada30ce017060`
- Jasa Digital Marketing ARN (Gowa) · agency · AI: Jasa pemasaran digital · `maps:0x2dbee37521942881:0x8fd6adbcca23be0e`
- Indonesia Digital Marketing (Makassar) · agency · AI: Jasa pemasaran digital · `maps:0x2dbee379d7d0263d:0xeba50077db9641ee`
- DIGITAL PARTNER MEDIA (Makassar) · agency · AI: Agensi media digital · `maps:0x2dbee387e0ad79c9:0xd26f34a957ae7b12`
- TIRTA MAHARDHIKA UTAMA (Makassar) · konsultan · AI: Konsultan IT, jasa website & sistem informasi · `maps:0x2dbee38a101fa873:0x311f0692d228de67`
- SKENA WAHANA KREATIF (Makassar) · agency · AI: Digital creative marketing agency · `maps:0x2dbee3958a53b287:0xc00edcc0eb565863`
- Aplikapedia Teknologi (Makassar) · software · AI: IT software solution · `maps:0x2dbee3f248e3d6b9:0x31152b2f74b16976`
- Catalist Creative (Makassar) · agency · AI: Agensi kreatif/pemasaran digital · `maps:0x2dbee3f6c6923c0b:0x37d9d4d44b28c4ce`
- PT. Digikreatif Teknologi Indonesia (Makassar) · agency · AI: Digikreatif, agensi kreatif digital · `maps:0x2dbee3f95c5ce1ed:0xa4d14d4087fe8542`
- Jasa Pembuatan Website UMKM Makassar Dan Sekitarnya (Makassar) · agency · AI: Jasa pembuatan website UMKM · `maps:0x2dbee5c506967319:0xba4db54aae013fff`
- Arkana Digital (Maros) · agency · AI: Agensi pemasaran digital · `maps:0x2dbef981a5ae3dbb:0xa8fa063cfe7e341b`
- PT. Dimas Prakoso Digital \| Digital Marketing Makassar (Makassar) · agency · AI: Agensi pemasaran digital · `maps:0x2dbefbe273782891:0x47a4f71c7d174b81`
- jasa desain dan iklan marketing digital (Makassar) · agency · AI: Jasa desain & pemasaran digital · `maps:0x2dbefbe7ebe02da7:0x85549e3b9096aef1`
- Aburaka digital studio (Makassar) · agency · AI: Studio/agensi pemasaran digital · `maps:0x2dbefbe7f90fea17:0xdd764b3de850a25e`
- Excitech Digital Marketing Agency (Makassar) · agency · AI: Agensi pemasaran digital · `maps:0x2dbefbec7b2199ff:0x69b966b549920129`
- Beranda Creative (Makassar) · agency · AI: Agensi kreatif/pemasaran · `maps:0x2dbefd1dcaa7d457:0x6e79abe2591c004`
- AI Center of Excellence Makassar (Makassar) · startup · AI: Pusat inovasi/teknologi AI · `maps:0x2dbefd4abfff9b79:0x3182e9145b02233e`
- AIMMETRIX Simulator Training VR (Makassar) · software · AI: Pengembang aplikasi simulator VR · `maps:0x2dbefd825d2cc3d3:0x3d212d413e9e8a95`
- PT FIBER NETWORKS INDONESIA BRANCH MAKASSAR (Makassar) · isp · AI: Penyedia jaringan fiber, kantor cabang · `maps:0x2dbf1d006ffd2aeb:0xd1ace3e2fe84db32`
- PT. HND Gemilang Solusindo (HGS) (Makassar) · konsultan · AI: Perusahaan solusi IT · `maps:0x2dbf1d7ee174c6bf:0x88483aea371f4efa`
- Ihsan Digital Marketing (Takalar) · agency · AI: Jasa pemasaran digital · `maps:0x2dbf2166862e2b73:0x154dcb321798165e`
- Bahkan Digital (Makassar) · agency · AI: Agensi pemasaran digital · `maps:0xa32a0db7bcaa320d:0xeb963e88e3d1b8de`
- Social Hive - Digital Marketing Agency (Toraja Utara) · agency · AI: Agensi pemasaran digital · `maps:0xa9349fcc11da7e41:0xc205d7793d7abec3`

## Ditolak AI — 104

- PT. Indo Energy Solutions HUB Sulawesi (Luwu Timur) · AI: Perusahaan energi, bukan informatika · `maps:0x2d90fb97a4bdde91:0xb10f7aff901a28be`
- BITOPAY DIGITAL INDONESIA (Palopo) · AI: Konsultan keuangan, usaha tidak jelas IT · `maps:0x2d91592b8736c69d:0x4b2dd6b7b1037425`
- GraPARI Telkomsel Palopo (Palopo) · AI: Gerai operator seluler, bukan kantor ISP · `maps:0x2d915f20f4e1f807:0x35e92207cfb6f54a`
- Palopo Digital (Palopo) · AI: Jasa rekaman video · `maps:0x2d915fc9f48be759:0x84a272a9f3204547`
- CV. Alfajril Multimedia (Palopo) · AI: Multimedia, usaha tidak jelas · `maps:0x2d91603f018a8479:0x6f8e2f2082bda203`
- Qeenan Computer (Luwu Utara) · AI: Nama Computer, indikasi toko komputer · `maps:0x2d917f65fc64c4a3:0x3fac3a53f4015b46`
- CV. Creative Land (Luwu Utara) · AI: Usaha tidak jelas · `maps:0x2d918563b0cee941:0x229deb2590f1cf41`
- TRIMEDIA VISION NETWORK (Luwu Utara) · AI: ISP kecil, kemungkinan RT/RW net · `maps:0x2d91a025c01b226d:0x722e1b8d740d8789`
- AHZA Multimedia (Luwu Timur) · AI: Multimedia, usaha tidak jelas · `maps:0x2d91b414593cfa1f:0xdf916fc837f8f3a0`
- NasionalDigital (Toraja Utara) · AI: Data minim, usaha tidak jelas · `maps:0x2d93e9e5f021f979:0xa0b5527762e203a1`
- Bisnis Digital (Toraja Utara) · AI: Blog bisnis, usaha tidak jelas · `maps:0x2d93ebd611eb9fe9:0x3245b2411c95e6ca`
- Software & Hardware Bergaransi (Enrekang) · AI: Toko software & hardware komputer · `maps:0x2d940d1ca740f185:0xfb8462dbf7b31653`
- Ally Creative Advertising (Pinrang) · AI: Advertising/reklame · `maps:0x2d944cfe08274caf:0x982a25aa38271992`
- AISYAH CELL PINRANG (Pinrang) · AI: Konter pulsa/HP · `maps:0x2d944d5b6af833f7:0x699988f932a03b7c`
- PT KREASI DIGITAL MANAGEMENT (Pinrang) · AI: Usaha tidak jelas · `maps:0x2d944d94c4b8d239:0xc5fe217fe68193a0`
- MALINDO NETWORK (Pinrang) · AI: ISP kecil, kemungkinan RT/RW net · `maps:0x2d944f15fb30385d:0xcc002cd33408130e`
- Network town (Barru) · AI: Operator seluler kecil, bukan ISP kantor · `maps:0x2d95913049d8c321:0xc6b47a0733c1f23b`
- GraPARI Telkomsel Parepare (Parepare) · AI: Gerai operator seluler · `maps:0x2d95bb5d8d31fabb:0x2c3a06ff61b0fff9`
- Emperor Gaming Parepare (Parepare) · AI: Gaming/game center, bukan software · `maps:0x2d95bbbc972beb83:0x9388f5aa81e5fc8d`
- Kreator Digital (content creator) (Sidenreng Rappang) · AI: Content creator perorangan · `maps:0x2d95c9c1130e480d:0x7ee8470309a1a7`
- Blend Project Multimedia – Jasa Live Streaming Sidrap (Sidenreng Rappang) · AI: Jasa live streaming/rekaman video · `maps:0x2d95cb2c2a2d33c3:0x9ec5074b1fc12bf1`
- HILTON CELL (Sidenreng Rappang) · AI: Konter pulsa/HP · `maps:0x2d95ce5246226c23:0x308f87f1a26c569b`
- Azizah Cell (Wajo) · AI: Konter pulsa/HP · `maps:0x2d95e71d3e29112b:0x6647f983f708a28`
- Bugis Creative (Wajo) · AI: Usaha tidak jelas · `maps:0x2d95e76708760b43:0x92c05029ddbc0f7`
- GraPARI Wajo (Wajo) · AI: Gerai operator seluler · `maps:0x2d95e790ef908db5:0x7b50f89456d62a0b`
- P21news (Soppeng) · AI: Media/berita, bukan informatika · `maps:0x2d95f74574d406cd:0x686e5778a40838d8`
- Pt. Cyber Ghost Company (Soppeng) · AI: Usaha tidak jelas · `maps:0x2d95f93e42542233:0x79495028acf2ca8e`
- PT. BELOPA KREATIF INDONESIA (Luwu) · AI: Perusahaan media, usaha tidak jelas · `maps:0x2d96bbefa4cc8025:0xe940827b6e34085e`
- PT. GMK (GUSNA MEDIA KARYA) (Jeneponto) · AI: Perusahaan TV kabel · `maps:0x2db9377577f2a149:0x6383d44eb79c3ad0`
- PT. BASIC (PERSERODA) (Bantaeng) · AI: BUMD jaringan bisnis, bukan IT · `maps:0x2db955764d67b9ab:0x51c51d95c0d7e1cf`
- Demufaray Digital Studio (Kepulauan Selayar) · AI: Data minim, usaha tidak jelas · `maps:0x2dba35004961338b:0xcb115a5ae44046c6`
- Teknisi CCTV & jaringan Bulukumba TANGKALAYA JASA TECH 081355800966 (Bulukumba) · AI: Jasa pasang CCTV & instalasi keamanan · `maps:0x2dbbff00003fd16d:0x302c01e188f0eff4`
- AM Digital Works ID (Sinjai) · AI: Kategori pendidik, usaha tidak jelas · `maps:0x2dbc23466ca1c767:0xebd8effafff6f837`
- TeknoHub Digital Media (Sinjai) · AI: Perusahaan media/blog pribadi · `maps:0x2dbc25be4e3ccfe3:0x114e6990799cd912`
- Fast Computer (Sinjai) · AI: Toko/servis komputer · `maps:0x2dbc25df650ff993:0xd49efe1472552f74`
- CV.Sulona Digital Media (Bone) · AI: Data minim, usaha tidak jelas · `maps:0x2dbde5000e10ccef:0x7b07281679208bf2`
- Code Pixel Academy (Bone) · AI: Academy/kursus, indikasi tempat belajar · `maps:0x2dbde5036f9c5079:0x975838d92b1dd2bb`
- Bone Terkini (Bone) · AI: Situs berita/media · `maps:0x2dbde52ee68dacdf:0xfabd0be5baa32e0f`
- Usaha Mario Computer (Bone) · AI: Toko/servis komputer · `maps:0x2dbde57a73b90557:0xcaa89ed259ef1e36`
- PT BEST BANDUNG ECO SINERGY TECHNOLOGY (Bone) · AI: Telemarketing, bukan informatika · `maps:0x2dbde598816375ad:0xa8d9d66c1a88e749`
- XYKING STORE (Barru) · AI: Reseller panel sosmed, toko online · `maps:0x2dbe259ca7b582c3:0x10890b7457930a87`
- STUDIO CREATIVE INDONESIA (Pangkajene dan Kepulauan) · AI: Data minim, usaha tidak jelas · `maps:0x2dbe4f307f6995fb:0xe9f5ed47ff276b61`
- RAJA BUANA CELL (Pangkajene dan Kepulauan) · AI: Konter pulsa/HP · `maps:0x2dbe4f57de366383:0xb0c5c9c7a48610e9`
- El Digital Foundation (Pangkajene dan Kepulauan) · AI: Yayasan/penerbit buku · `maps:0x2dbe51a89fbee0d9:0x7792d49977d33951`
- Yulia putri Cell (Pangkajene dan Kepulauan) · AI: Konter pulsa/HP · `maps:0x2dbe51c6cba2d9e1:0x88764bfd581f6f73`
- Mini Grapari Telkomsel Bantaeng (Bantaeng) · AI: Gerai operator seluler · `maps:0x2dbeb2b7bfc909af:0x2e0d61a740e001c2`
- SYASYA tech (Bantaeng) · AI: Data minim, usaha tidak jelas · `maps:0x2dbeb3d46d47a28b:0xe9d5532f62d3dcb5`
- Nukes" Internet (Gowa) · AI: ISP kecil/warnet, kemungkinan RT/RW net · `maps:0x2dbee22ed5186f2b:0x282dcaaa2e8af252`
- Sinar Komputer Makassar(SKom) (Makassar) · AI: Toko/servis komputer · `maps:0x2dbee25c1be1b659:0x954abd8e01a3ff81`
- GraPARI Makassar (Makassar) · AI: Gerai operator seluler · `maps:0x2dbee28e3ddeef33:0xf534a3216f052fe9`
- 32 Media Digital (Makassar) · AI: Biro iklan, data minim · `maps:0x2dbee2900ac0b241:0x2d1aff6cadb68398`
- Sistekom (Makassar) · AI: Layanan/servis komputer · `maps:0x2dbee290a0ea375b:0xe52ec14a38bfb1fe`
- Tapala Group Notebook-Computer (Makassar) · AI: Toko komputer/notebook · `maps:0x2dbee2a82e66aef5:0x2f900079f6ed5cde`
- Mujur Jaya Komputer (Makassar) · AI: Toko/servis komputer · `maps:0x2dbee2be1f64a9c1:0xaa554b639a5f2950`
- Dealer Quran Pad (Makassar) · AI: Dealer produk tablet Quran · `maps:0x2dbee2d097256a17:0x5ce0d59c63e7e1f3`
- Media Digital Kreasi (Makassar) · AI: Jasa editing video · `maps:0x2dbee2fa650a69c3:0x28fba98c6365401e`
- Head Quarter Menang Creative (Makassar) · AI: Data minim, usaha tidak jelas · `maps:0x2dbee30005f8a891:0x9a9078eaa4b8ea2c`
- R & D Indonesia Micro System (Makassar) · AI: Data minim, usaha tidak jelas · `maps:0x2dbee316645b1abb:0x6371a27e6045526d`
- Iskandar Komputer (Makassar) · AI: Toko/servis komputer · `maps:0x2dbee3175013f8c5:0x4f10d20e52acf76f`
- Grapari sudiang Makassar (Makassar) · AI: Gerai operator seluler · `maps:0x2dbee3350d6c446f:0xa3f5c7a3a9c6678f`
- Live streaming Makassar Zona Creative Celebes (Makassar) · AI: Jasa live streaming/rekaman video · `maps:0x2dbee356f798ff81:0x48c440d5468d7c9a`
- Gheo Tech Jual CCTV Canggih dan Murah. (Makassar) · AI: Jual CCTV · `maps:0x2dbee362f3d1fd09:0x6b92c0f18f797e9e`
- PT. Grocee Teknologi Indonesia (Makassar) · AI: Data minim, usaha tidak jelas · `maps:0x2dbee36ac2fdf43b:0x4b9cd834eda42a74`
- CV Berkah Cipta Sarana (Makassar) · AI: Jasa pemetaan/survei · `maps:0x2dbee37341afe477:0x679583a3ee6e35c9`
- LAYANAN INTERNET (Makassar) · AI: ISP kecil generik, kemungkinan RT/RW net · `maps:0x2dbee37a7153e2dd:0xc53bee09ebbc3142`
- Andalan Coffee & Space By Digas (Makassar) · AI: Coworking/kafe, bukan bertema teknologi jelas · `maps:0x2dbee37db904c2f3:0x527e116bc096299c`
- Wandiundiu Computer, Ltd (Makassar) · AI: Nama Computer, indikasi toko komputer · `maps:0x2dbee38d5b6363ad:0x3dba1d64e86bde36`
- PT EVITA MANDIRI TELECON (EVITEL) (Makassar) · AI: Kontraktor/pemasok peralatan telekomunikasi · `maps:0x2dbee3af9e22660f:0x5a21e54f43b9c4fd`
- PT.TIMOER INDONESIA DJAYA (Makassar) · AI: Usaha tidak jelas · `maps:0x2dbee3b4fe524ad3:0xcd40869c9402d202`
- Deanra Digital Kolaborasi Media (Makassar) · AI: Biro iklan, data minim · `maps:0x2dbee3b699eb8175:0xc95b68076abf66d0`
- Hello, Apple Authorized Reseller - Perintis Kemerdekaan Makassar (Makassar) · AI: Reseller produk Apple · `maps:0x2dbee3b98be3e591:0xdefa8a7886175280`
- PT. AMPERATECH SOLUSINDO GLOBAL (Makassar) · AI: Data minim, usaha tidak jelas · `maps:0x2dbee3be74562495:0xe22ea37c78fa6e85`
- Klik Case Makassar (Makassar) · AI: Toko aksesori HP · `maps:0x2dbee3cfef7ea801:0x374ece7f0deacf65`
- Amanah Digital Studio (Makassar) · AI: Jasa editing video · `maps:0x2dbee3e881aab957:0xd60b7b2f1024e535`
- Smartronik Makassar (Makassar) · AI: Pemasok sistem keamanan/CCTV · `maps:0x2dbee3eed009ee77:0x30190b1e46c661d2`
- HYDRATECH CCTV dan GPS TRACKER Makassar (Makassar) · AI: Pemasok CCTV & GPS tracker · `maps:0x2dbee3f46b55158b:0x7fc474f4986515cf`
- Eka Sari Computer Persada. CV (Makassar) · AI: Toko/servis komputer · `maps:0x2dbee4af04917c5d:0x6d0a1ceca4d235d6`
- CV Katoang Digital Indonesia (Gowa) · AI: Data minim, usaha tidak jelas · `maps:0x2dbee59ce86d17af:0xc7bbfbd00dc8c718`
- inisiasi digital space (Maros) · AI: Data minim, usaha tidak jelas · `maps:0x2dbef96eb2a6f013:0xcd53c28ce909a14d`
- Balai Perbenihan Tanaman Hutan Wilayah II (Makassar) · AI: Balai kehutanan, bukan unit TIK · `maps:0x2dbefb86c4c40001:0xb1b80a9dce8a800d`
- SUN Office (Makassar) · AI: Usaha tidak jelas · `maps:0x2dbefb91794876eb:0x5c53785073491503`
- Kamar Komputer (Makassar) · AI: Toko/servis komputer · `maps:0x2dbefc6ae0c9974f:0xcd1d9c9e56fb3ba0`
- Stones Computer (Makassar) · AI: Toko/servis komputer · `maps:0x2dbefca0f54a2659:0xd0beadba50b91083`
- NinoMedia - Percetakan Di Makassar (Makassar) · AI: Usaha inti percetakan · `maps:0x2dbefcab82d7b71b:0xa94dc872192b2c3a`
- ZTE XL SMART MAKASSAR (Makassar) · AI: Pemasok peralatan telekomunikasi · `maps:0x2dbefd003443352b:0xc6dbd881f33993f3`
- GLOBAL PULSA (Makassar) · AI: Server pulsa · `maps:0x2dbefd00505f0a31:0xf17d2d79be911b11`
- Jasa Digital Marketing (Makassar) · AI: Situs review gadget/afiliasi, usaha tidak jelas · `maps:0x2dbefd0b97acab91:0xfe2fc7d139bbd4ce`
- TemplatIn - Jual Template Spreadsheet Murah Siap Pakai (Makassar) · AI: Jual template, toko online · `maps:0x2dbefd484baf1543:0xf0e5b92d1e820ebc`
- PT. Media Surya Pratama (Makassar) · AI: Perusahaan TV kabel · `maps:0x2dbefd561c4a7b09:0xa7bb69a1095ed06`
- Sahabat Sampulo Infotama (Makassar) · AI: Data minim, usaha tidak jelas · `maps:0x2dbefded4982f757:0x2f3bfe713162613e`
- PT. Lumbung Buana Seluler (Makassar) · AI: Distributor/gerai seluler · `maps:0x2dbf02a4ddb42cf1:0x37ff1c29732358b5`
- M-Care Service Center Makassar (Makassar) · AI: Service center HP · `maps:0x2dbf02a61466aad3:0x11df915d1441b5a4`
- Voucher WIFI.ID # IndiHome (Makassar) · AI: Penjual voucher wifi/internet · `maps:0x2dbf02a789014b7f:0xc630f9625dd7aeb1`
- IT Service Centre \| Service Center Laptop Makassar (Makassar) · AI: Service center laptop/komputer · `maps:0x2dbf02a902245633:0x54ed596f94efb604`
- Gerai IM3 Graha Slamet Riyadi (Makassar) · AI: Gerai operator seluler · `maps:0x2dbf02b2bfffffff:0xfdd1fc664f687a43`
- Blibli Store - Trans Studio Mall Makassar (Makassar) · AI: Toko ritel/marketplace · `maps:0x2dbf1d141d776335:0xf70c5a3e6f18842a`
- De.doea Workspace (Makassar) · AI: Workspace, tidak bertema teknologi jelas · `maps:0x2dbf1d5f99238457:0x9ee02e572ecfd92f`
- Sistek Computer (Makassar) · AI: Toko/servis komputer · `maps:0x2dbf1d6232b69f23:0x91bd871dc0494ea7`
- PT. ARCI PRATAMA KONSULTAN (Makassar) · AI: Konsultan konstruksi · `maps:0x2dbf1d7cfbbfc963:0x449d4b8e50e320be`
- Astro Media Komputindo. CV (Makassar) · AI: Indikasi toko komputer · `maps:0x2dbf1ddc9bbd030b:0x3b810d984d233924`
- HJR Machine Digital Advertising (Takalar) · AI: Digital advertising/reklame, data minim · `maps:0x2dbf1f0055557163:0xbcf81435e5092346`
- Cv.Soe Multi Digital (Gowa) · AI: Data minim, usaha tidak jelas · `maps:0x2dbf2716feee5733:0x72ac64b0454760b7`
- DeanRA Digital Kolaborasi (Makassar) · AI: Data minim, usaha tidak jelas · `maps:0xa4bb825c7b603b49:0x44e61364c55784c`
- CV Malili Mitra Solusi (Luwu Timur) · AI: Usaha tidak jelas · `osm:way/602238225`

## Masuk lewat aturan dengan skor mepet (4–5) — 74

Kategori seperti "Layanan dan Dukungan Komputer" kadang berisi toko/servis; tolak lewat overrides.json bila perlu.

- CV. Media Data IT (Luwu Timur) · agency · skor 4 · kategori Kantor Perusahaan 0; nama: data +2, it +2 · `maps:0x2d90584c1d6fd83d:0xcc8b159b32c6608d`
- CV.MALILI TEKNO KOMPUTER (Luwu Timur) · konsultan · skor 5 · kategori Konsultan Komputer +6; nama: tekno +2, komputer −3 · `maps:0x2d90586155555555:0x13eda756d46c30c1`
- ZHAKY KREATIF VISUAL (Luwu Timur) · agency · skor 4 · kategori Konsultan media +2; nama: kreatif +2 · `maps:0x2d90596e48edea31:0x53b255977e96e638`
- Towuti Digital Media (Luwu Timur) · konsultan · skor 5 · kategori Layanan dan Dukungan Komputer +3; nama: digital +2 · `maps:0x2d906321bc1e4ab3:0xfea605f60cd351fb`
- Ganta's Technology (Luwu Timur) · konsultan · skor 5 · kategori Layanan dan Dukungan Komputer +3; nama: technology +2 · `maps:0x2d906346c23aa933:0x8e829ae0f8028bb6`
- RichFD CREATIVE (Luwu Timur) · agency · skor 4 · kategori Perancang Grafis +2; nama: creative +2 · `maps:0x2d9067dcb3a4e639:0xb6ec1ca0f86bff3`
- Digital Kreatif Agensi (Palopo) · agency · skor 4 · kategori Kantor Perusahaan 0; nama: digital +2, kreatif +2 · `maps:0x2d915f00534fe4d1:0xcca77ce3c55fb66a`
- ydp Designs (Luwu Utara) · agency · skor 4 · kategori Agensi desain +4 · `maps:0x2d918164e9b077db:0x700294a5f889b6d3`
- Blureon (Pinrang) · agency · skor 4 · kategori Layanan Pemasaran Internet +4 · `maps:0x2d95ad3f07ec7789:0x69eb1453dc3e08fd`
- wanHEX Software House (Sidenreng Rappang) · software · skor 4 · kategori Kantor Perusahaan 0; nama: software +4 · `maps:0x2d95b70c75143549:0x36bd5f173399a902`
- Digiemdi Project - Undangan Website & Digital (Sidenreng Rappang) · agency · skor 4 · kategori Agensi desain +4; nama: website +2, digital +2, undangan −4 · `maps:0x2d95b75bc8f3c8f3:0xd422fcfd1ad31291`
- Rahfan Software Developer (Sidenreng Rappang) · software · skor 5 · kategori Toko Software Komputer −3; nama: software +4, developer +4; website +2 · `maps:0x2d95b7d825b8601b:0x810d1ca68c338eb8`
- AIRA Studio \| Logo Design (Wajo) · agency · skor 4 · kategori Agensi desain +4 · `maps:0x2d95cf2c4eede80f:0xcb3761e4f0821ebc`
- CV. Digital Technology Indonesia (Wajo) · software · skor 4 · kategori Konsultan 0; nama: digital +2, technology +2 · `maps:0x2d95e7f80f44224f:0x3086de7198cc21bf`
- Mariana Presentation Designer (Soppeng) · agency · skor 4 · kategori Agensi desain +4 · `maps:0x2d95eb46a374c24d:0x2a83d7dc19688423`
- Belopa Website Provider (Luwu) · konsultan · skor 5 · kategori Layanan dan Dukungan Komputer +3; nama: website +2 · `maps:0x2d96b073ac8c58e7:0xb09858eb62f9c08d`
- Sudut Digital (Luwu) · agency · skor 4 · kategori Konsultan media +2; nama: digital +2 · `maps:0x2d96bb86496ffccf:0xd093f715ea35bf23`
- Rumah IT Dauzy (Sinjai) · konsultan · skor 5 · kategori Layanan dan Dukungan Komputer +3; nama: it +2 · `maps:0x2dbc25e759611b1d:0xbf62b77d7009c18e`
- Amil Komputer (Bone) · konsultan · skor 5 · kategori Konsultan Komputer +6; nama: komputer −3; website +2 · `maps:0x2dbde5126f861179:0xbe9fbc3104133109`
- tempatbiasa (Digital Studio) (Pangkajene dan Kepulauan) · agency · skor 4 · kategori Perancang Grafis +2; nama: digital +2 · `maps:0x2dbe37007eb4e311:0x8ffcf9a21ec00c13`
- ALQRA DESIGN (Gowa) · agency · skor 4 · kategori Agensi desain +4 · `maps:0x2dbee1b3e2b97885:0xafe3c0190adf6c86`
- EF CREATIVE (Gowa) · agency · skor 4 · kategori Perancang Grafis +2; nama: creative +2 · `maps:0x2dbee23572ae541f:0x6e1271b6e08f4b5b`
- cv. trimitra utama (Makassar) · isp · skor 4 · kategori Kontraktor Telekomunikasi +4 · `maps:0x2dbee244b509fb3b:0xf47de15346e49370`
- Cipta Kreasi Indomedia (Gowa) · agency · skor 4 · kategori Layanan Pemasaran Internet +4 · `maps:0x2dbee24b94f64649:0x1ceaff683acda2d6`
- Semesta Digital Indonesia (Makassar) · agency · skor 4 · kategori Konsultan Pemasaran +2; nama: digital +2 · `maps:0x2dbee25a5d628437:0x1a153ba0b92b9c3a`
- Sebelas Maret Creative (Makassar) · agency · skor 4 · kategori Perancang Grafis +2; nama: creative +2 · `maps:0x2dbee286f7ae2d7d:0x7a26d94ebb957ae5`
- Citra Sari Makmur. PT - Makassar (Makassar) · isp · skor 4 · kategori Layanan komunikasi satelit +4 · `maps:0x2dbee28df658b24f:0x5abf885996ef7860`
- SATUUNM Mahakarya Nusantara (Makassar) · agency · skor 4 · kategori Agensi desain +4 · `maps:0x2dbee292103b578b:0xd1b71007c04d1722`
- Ballaide Visual (Makassar) · agency · skor 4 · kategori Perancang Grafis +2; website +2 · `maps:0x2dbee2a1bac48b29:0xebbc85efb04d9f26`
- Media Komunikasi (Makassar) · konsultan · skor 4 · kategori Pemasok Peralatan Telekomunikasi +2; website +2 · `maps:0x2dbee2aa77c134cf:0xd772fb3dbd6bd3fb`
- PT. Aptana Citra Solusindo \| Jasa Digital Marketing Makassar (Makassar) · agency · skor 4 · kategori Agen Pemasaran 0; nama: solusindo +2, digital +2 · `maps:0x2dbee2b5a517b8db:0x6ec386184c3b5a48`
- Makassar Technopark (Makassar) · startup · skor 4 · kategori Kantor Perusahaan 0; nama: technopark +4 · `maps:0x2dbee2b68194c111:0x74249a39eb2d3913`
- Konsultan Digital Marketing - Frame Indonesia Group (Makassar) · agency · skor 4 · kategori Konsultan Pemasaran +2; nama: digital +2 · `maps:0x2dbee2c7bf7d747b:0xc85bbc5bd677ae66`
- Rocket Art (Makassar) · agency · skor 4 · kategori Agensi desain +4 · `maps:0x2dbee2c7c06661bd:0x74ee45d2bc3d2f5a`
- PT. SARANA UTAMA MADANI (Makassar) · isp · skor 4 · kategori Kontraktor Telekomunikasi +4 · `maps:0x2dbee2ea0eb71fad:0x21fd05a725f36257`
- Capslock Studio (Makassar) · agency · skor 4 · kategori Agensi desain +4 · `maps:0x2dbee3002d36abf7:0x634f0b0a2db962a`
- Project 90 Agency (Makassar) · agency · skor 4 · kategori Agensi desain +4 · `maps:0x2dbee3090ec759f3:0xa39379b878bb6002`
- CV. RANGERS SAKTI (Makassar) · isp · skor 4 · kategori Kontraktor Telekomunikasi +4 · `maps:0x2dbee30e6720f98f:0x5512c2c61889b85c`
- Kreasinesia \| Digital Creative Production (Makassar) · agency · skor 4 · kategori Jasa Rekaman Video 0; nama: digital +2, creative +2 · `maps:0x2dbee311f12ed78f:0x79ae462640ab4c5c`
- Sempiternal (Makassar) · agency · skor 4 · kategori Layanan Pemasaran Internet +4 · `maps:0x2dbee3256e67570f:0xab17034deb7048e6`
- Jasa Sosial Media Manajemen (Makassar) · agency · skor 4 · kategori Layanan Pemasaran Internet +4 · `maps:0x2dbee32626330fe3:0x8f0443f2bcecf951`
- Jasa Desain Grafis Profesional (Makassar) · agency · skor 4 · kategori Agensi desain +4 · `maps:0x2dbee35509b53cd9:0xe2e724fed50a6287`
- Jasa Desain Grafis Online\_DesignQue (Makassar) · agency · skor 4 · kategori Agensi desain +4 · `maps:0x2dbee35b392f02ad:0x59c59cb0000e72d1`
- PT.MEGA ZARO MANDIRI (Makassar) · isp · skor 4 · kategori Kontraktor Telekomunikasi +4 · `maps:0x2dbee3645dcb9b6f:0x48c1761b208c2d87`
- kaktito.std (Gowa) · agency · skor 4 · kategori Agensi desain +4 · `maps:0x2dbee37d9f42367d:0x3148e8e46c229797`
- Fatih (Makassar) · agency · skor 4 · kategori Layanan Pemasaran Internet +4 · `maps:0x2dbee37e1e871bfb:0x7ac321f0847ed9e7`
- Midienka Pradana (Makassar) · agency · skor 4 · kategori Agensi desain +4 · `maps:0x2dbee3b658b24d9d:0xe04b1ddbd91dcbb0`
- AIRTECH CV \|\| IT Solution (Hardware, Network, CCTV & Software Developer) \|\| IT Training (Network, Hardware, Etc) (Makassar) · konsultan · skor 4 · kategori Konsultan Komputer +6; nama: it solution +4, software +4, developer +4, solution +2, network +2, it +2, training −6, cctv −3 · `maps:0x2dbee3b88877ba05:0x9fe1229de1ef19d6`
- ikuota.com (Makassar) · startup · skor 4 · kategori Layanan E-Niaga +4 · `maps:0x2dbee3eb5c2659b5:0x3cc718bf2e3250a4`
- Disaya Software House (Makassar) · software · skor 4 · kategori Kantor Perusahaan 0; nama: software +4 · `maps:0x2dbee3fa93463ad5:0xc2c8e058d90fb363`
- PT. Liny Jaya Informatika (Makassar) · software · skor 4 · kategori Kantor Perusahaan 0; nama: informatika +4 · `maps:0x2dbee3fb29000797:0x571525d8e054c95b`
- Akdesain (Makassar) · agency · skor 4 · kategori Agensi desain +4 · `maps:0x2dbee3fde09798d5:0xcfebb148fd51e48f`
- Jasa Pembuatan Aplikasi Android (Makassar) · software · skor 4 · tanpa kategori 0; nama: aplikasi +2; website +2 · `maps:0x2dbee4ad7c3a9501:0xc10ebc2cfeb35ff0`
- PORSI WARNA (Gowa) · agency · skor 4 · kategori Agensi desain +4 · `maps:0x2dbee793960ab98f:0x9cff6c192716e36`
- SOFTWARE SMART (Gowa) · software · skor 4 · kategori Kantor Perusahaan 0; nama: software +4 · `maps:0x2dbee7d516e304ab:0xba7ad53301e76526`
- jasa instalasi jaringan internet (Makassar) · isp · skor 4 · kategori Penyedia Layanan Internet (usaha kecil) 0; nama: jaringan +2, internet +2 · `maps:0x2dbefb070d17e34b:0xdd525251825baef1`
- wanHEX Software House (Maros) · software · skor 4 · kategori Kantor Perusahaan 0; nama: software +4 · `maps:0x2dbefb10ccc4ac85:0x1efda299604b5b0c`
- Media Data IT (Makassar) · agency · skor 4 · kategori Kantor Perusahaan 0; nama: data +2, it +2 · `maps:0x2dbefb612bb7880b:0x14db535701abcfe5`
- Computer Solusindo (Makassar) · konsultan · skor 5 · kategori Pusat jaringan komputer +6; nama: solusindo +2, computer −3 · `maps:0x2dbefb6ab5fc3545:0xc7e975d4bb9c11da`
- PT. ARIMANRAYA ASRI (Makassar) · isp · skor 4 · kategori Kontraktor Telekomunikasi +4 · `maps:0x2dbefd07e982af0b:0xaf87641cf87cc26a`
- undangan digital makassar \| Buku Tamu Digital (Makassar) · software · skor 4 · kategori Perancang Situs Web +6; nama: digital +2, undangan −4 · `maps:0x2dbefd0a8684c0a3:0xc6fd1864ed7334c6`
- PT Shangkuriang Telekomunikasi Indonesia (Makassar) · isp · skor 4 · kategori Kantor Perusahaan 0; nama: telekomunikasi +4 · `maps:0x2dbefd4e9e38e97b:0x1172c059d43fee76`
- Sintesa Kreatif Indonesia (sikreatif.id) - Jasa Desain Grafis Makassar (Makassar) · agency · skor 4 · kategori Perancang Grafis +2; nama: kreatif +2 · `maps:0x2dbefd515dabd4b9:0xfc1de2c7e0f5c273`
- CV. LARISINDO JAYA (Makassar) · startup · skor 4 · kategori Layanan E-Niaga +4 · `maps:0x2dbefdb673fca593:0xfd9228a3a843abe3`
- Sai Cowork Makassar (Makassar) · startup · skor 4 · kategori Agen Sewa Ruangan Eksekutif 0; nama: cowork +4 · `maps:0x2dbf03ff51f7dce5:0x3ef77d66bfea323a`
- Consultant Digital Marketing & SEO Makassar (Makassar) · agency · skor 4 · kategori Konsultan Pemasaran +2; nama: digital +2 · `maps:0x2dbf1d354adc648f:0x447586900484c883`
- SisKA - Sistem Komputer Akuntansi (Makassar) · software · skor 5 · kategori Perusahaan Software +6; nama: sistem +2, komputer −3 · `maps:0x2dbf1d9083fb2bfd:0xfd3ded140e2d9681`
- Kopinovasi Inkubator Bisnis (Makassar) · startup · skor 4 · kategori Konsultan 0; nama: inkubator +4 · `maps:0x2dbf1dd26cc9af4f:0xabf1aed1ad829823`
- PT. Wiyata Infotek Bina Solusindo (Makassar) · konsultan · skor 5 · kategori Layanan dan Dukungan Komputer +3; nama: solusindo +2 · `maps:0x2dbf1dd95af58e81:0xc60d9faf0b24ef8d`
- KarTekS Makassar (Gowa) · isp · skor 4 · kategori Teknisi Telekomunikasi +4 · `maps:0x2dbf1ddeb0d4b7a3:0x16fe8156b5b25091`
- Amazing Insight Indonesia - Konsultan Digital Marketing (Gowa) · agency · skor 4 · kategori Konsultan Pemasaran +2; nama: digital +2 · `maps:0x454b0c5b4a3a8c1:0x666262a3b3c92e15`
- Makassence (Makassar) · agency · skor 4 · kategori Layanan Pemasaran Internet +4 · `maps:0x4d25c2df7887393f:0xa8281f4bc0426f52`
- AGORA (Makassar) · agency · skor 4 · kategori Layanan Pemasaran Internet +4 · `maps:0x80c00d301c83125f:0xc637bd6cb7b6763a`
- Narava Studio (Makassar) · agency · skor 4 · kategori Agensi desain +4 · `maps:0xa7d2cb925d90f31f:0x2771ed08b27b6565`

## Website mati / dibajak di direktori — 70

Tautan website ini tidak ditampilkan sebagai tautan aktif di aplikasi.

- Aganta Software Agency · mati · http://www.aganta.id/ · domain tidak ditemukan (DNS)
- Andan Teknomedia · mati · https://andantekno.id/ · server tidak merespons (UND\_ERR\_CONNECT\_TIMEOUT; browser: net::ERR\_CONNECTION\_TIMED\_OUT)
- Artificial Intelligence (Ai) Developer · mati · https://reserse.id/ · domain tidak ditemukan (DNS)
- AVDigitals Production \ Mediakarya · mati · https://avdmarket.web.id/ · server tidak merespons (UND\_ERR\_CONNECT\_TIMEOUT; browser: net::ERR\_NAME\_NOT\_RESOLVED)
- Bani WebDev · mati · https://banisadar.com/ · domain tidak ditemukan (DNS)
- Carakde Fortress · mati · https://carakde.id/ · HTTP 500
- Catalis Creative · mati · http://www.catalis.fun/ · halaman parkir/kedaluwarsa: "domain is expired"
- Catalist Creative · mati · https://www.catalis.fun/ · halaman parkir/kedaluwarsa: "domain is expired"
- creasita CV. Creative Synergy Khatulistiwa · mati · https://creasita.odoo.com/ · HTTP 404
- CV Data Cipta Celebes · mati · http://dataciptacelebes.com/ · HTTP 502
- CV Global Mandiri · mati · http://www.cvglobalmandiriwebs.com/ · domain tidak ditemukan (DNS)
- CV. ONext Mitratama Teknologi · mati · http://www.onext.co.id/ · domain tidak ditemukan (DNS)
- Digiemdi Project · mati · http://www.digiemdi.project.com/ · domain tidak ditemukan (DNS)
- Digisaurus Digital Transformation Company · mati · http://www.digisaurus.id/ · domain tidak ditemukan (DNS)
- Digital Kreatif Agensi · mati · https://digitalkreatifagensi.id/ · HTTP 500
- DIGITAL PARTNER MEDIA · mati · https://digitalpartnermedia.com/ · domain tidak ditemukan (DNS)
- DISAYA AJA · mati · https://disaya.co.id/ · domain tidak ditemukan (DNS)
- Disaya · mati · https://disaya.co.id/ · domain tidak ditemukan (DNS)
- Divocare · mati · http://divocare.id/ · domain tidak ditemukan (DNS)
- DTC Teknologi - PT.Docotel Teknologi Celebes · mati · https://dtc.co.id/ · HTTP 526
- Entwickler Indonesia · mati · https://entwicklerindonesia.com/ · domain tidak ditemukan (DNS)
- FAJAR BROADBAND · mati · http://fajarbroadband.com/ · HTTP 409
- Ferisp · mati · https://www.ferisp.com/ · domain tidak ditemukan (DNS)
- GENG WORK Co-Working Space · mati · http://gengwork.com/ · domain tidak ditemukan (DNS)
- Gro Creative Syndicate · mati · http://www.gro-creative.com/ · domain tidak ditemukan (DNS)
- HOMEGRAPHIC Tech · mati · http://www.homegraphic.art/ · domain tidak ditemukan (DNS)
- Idealab · mati · http://www.aste.my.id/ · domain tidak ditemukan (DNS)
- Imers Media · mati · https://imersmedia.id/ · domain tidak ditemukan (DNS)
- Inovasi Berkah · mati · http://inovasiberkah.cig-eng.com/ · server tidak merespons (EAI\_AGAIN; browser: net::ERR\_NAME\_NOT\_RESOLVED)
- IT Solution by ZeeTech · mati · https://zeetech.my.id/ · domain tidak ditemukan (DNS)
- jasa pembuatan website, aplikasi android, dan digital marketing · mati · https://apostroftech.com/ · domain tidak ditemukan (DNS)
- Jasa Pembuatan Website · mati · http://situseo.com/ · server menolak koneksi (ECONNREFUSED)
- jasa pembuatan website makassar gowa · mati · https://jasapembuatanwebsitemakassar.tech/ · domain tidak ditemukan (DNS)
- Jasa Pembuatan Website UMKM Makassar Dan Sekitarnya · mati · https://tirrikladaberkarya.com/ · domain tidak ditemukan (DNS)
- Karyakreasindo.com · mati · https://karyakreasindo.com/ · domain tidak ditemukan (DNS)
- kode promo · mati · https://kodepromohosting.com/ · domain tidak ditemukan (DNS)
- Logic House · mati · https://logichouse.my.id/ · domain tidak ditemukan (DNS)
- Lumingka · mati · https://lumingka.my.id/ · domain tidak ditemukan (DNS)
- Lunapos Makassar : Aplikasi POS & Sistem Kasir · mati · https://lunaposindonesia.com/ · domain tidak ditemukan (DNS)
- makkode space · mati · https://makkode.com/ · server tidak merespons (UND\_ERR\_CONNECT\_TIMEOUT; browser: net::ERR\_NAME\_NOT\_RESOLVED)
- Mario Webs · mati · https://webs.mario-86.com/ · domain tidak ditemukan (DNS)
- Media Data IT · mati · https://www.mediadatait.com/ · domain tidak ditemukan (DNS)
- MegaSoft Sulawesi · mati · http://balisoftwaremurah.com/ · HTTP 500
- Metro Aznet Indonesia · mati · https://muhazwaridris.com/ · domain tidak ditemukan (DNS)
- Metrotech Digital Asia · mati · https://metrotechdigital.asia/ · server tidak merespons (UND\_ERR\_CONNECT\_TIMEOUT; browser: net::ERR\_CONNECTION\_REFUSED)
- mks.web.id · mati · https://www.mks.web.id/ · server tidak merespons (ECONNRESET; browser: net::ERR\_CONNECTION\_CLOSED)
- Nolins Creative Agency · mati · http://nolinscreative.com/ · domain tidak ditemukan (DNS)
- Office TakeGo · mati · https://takego.id · domain tidak ditemukan (DNS)
- PALAPA NET PINRANG · mati · https://palapanetpinrang.com/ · domain tidak ditemukan (DNS)
- Pandu Palapa Telematika · mati · https://papatel.id/ · server tidak merespons (UND\_ERR\_CONNECT\_TIMEOUT; browser: net::ERR\_CONNECTION\_REFUSED)
- plasmasoftware · mati · http://plasmasoft.web.id/ · halaman parkir/kedaluwarsa: "domain is expired"
- PT Celebes solusi digital · mati · https://celebesdigital.id/ · domain tidak ditemukan (DNS)
- PT. Digikreatif Teknologi Indonesia · mati · https://digikreatif.com/ · server tidak merespons (UND\_ERR\_CONNECT\_TIMEOUT; browser: net::ERR\_CONNECTION\_TIMED\_OUT)
- PT. Dimas Prakoso Digital · mati · https://dimasprakoso.com/ · HTTP 500
- PT. GLOBAL PROGRAMMING NUSANTARA · mati · https://iwanrmx.my.id/ · HTTP 523
- PT Rabin Multi Techno · mati · http://rabinmultitechno.co.id/ · domain tidak ditemukan (DNS)
- PT. Sutera Network Indonesia · mati · https://suteranetindo.com/ · domain tidak ditemukan (DNS)
- PT.TRANS LINK INTERNASIONAL · mati · https://www.translinkinternasional.com/ · halaman bawaan/parkir: "Coming Soon \| RahmanSolutions"
- PT Trans Nasional Teknologi · mati · https://transnet.id/ · HTTP 500
- RSUP Dr. Wahidin Sudirohusodo · mati · https://www.rsupwahidin.com/ · server tidak merespons (UND\_ERR\_CONNECT\_TIMEOUT; browser: net::ERR\_CONNECTION\_TIMED\_OUT)
- Rumah Pintar Teknologi & Inovatif · dibajak · http://www.rumahpintarinovasi.com/ · berisi istilah judi: slot gacor, gacor, situs slot
- SATUUNM Mahakarya Nusantara · mati · https://satu.unm.ac.id/ · domain tidak ditemukan (DNS)
- Sintesa Kreatif Indonesia (sikreatif.id) · mati · https://sikreatif.id/ · domain tidak ditemukan (DNS)
- SPNB DIGITAL · mati · https://spnb.id/ · domain tidak ditemukan (DNS)
- ThemeIDN · mati · https://themeidn.com/ · server tidak merespons (ECONNRESET; browser: net::ERR\_CONNECTION\_CLOSED)
- Thenet Solusindo · mati · https://www.thenet.co.id/ · halaman parkir/kedaluwarsa: "Domain Anda Telah Expired"
- Titik Balik Teknologi · mati · https://codeta.my.id/ · halaman bawaan/parkir: "Account Suspended"
- Tribox Indonesia · mati · https://www.tribox.co.id/ · server tidak merespons (UND\_ERR\_CONNECT\_TIMEOUT; browser: net::ERR\_CONNECTION\_TIMED\_OUT)
- wanHEX Software House · mati · http://wanpos.web.id/ · server tidak merespons (EAI\_AGAIN; browser: net::ERR\_NAME\_NOT\_RESOLVED)
- Websiters Indonesia · mati · https://websiters.co.id/ · domain tidak ditemukan (DNS)

## Seed tanpa tempat — 6

- Algenz · tanpa koordinat (seed saja) · `kurasi:algenz.id`
- Infanthree Digital Technology · tanpa koordinat (seed saja) · `kurasi:infanthree.com`
- Magau Group · pelengkap, tidak ditemukan · `kurasi:magaugroup.co.id`
- Upana Studio · pelengkap, tidak ditemukan · `kurasi:upanastudio.com`
- Dinas Komunikasi, Informatika, Statistik dan Persandian Provinsi Sulawesi Selatan · tanpa koordinat (seed saja) · `instansi:diskominfo-sulsel`
- Pusat Data dan Teknologi Informasi UMI · tanpa koordinat (seed saja) · `instansi:pdti-umi`

## Listing instansi yang dilebur — 5

- Dinas Komunikasi dan Informatika Kota Makassar (Diskominfo Makassar) → Dinas Komunikasi dan Informatika Kota Makassar
- Kantor BPS → Badan Pusat Statistik Kabupaten Gowa
- Dinas Infokom → Dinas Komunikasi dan Informatika Kabupaten Bone
- Kantor Kominfo Luwu → Dinas Komunikasi dan Informatika Kabupaten Luwu
- Kantor Dinas Komunikasi Informatika Dan Statistik → Dinas Komunikasi dan Informatika Kabupaten Jeneponto

## Lowongan seed yang tidak cocok dengan perusahaan — 17

- Management Trainee · GreenEarth Ventures Indonesia (Makassar, Sulawesi Selatan)
- HR Recruiter Intern · MDA Group (Makassar, Sulawesi Selatan)
- Data Collection (Makassar) · PT Binajasa Sumber Sarana (BSS Recruitment) (Makassar, Sulawesi Selatan)
- Human Resources Intern · PT Festo (Sulawesi Selatan)
- Operational Excellence Intern · PT Festo (Sulawesi Selatan)
- Long-Term Intern (Investment / Projects) · PT Festo (Sulawesi Selatan)
- Supervisor Development Program · PT Ivaro Ventura (Sulawesi Selatan)
- Web Developer · PT Pancaran Gemilang Abadi (Makassar, Sulawesi Selatan)
- Lowongan Kerja IT Officer · PT Primahotel Manajemen Indonesia (Makassar, Sulawesi Selatan)
- WEB PROGRAMMER & DESIGNER · PT Rupa Raya Indonesia (Makassar, Sulawesi Selatan)
- Marketing and Sales Development Program (Sulawesi) · PT Sariguna Primatirta Tbk (Tanobel Food) (Makassar, Sulawesi Selatan)
- OFFICER - IT SYSTEM SUPPORT (SUMMARECON MALL MAKASSAR) · PT Summarecon Agung, Tbk (Makassar, Sulawesi Selatan)
- DATA ENTRY GUDANG LOGISTIK · Pt. Manggala Utama Logistik (Parangloe, Sulawesi Selatan)
- ICT Technician · Siloam Hospitals Group (Tbk) (Makassar, Sulawesi Selatan)
- Medical Record Intern · Siloam Hospitals Group (Tbk) (Makassar, Sulawesi Selatan)
- Management Trainee - Business Development Staff · Timedoor Academy (Makassar, Sulawesi Selatan)
- Lowongan Kerja Web Programmer · Yayasan Pendidikan Gunung Sari (Makassar, Sulawesi Selatan)

## Masalah data

- entri lama tidak ada lagi: 3KiosK Parepare Pusat Distribusi & Layanan Resmi Tri (`3kiosk-parepare-pusat-distribusi-dan-layanan-resmi-tri`)
- entri lama tidak ada lagi: affiliate digital produk (`affiliate-digital-produk-luwu-timur`)
- entri lama tidak ada lagi: Code Pixel Academy (`code-pixel-academy-bone`)
- entri lama tidak ada lagi: GoDentist (PT PERIKSA GIGI INDONESIA) (`godentist-pt-periksa-gigi-indonesia-makassar`)
- entri lama tidak ada lagi: Ilhamcode (`ilhamcode-makassar`)
- entri lama tidak ada lagi: INDIHOME (`indihome-gowa`)
- entri lama tidak ada lagi: Indosat Griya Bulukumba (`indosat-griya-bulukumba`)
- entri lama tidak ada lagi: Jasa Pembuatan Website Profesional Makassar (`jasa-pembuatan-website-profesional-makassar`)
- entri lama tidak ada lagi: Jasa Service Komputer, Laptop, Alat IT, Website dan Konsultan IT (`jasa-service-komputer-laptop-alat-it-website-dan-konsultan-it-makassar`)
- entri lama tidak ada lagi: Makassar Website (`makassar-website-2`)
- entri lama tidak ada lagi: media siber (`media-siber-luwu-timur`)
- entri lama tidak ada lagi: MRS (Mobile Repair Solution) Tools (`mrs-mobile-repair-solution-tools-maros`)
- entri lama tidak ada lagi: PT CELEBES SOLUSI DIGITAL (`pt-celebes-solusi-digital-makassar-2`)
- entri lama tidak ada lagi: PT Docotel Teknologi Celebes (`pt-docotel-teknologi-celebes-makassar`)
- entri lama tidak ada lagi: PT Fortinusa (`pt-fortinusa-makassar-2`)
- entri lama tidak ada lagi: Puri Sanjaya Blok C3 No. 7 (`puri-sanjaya-blok-c3-no-7-gowa`)
- entri lama tidak ada lagi: Service Point Smartfren Urip Sumohardjo Makasar (`service-point-smartfren-urip-sumohardjo-makasar-makassar`)
- entri lama tidak ada lagi: Soft PC Games (`soft-pc-games-makassar`)
- entri lama tidak ada lagi: Syarham it solution (`syarham-it-solution-makassar`)
- entri lama tidak ada lagi: Telkom Wifi Corner (`telkom-wifi-corner-pinrang`)
- entri lama tidak ada lagi: Vestryl Informatika (`vestryl-informatika-makassar-2`)
- entri lama tidak ada lagi: Wifi my republic (`wifi-my-republic-gowa`)
- entri lama tidak ada lagi: Winner Service Rappang (`winner-service-rappang-wajo`)
- entri lama tidak ada lagi: XL Center Makassar (XL Satu \| AXIS) (`xl-center-makassar-xl-satu-axis`)
