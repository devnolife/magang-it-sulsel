// Aturan klasifikasi: apakah kandidat berunsur informatika dan layak dihubungi mahasiswa IT untuk
// magang. Skor = kategori Maps/OSM (sinyal terkuat) + kata kunci nama + teks website.
// skor >= AMBANG.masuk -> masuk; skor <= AMBANG.buang -> dibuang; di antaranya "ragu" -> AI.
// Semua fungsi di sini murni supaya mudah diuji (lihat klasifikasi.test.js).

/**
 * @typedef {import('../../src/lib/shared/jenis.js').Jenis} Jenis
 * @typedef {{ nama: string, nama_asli?: string, kategori: string[], website?: string | null, jumlah_ulasan?: number | null }} KandidatAturan
 * @typedef {{ judul?: string | null, deskripsi?: string | null }} WebAturan
 * @typedef {{ skor: number, jenis: Jenis | null, alasan: string[] }} HasilAturan
 */

export const AMBANG = { masuk: 4, buang: 0 };

/** Kategori berunsur IT: [pola, skor, jenis]. Dicek berurutan; yang pertama cocok dipakai. */
/** @type {[RegExp, number, Jenis][]} */
const KATEGORI_IT = [
	[
		/^(Perusahaan Software|Pengembang Perangkat Lunak|Perancang Situs Web|Kantor IT)$/i,
		6,
		'software'
	],
	[/^(Pengembang Video Game|Perusahaan video game)$/i, 6, 'software'],
	[
		/^(Konsultan Komputer|Layanan Keamanan Komputer|Pusat jaringan komputer|Konsultan IT)$/i,
		6,
		'konsultan'
	],
	[/^(Pusat data|Layanan Web Hosting)$/i, 6, 'isp'],
	[/^Studio animasi$/i, 6, 'agency'],
	[/^Coworking space$|Coworking Space$/i, 5, 'startup'],
	// "Computer support and services": banyak juga servis laptop/toko; kategori saja belum cukup.
	[/^Layanan dan Dukungan Komputer$/i, 3, 'konsultan'],
	[/^(Kontraktor Telekomunikasi|Teknisi Telekomunikasi|Layanan komunikasi satelit)$/i, 4, 'isp'],
	[
		/^(Agensi desain|Layanan Pemasaran Internet|Agensi penjenamaan|Agensi perdagangan elektronik)$/i,
		4,
		'agency'
	],
	[/^Layanan E-Niaga$/i, 4, 'startup'],
	[/^(Pabrikan perangkat keras komputer|Institut riset)$/i, 2, 'konsultan'],
	[
		/^(Pemasok Sistem Keamanan|Jasa instalasi sistem keamanan|Pemasok Peralatan Telekomunikasi|Perusahaan jaringan bisnis)$/i,
		2,
		'konsultan'
	],
	[/^(Perancang Grafis|Konsultan Pemasaran|Konsultan media)$/i, 2, 'agency'],
	[/^(Pusat Bisnis|Layanan informasi|Jasa Pemetaan)$/i, 2, 'startup'],
	// Netral tapi memberi petunjuk jenis bila nama cukup kuat (mis. "X Digital Creative").
	[
		/^(Agen Pemasaran|Biro Iklan|Jasa Periklanan|Perusahaan Media|Jasa Pengeditan Video|Jasa Rekaman Video|Konsultan Audio Visual|Jasa Teknologi Penyelenggaraan Acara)$/i,
		0,
		'agency'
	],
	[/^Area Wi-?Fi$/i, 0, 'isp']
];

/** ISP/telko: banyak listing adalah RT/RW net kecil, konter pulsa, atau gerai; butuh entitas jelas. */
const KATEGORI_ISP =
	/^(Penyedia Layanan Internet|Penyedia Layanan Telekomunikasi|Operator jaringan seluler|Perusahaan Telepon|Perusahaan TV Kabel)$/i;
const MEREK_ISP =
	/\b(biznet|my ?republic|iconnet|icon\+|indihome|telkom(?!sel)|first ?media|xl ?home|oxygen|cbn|fiberstar|moratel\w*|lintasarta|hypernet|mnc ?play|citranet|nusanet|melsa|indosat|smartfren|infomedia)\b/i;
const BADAN_USAHA = /\b(pt|cv|tbk|persero)\b\.?/i;
/** Agen penjualan/pemasangan paket internet, bukan kantor ISP. */
const AGEN_ISP =
	/\b(daftar( baru)?|pasang|pemasangan|promo|sales|agen|agent|marketing|installer|team|tim)\b/i;
/** Kategori yang juga dipakai agen/RT-RW net ("Internet marketing service", "Business networking"). */
const KATEGORI_MIRIP_ISP = /^(Layanan Pemasaran Internet|Perusahaan jaringan bisnis)$/i;

/**
 * Nama yang jelas ISP/RT-RW net: merek ISP, wifi/fiber, atau berakhiran "net" ("DzaliqaNET",
 * "Lena Net"); bukan "internet marketing" atau kata biasa seperti "planet".
 * @param {string} nama
 */
export function namaIsp(nama) {
	if (MEREK_ISP.test(nama) || /\b(wifi|wi-fi|fiber|fibre|broadband|isp)\b/i.test(nama)) return true;
	const net = nama.match(/\b\w*net\b/gi) ?? [];
	return net.some((w) => !/^(planet|magnet|cabinet|kabinet|internet)$/i.test(w));
}

/** Ruang kerja bersama: kategori ini penuh sekretariat organisasi, kafe, dan kantor biasa. */
const KATEGORI_COWORKING = /^Ruang Kerja Bersama$/i;
const NAMA_COWORKING =
	/\b(co-?working|working ?space|cowork\w*|coffice|space|hub|inkubator|incubator|techno ?park|startup)\b/i;

const KATEGORI_NETRAL =
	/^(Kantor Perusahaan|Kantor|Kantor \(yes\)|Konsultan|Produsen|Layanan pengembangan usaha|Konsultan Manajemen Bisnis|Konsultan Teknik|Konsultan industri|Layanan Administrasi Bisnis|Agen Sewa Ruangan Eksekutif|Badan sertifikasi|Laboratorium|Perusahaan elektronik|Insinyur.*|Kantor Hubungan Masyarakat|Layanan B2B|Studio televisi|Penyiar Radio|Penerbit.*|Layanan Berita|Perusahaan Listrik|Pengembangan Bisnis.*)$/i;

const KATEGORI_TOKO_SOFTWARE = /^Toko Software Komputer$/i;

const KATEGORI_NEGATIF =
	/^(Toko|Servis|Jasa Reparasi|Jasa Perbaikan|Reparasi|Bengkel|Kedai|Kafe|Bar |Restoran|Rumah Makan|Warnet|Hotel|Hostel|Penginapan|Universitas|Perguruan|Fakultas|Sekolah|Kursus|Pusat Pendidikan|Pusat pelatihan|Pusat Belajar|Pusat Pembelajaran|Institut pelatihan|Institusi Pendidikan|Lembaga Pendidikan|Pendidikan|Konsultan Pendidikan|Layanan Pengujian Pendidikan|Kelompok Bermain|Prasekolah|Klinik|Rumah Sakit|Apotek|Dokter|Dermatolog|Psikolog|Ahli Gizi|Salon|Masjid|Gereja|Percetakan|Layanan Percetakan|Industri Percetakan|Printer Digital|Layanan cetak|Jasa percetakan|Jasa Les|Bimbingan|Studio Fotografi|Studio Foto|Jasa fotografi|Fotografer|Photo booth|Biro|Agen Tiket|Agen tiket|Tempat penjualan tiket|Tujuan Wisata|Taman|Pusat Perbelanjaan|Pasar|Toserba|Komplek perumahan|Pembangunan Perumahan|Otoritas Perumahan|Agen Properti|Pengembang Realestat|Kontraktor Umum|Perusahaan Konstruksi|Jasa Konstruksi|Konsultan Bangunan|Arsitek|Perusahaan arsitektur|Jasa Pengiriman|Layanan Pengiriman|Gudang|Konsultan Pajak|Kantor Pelayanan Pajak|Akuntan|Notaris|Pengacara|Layanan Hukum|Event Organizer|Jasa Pernikahan|Jasa Pembersih|Layanan Kebersihan|Dealer|Pertanian|Perkebunan|Asosiasi|Organisasi Nonprofit|Lembaga Swadaya|Balai|Gedung Pertemuan|Aula|Konsulat|Pengadilan|Kantor Imigrasi|Kantor Catatan Sipil|Kantor Pemerintah|Pemerintahan|Kantor Pemda|Kementerian|Bank|Lembaga Keuangan|Layanan Transfer Uang|Perusahaan Daerah Air Minum|Pembangkit Listrik|Perusahaan Minyak|Pabrikan mebel|Penjahit|Layanan Penurunan|Program literasi|Rumah wisata|Grosir|Pemasok makanan|Konsultan makanan|Penyedia batu|Jasa Ketik|Jasa Instalasi Listrik|Pusat Hiburan|Penyelenggara aktivitas|Komunitas|Kantor Camat|Kantor Desa)/i;

/** Instansi yang berunsur IT: Diskominfo, BPS, dst. (instansi lain dibuang kecuali lewat seed). */
const INSTANSI_IT =
	/\b(kominfo\w*|diskominfo\w*|infokom|komunikasi,? (dan )?informatika|komunikasi informatika|persandian|badan pusat statistik|bps)\b/i;
const INSTANSI = /\b(dinas|badan|kantor|diskominfo\w*|kominfo\w*|bps|pemerintah|pemkab|pemkot)\b/i;

/** Nama: sinyal IT kuat (+4) dan sedang (+2); total positif dibatasi +6. */
const NAMA_KUAT =
	/\b(software|perangkat lunak|developer|development|programmer|programming|coding|koding|system integrator|teknologi informasi|information technology|informatika|informatics|web ?design|web ?developer|digital agency|creative agency|data ?center|pusat data|cyber|siber|cloud|hosting|telekomunikasi|telecommunications?|telecom|telco|techno ?park|inkubator|incubator|co-?working|cowork\w*|working ?space|startup|start-up|game studio|game developer|studio game|animation|animasi|(konsultan|consultant|consulting|solusi|solution|solutions) it|it (konsultan|consultant|consulting|solusi|solution|solutions|support|services?))\b/i;
const NAMA_SEDANG =
	/\b(teknologi|technology|technologies|tech|tekno|techno|digital|digitech|sistem|system|systems|solusi|solution|solutions|solusindo|aplikasi|app|apps|webs?|website|data|network|networks|jaringan|internet|komputasi|computing|infotama|infomedia|infotech|multimedia|labs|kreatif|creative|code|kode|soft)\b/i;
/** Akhiran merek khas perusahaan teknologi ("Qodrisoft", "Ilhamcode"); bukan "tek" (apotek, arsitek). */
const NAMA_AKHIRAN = /\b[a-z]{3,}(tech|soft|ware|code|dev|labs?|digital|data|sys)\b/i;
const NAMA_SINGKATAN = /\b(IT|ICT|AI|IoT)\b/;

/** Nama: gerai/konter/menara bukan kantor tempat magang (-6). */
const NAMA_GERAI =
	/\b(grapari\w*|plasa|plaza|gerai|outlet|kios|konter|counter|warnet|internet caf+e|sto|bts|tower)\b/i;

/** Nama: lembaga pendidikan/pelatihan (dikecualikan dari direktori, -6). */
const NAMA_PENDIDIKAN =
	/\b(kursus|lpk|bimbel|bimbingan belajar|courses?|academy|akademi|sekolah|smk|sma|smp|universitas|university|institut|institute|fakultas|jurusan|prodi|politeknik|training|pelatihan|bootcamp|trainer|sertifikasi|lsp)\b/i;

/** Nama: sinyal bukan tempat magang IT (-4); total negatif dibatasi -8. */
const NAMA_NEGATIF =
	/\b(toko|store|shop|jual|sewa|atk|servis|reparasi|perbaikan|repair|les|percetakan|printing|print|cetak|fotokopi|fotocopy|photocopy|sablon|cell|celluler|cellular|seluler|ponsel|phonsel|handphone|smartphone|gadget|pulsa|reload|voucher|aksesoris|aksesori|accessories|game center|gaming|playstation|rental|cafe|kafe|kopi|coffee|kedai|warung|resto|restoran|rumah makan|kitchen|bakery|laundry|salon|barber\w*|travel|tour|umroh|hotel|penginapan|guest ?house|homestay|kost|villa|glamping|mart|minimarket|swalayan|elektronik|electronic|reseller|urut|pijat|refleksi|sekret|sekretariat|sekertariat|posko|karang taruna|mapala|himpunan|komunitas|masjid|musholla|gereja|klinik(?!\s+(konsultasi\s+)?(it|ti|digital)\b)|apotek|rumah sakit|dokter|dental|gigi|building|gedung|menara|properti|property|perumahan|residence|regency|notaris|pengacara|advokat|hukum|legalitas|pajak|akuntan|accounting|wedding|pernikahan|undangan|bridal|musik|music|event organizer|reklame|spanduk|baliho|billboard|konstruksi|kontraktor|construction|mebel|meubel|meuble|furniture|ekspedisi|cargo|kurir|pertanian|farmers?|otomotif|motor|mobil|dealer|bengkel|koperasi|bank|balai|kantor bupati|kantor camat|kantor desa|kantor lurah|kelurahan|dprd|kpu|bawaslu|panwas\w*)\b/i;
const NAMA_SERVICE =
	/\bservice\s+(hp|handphone|laptop|komputer|computer|iphone|printer|kamera|camera|ac|tv|elektronik|center|centre)\b|\bservice cent(er|re)\b/i;
const NAMA_LEMAH_NEGATIF =
	/\b(komputer|computer|komputindo|computindo|comp|laptop|cctv|supplier|distributor|teknik|foto|photo|photography|fotografi)\b/i;

/** Teks website (judul + deskripsi). */
const WEB_IT =
	/\b(software|aplikasi|website|web development|pengembangan (web|aplikasi)|IT solutions?|teknologi informasi|digital agency|jasa pembuatan (web|website|aplikasi)|developer|system integrator|internet service provider|hosting|cloud|jaringan|network|cyber ?security|data center|startup)\b/i;
const WEB_NEGATIF =
	/\b(kursus|bimbel|percetakan|digital printing|servis (hp|laptop|komputer)|toko komputer|agen pulsa|slot|togel)\b/i;

/** Jenis dari kata kunci nama bila kategori tidak menentukan. */
/** @type {[RegExp, Jenis][]} */
const JENIS_NAMA = [
	[INSTANSI_IT, 'instansi'],
	[MEREK_ISP, 'isp'],
	[
		/\b(internet|isp|wifi|wi-fi|fiber|fibre|telekomunikasi|telecom\w*|telco|hosting|data ?center|seluler|broadband)\b|net\b/i,
		'isp'
	],
	[
		/\b(konsultan|consult\w*|system integrator|jaringan|network\w*|cyber|siber|security|keamanan|it support|it service)\b/i,
		'konsultan'
	],
	[
		/\b(agency|agensi|kreatif|creative|digital marketing|marketing|desain|design|branding|studio|media|advertising|iklan|animasi|animation|video|production)\b/i,
		'agency'
	],
	[
		/\b(startup|start-up|co-?working|cowork\w*|working ?space|space|hub|inkubator|incubator|techno ?park|venture)\b/i,
		'startup'
	],
	[
		/\b(software|aplikasi|app|apps|developer|web|coding|programming|tech|teknologi|technology|digital|labs?|code|kode|sistem|system|informatika|informatics|infotech|infotama|solusi\w*|solutions?)\b|[a-z]{3}(tech|soft|ware|code|dev|labs?|sys)\b/i,
		'software'
	]
];

/**
 * @param {string} kategori
 * @param {KandidatAturan} k
 * @returns {{ skor: number, jenis: Jenis | null, label: string }}
 */
export function skorKategori(kategori, k) {
	const nama = k.nama_asli || k.nama;
	if (KATEGORI_ISP.test(kategori) || (KATEGORI_MIRIP_ISP.test(kategori) && namaIsp(nama))) {
		const jelas =
			!AGEN_ISP.test(nama) &&
			(BADAN_USAHA.test(nama) ||
				MEREK_ISP.test(nama) ||
				!!k.website ||
				(k.jumlah_ulasan ?? 0) >= 15);
		const penuh = /^Perusahaan TV Kabel$/i.test(kategori) ? 2 : 6;
		return jelas
			? { skor: penuh, jenis: 'isp', label: kategori }
			: { skor: 0, jenis: 'isp', label: `${kategori} (usaha kecil)` };
	}
	for (const [re, skor, jenis] of KATEGORI_IT) {
		if (re.test(kategori)) return { skor, jenis, label: kategori };
	}
	if (KATEGORI_COWORKING.test(kategori)) {
		return NAMA_COWORKING.test(nama)
			? { skor: 6, jenis: 'startup', label: kategori }
			: { skor: 0, jenis: null, label: `${kategori} (bukan coworking)` };
	}
	if (KATEGORI_TOKO_SOFTWARE.test(kategori))
		return { skor: -3, jenis: 'software', label: kategori };
	if (KATEGORI_NETRAL.test(kategori)) return { skor: 0, jenis: null, label: kategori };
	if (KATEGORI_NEGATIF.test(kategori)) return { skor: -6, jenis: null, label: kategori };
	return { skor: -1, jenis: null, label: kategori };
}

/**
 * @param {string} nama
 * @returns {{ skor: number, alasan: string[] }}
 */
export function skorNama(nama) {
	const alasan = [];
	let pos = 0;
	const kuat = nama.match(new RegExp(NAMA_KUAT, 'gi')) ?? [];
	const sedang = nama.match(new RegExp(NAMA_SEDANG, 'gi')) ?? [];
	const singkatan = nama.match(new RegExp(NAMA_SINGKATAN, 'g')) ?? [];
	const unik = (/** @type {string[]} */ a) => [...new Set(a.map((s) => s.toLowerCase()))];
	for (const w of unik(kuat)) ((pos += 4), alasan.push(`${w} +4`));
	for (const w of unik([...sedang, ...singkatan])) ((pos += 2), alasan.push(`${w} +2`));
	const akhiran = nama.match(NAMA_AKHIRAN);
	if (akhiran && !kuat.length && !sedang.length) ((pos += 2), alasan.push(`${akhiran[0]} +2`));
	pos = Math.min(pos, 6);
	let neg = 0;
	const gerai = nama.match(new RegExp(NAMA_GERAI, 'gi')) ?? [];
	for (const w of unik(gerai)) ((neg -= 6), alasan.push(`${w} −6`));
	const pendidikan = nama.match(new RegExp(NAMA_PENDIDIKAN, 'gi')) ?? [];
	for (const w of unik(pendidikan)) ((neg -= 6), alasan.push(`${w} −6`));
	const negatif = nama.match(new RegExp(NAMA_NEGATIF, 'gi')) ?? [];
	for (const w of unik(negatif)) ((neg -= 4), alasan.push(`${w} −4`));
	if (NAMA_SERVICE.test(nama)) ((neg -= 4), alasan.push('service −4'));
	const lemah = nama.match(new RegExp(NAMA_LEMAH_NEGATIF, 'gi')) ?? [];
	for (const w of unik(lemah)) ((neg -= 3), alasan.push(`${w} −3`));
	neg = Math.max(neg, -8);
	return { skor: pos + neg, alasan };
}

/**
 * @param {string | null | undefined} nama
 * @param {string} kategori
 */
function instansiIt(nama, kategori) {
	if (!nama || !INSTANSI_IT.test(nama)) return false;
	return INSTANSI.test(nama) || /pemerintah/i.test(kategori);
}

/**
 * Skor aturan untuk satu kandidat.
 * @param {KandidatAturan} k
 * @param {WebAturan | null} [web]
 * @returns {HasilAturan}
 */
export function skorAturan(k, web = null) {
	const nama = k.nama_asli || k.nama;
	const kategori = k.kategori.length ? k.kategori : [];
	const alasan = [];

	if (nama.replace(/[^\p{L}\p{N}]/gu, '').length < 2) {
		return { skor: -10, jenis: null, alasan: ['nama tidak informatif −10'] };
	}
	if (kategori.some((c) => instansiIt(nama, c)) || instansiIt(nama, '')) {
		return { skor: 6, jenis: 'instansi', alasan: ['instansi berunsur IT (kominfo/statistik) +6'] };
	}

	let skorKat = 0;
	/** @type {Jenis | null} */
	let jenis = null;
	if (kategori.length) {
		const hasil = kategori.map((c) => skorKategori(c, k)).sort((a, b) => b.skor - a.skor);
		skorKat = hasil[0].skor;
		jenis = hasil.find((h) => h.jenis && h.skor >= 0)?.jenis ?? null;
		alasan.push(`kategori ${hasil[0].label} ${fmt(skorKat)}`);
	} else {
		alasan.push('tanpa kategori 0');
	}

	const n = skorNama(nama);
	if (n.alasan.length) alasan.push(`nama: ${n.alasan.join(', ')}`);

	let skorWeb = 0;
	const teksWeb = [web?.judul, web?.deskripsi].filter(Boolean).join(' · ');
	if (teksWeb) {
		if (WEB_IT.test(teksWeb)) skorWeb += 2;
		if (WEB_NEGATIF.test(teksWeb)) skorWeb -= 2;
		if (skorWeb) alasan.push(`website ${fmt(skorWeb)}`);
	}

	const skor = skorKat + n.skor + skorWeb;
	jenis ??= jenisDariNama(nama);
	return { skor, jenis, alasan };
}

/** @param {string} nama */
export function jenisDariNama(nama) {
	for (const [re, jenis] of JENIS_NAMA) if (re.test(nama)) return jenis;
	return null;
}

/**
 * Skor awal sebelum enrich, untuk memilih kandidat yang layak dibuka halaman detail/website-nya.
 * Seed kurasi selalu diproses (masuk) atau tidak pernah (ditolak).
 * @param {KandidatAturan & { seed?: { masuk: boolean | null } | null }} k
 */
export function skorAwal(k) {
	if (k.seed?.masuk === true) return 100;
	if (k.seed?.masuk === false) return -100;
	return skorAturan(k).skor;
}

/**
 * @param {number} skor
 * @returns {'masuk' | 'buang' | 'ragu'}
 */
export function putusan(skor) {
	if (skor >= AMBANG.masuk) return 'masuk';
	if (skor <= AMBANG.buang) return 'buang';
	return 'ragu';
}

/** @param {number} n */
function fmt(n) {
	return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0';
}
