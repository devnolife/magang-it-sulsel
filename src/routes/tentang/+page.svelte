<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import TautanLuar from '$lib/components/TautanLuar.svelte';
	import { formatAngka, formatTanggal } from '$lib/format.js';
	import { REPO_URL } from '$lib/isu.js';
	import { emailKontak } from '$lib/kontak-pengelola.js';
	import { JENIS, JENIS_KEYS } from '$lib/shared/jenis.js';
	import { MAGANG_STATUS, MAGANG_STATUS_KEYS } from '$lib/shared/magang-status.js';

	let { data } = $props();

	const stats = $derived(data.stats);
	const email = emailKontak();

	/** @type {Record<import('$lib/shared/jenis.js').Jenis, string>} */
	const URAIAN_JENIS = {
		software: 'Jasa pembuatan aplikasi, situs web, dan sistem informasi.',
		konsultan: 'System integrator, jaringan, keamanan, dan infrastruktur TI.',
		isp: 'Penyedia internet, operator telekomunikasi, dan data center.',
		agency: 'Pemasaran digital, desain, produksi konten, dan studio game.',
		instansi: 'Diskominfo, BPS, BUMN, bank, rumah sakit, dan kampus yang punya unit TI.',
		startup: 'Startup lokal, ruang kerja bersama (coworking), dan inkubator.'
	};

	const DAFTAR_ISI = [
		['sumber', 'Sumber data'],
		['jenis', 'Siapa yang masuk'],
		['status', 'Status magang'],
		['tips', 'Tips aman magang'],
		['koreksi', 'Koreksi & hapus data'],
		['privasi', 'Privasi'],
		['lisensi', 'Kode & lisensi']
	];

	const judul = 'Tentang & sumber data · Magang IT Sulsel';
	const deskripsi =
		'Dari mana data Magang IT Sulsel berasal, cara menentukan status magang, tips aman mencari magang, dan cara mengoreksi atau menghapus data.';
	const kanonik = $derived(new URL(resolve('/tentang'), page.url).href);
</script>

<svelte:head>
	<title>{judul}</title>
	<meta name="description" content={deskripsi} />
	<link rel="canonical" href={kanonik} />
	<meta property="og:type" content="website" />
	<meta property="og:locale" content="id_ID" />
	<meta property="og:title" content={judul} />
	<meta property="og:description" content={deskripsi} />
</svelte:head>

<section class="sampul wadah" aria-labelledby="judul-tentang">
	<p class="label-mikro sampul-alis">Tentang · Sumber data</p>
	<h1 id="judul-tentang">Atlas kecil untuk mencari tempat magang di tanah sendiri.</h1>
	<p class="sampul-lede">
		Magang IT Sulsel menghimpun perusahaan dan instansi berunsur informatika di 24 kabupaten/kota
		Sulawesi Selatan, supaya mahasiswa tidak perlu menyisir Google Maps satu per satu. Ini
		<strong>bukan situs lowongan</strong>: tempat yang tercatat belum tentu sedang membuka magang,
		jadi tanyakan langsung lewat kontaknya.
	</p>

	<div class="angka">
		<dl class="angka-daftar">
			<div>
				<dt>Tempat</dt>
				<dd>{formatAngka(stats.total)}</dd>
			</div>
			<div>
				<dt>Kab/kota</dt>
				<dd>{stats.kabkota}<span> / 24</span></dd>
			</div>
			<div>
				<dt>Cerita magang</dt>
				<dd>{formatAngka(stats.pengalaman)}</dd>
			</div>
			{#if stats.lastImport}
				<div>
					<dt>Data per</dt>
					<dd class="angka-tanggal">{formatTanggal(stats.lastImport, { pendek: true })}</dd>
				</div>
			{/if}
		</dl>

		<figure class="komposisi">
			<div class="komposisi-bilah" aria-hidden="true">
				{#each JENIS_KEYS as j (j)}
					{#if stats.perJenis[j]}
						<span class="j-{j}" style:flex-grow={stats.perJenis[j]}></span>
					{/if}
				{/each}
			</div>
			<figcaption>
				<span class="sr-only">Komposisi tempat per jenis:</span>
				<ul class="komposisi-legenda">
					{#each JENIS_KEYS as j (j)}
						<li class="j-{j}">
							<span class="titik-jenis" aria-hidden="true"></span>
							{JENIS[j].short}
							<span class="jumlah">{formatAngka(stats.perJenis[j])}</span>
						</li>
					{/each}
				</ul>
			</figcaption>
		</figure>
	</div>
</section>

<div class="badan wadah">
	<nav class="daftar-isi" aria-label="Daftar isi">
		<p class="label-mikro">Di halaman ini</p>
		<ol>
			{#each DAFTAR_ISI as [id, label], i (id)}
				<li>
					<a href="#{id}"
						><span class="no" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>{label}</a
					>
				</li>
			{/each}
		</ol>
	</nav>

	<div class="prosa">
		<section id="sumber" aria-labelledby="h-sumber">
			<h2 id="h-sumber">Sumber data</h2>
			<dl class="sumber-daftar">
				<div>
					<dt>Google Maps</dt>
					<dd>
						Fakta bisnis (nama, kategori, alamat, telepon, situs web, dan rating) dari hasil
						pencarian publik, dikumpulkan pelan-pelan tanpa login akun. Teks ulasan dan foto tidak
						diambil. Setiap tempat menautkan balik ke halamannya di Google Maps.
					</dd>
				</div>
				<div>
					<dt>OpenStreetMap</dt>
					<dd>
						Kantor IT, telekomunikasi, coworking, dan kantor pemerintahan di Sulsel lewat Overpass
						API. Batas kabupaten/kota dan peta dasar juga dari OpenStreetMap. Data OSM &copy;
						<a href="https://www.openstreetmap.org/copyright" rel="noopener"
							>OpenStreetMap contributors</a
						>, berlisensi ODbL.
					</dd>
				</div>
				<div>
					<dt>Situs web tempatnya</dt>
					<dd>
						Beranda dan halaman karir diperiksa otomatis, dengan menghormati robots.txt, untuk
						mencari email, WhatsApp, media sosial, dan kata kunci magang. Situs yang mati atau
						tampak dibajak ditandai dan tidak ditautkan.
					</dd>
				</div>
				<div>
					<dt>Kurasi &amp; kiriman pengunjung</dt>
					<dd>
						Catatan manual, misalnya peringatan penipuan yang mengatasnamakan perusahaan, serta
						usulan, koreksi, dan cerita magang yang dikirim lewat GitHub Issues lalu diperiksa
						pengelola.
					</dd>
				</div>
			</dl>
		</section>

		<section id="jenis" aria-labelledby="h-jenis">
			<h2 id="h-jenis">Siapa yang masuk</h2>
			<p>
				Setiap tempat diberi skor dari kategori Google Maps atau tag OSM, kata kunci pada namanya,
				dan isi situsnya. Yang skornya tinggi masuk, yang rendah dibuang, dan yang meragukan dinilai
				AI lalu bisa dikoreksi manual. Ada enam jenis:
			</p>
			<ul class="jenis-daftar">
				{#each JENIS_KEYS as j (j)}
					<li class="j-{j}">
						<span class="titik-jenis" aria-hidden="true"></span>
						<span><strong>{JENIS[j].label}.</strong> {URAIAN_JENIS[j]}</span>
					</li>
				{/each}
			</ul>
			<p>
				Toko dan servis komputer, kursus atau LPK, warnet, percetakan, dan konter pulsa tidak
				dimasukkan. Penyaringan otomatis tidak sempurna; bila ada tempat yang keliru, laporkan lewat
				tautan <em>Laporkan koreksi</em> di halaman tempatnya.
			</p>
		</section>

		<section id="status" aria-labelledby="h-status">
			<h2 id="h-status">Status magang</h2>
			<p>Setiap tempat punya satu dari tiga status berikut:</p>
			<table class="tabel-status">
				<thead>
					<tr>
						<th scope="col">Status</th>
						<th scope="col">Artinya</th>
					</tr>
				</thead>
				<tbody>
					{#each MAGANG_STATUS_KEYS as s (s)}
						<tr>
							<th scope="row">
								<span class="lencana lencana--{s}">{MAGANG_STATUS[s].short}</span>
							</th>
							<td>{MAGANG_STATUS[s].keterangan}</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<p>
				Status hanyalah petunjuk, bukan jaminan diterima. Lowongan tanpa tanggal tutup dianggap
				berakhir 45 hari setelah ditemukan.
			</p>
		</section>

		<section id="tips" aria-labelledby="h-tips">
			<h2 id="h-tips">Tips aman magang</h2>
			<ol class="tips">
				<li>
					<strong>Magang yang sah tidak memungut biaya.</strong> Tolak permintaan uang pendaftaran, pelatihan,
					seragam, atau “jaminan”, dengan alasan apa pun.
				</li>
				<li>
					<strong>Cocokkan identitasnya.</strong> Periksa alamat di peta, situs resmi, dan email berdomain
					perusahaan. Waspadai tawaran lewat WhatsApp dari nomor tak dikenal yang mengatasnamakan perusahaan
					besar.
				</li>
				<li>
					<strong>Jangan serahkan dokumen asli.</strong> Salinan ijazah atau KTP sudah cukup. Jangan berikan
					PIN, kode OTP, atau akses rekening.
				</li>
				<li>
					<strong>Wawancara di tempat yang jelas.</strong> Di kantornya atau lewat panggilan video resmi.
					Bila diminta datang ke lokasi lain, ajak teman atau kabari keluarga.
				</li>
				<li>
					<strong>Tanyakan hal penting sejak awal:</strong> pembimbing lapangan, jam kerja, durasi, tugas
					yang dikerjakan, sertifikat, dan uang saku bila ada.
				</li>
				<li>
					<strong>Libatkan kampus.</strong> Minta surat pengantar, dan pastikan kerja sama tertulis bila
					magangnya dihitung SKS atau MBKM.
				</li>
				<li>
					<strong>Laporkan yang mencurigakan</strong> lewat tautan <em>Laporkan koreksi</em> di halaman
					tempatnya, supaya mahasiswa lain ikut waspada.
				</li>
			</ol>

			<h3>Cara menghubungi</h3>
			<p>
				Perkenalkan diri (nama, kampus, program studi, semester), sebut bidang yang diminati dan
				periode magangnya, lalu tanyakan apakah ada kesempatan. Hubungi di jam kerja. Bila belum
				dibalas, tanyakan sekali lagi dengan sopan setelah sekitar satu minggu.
			</p>
		</section>

		<section id="koreksi" aria-labelledby="h-koreksi">
			<h2 id="h-koreksi">Koreksi &amp; hapus data</h2>
			<p>
				Setiap halaman tempat punya tautan <em>Laporkan koreksi</em> untuk melaporkan data yang salah,
				tempat yang sudah tutup atau pindah, info lowongan, atau permintaan hapus data. Tautan itu membuka
				formulir GitHub Issues yang sudah berisi nama tempatnya. Perlu akun GitHub, dan isiannya tampil
				publik.
			</p>
			<p>
				Pemilik usaha yang tidak ingin tercantum cukup memilih <em>Minta hapus data</em>. Pengelola
				akan menyembunyikan entrinya, dan entri itu tidak muncul lagi saat data diperbarui.
				{#if email}
					Tidak punya akun GitHub? Kirim email ke
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- tautan email -->
					<a href="mailto:{email}?subject={encodeURIComponent('Hapus data Magang IT Sulsel')}"
						>{email}</a
					>.
				{/if}
			</p>
			<p>
				Tempat yang belum tercatat bisa diusulkan lewat halaman
				<a href={resolve('/usulkan')}>Usulkan tempat</a>. Semua kiriman diperiksa pengelola sebelum
				datanya diubah, dan prosesnya bisa dipantau di
				<TautanLuar href="{REPO_URL}/issues">daftar isu GitHub</TautanLuar>.
			</p>
		</section>

		<section id="privasi" aria-labelledby="h-privasi">
			<h2 id="h-privasi">Privasi</h2>
			<ul>
				<li>Tidak ada akun, iklan, atau pelacak analitik.</li>
				<li>
					Posisi GPS untuk urutan terdekat hanya dihitung di browser Anda dan tidak pernah dikirim
					ke server.
				</li>
				<li>
					Situs ini tidak punya formulir isian. Usulan, koreksi, dan cerita dikirim lewat GitHub
					Issues, jadi tampil publik dan tunduk pada kebijakan privasi GitHub. Jangan menulis nomor
					pribadi atau data sensitif di sana.
				</li>
				<li>Pilihan tema terang/gelap disimpan di browser Anda (localStorage).</li>
			</ul>
		</section>

		<section id="lisensi" aria-labelledby="h-lisensi">
			<h2 id="h-lisensi">Kode &amp; lisensi</h2>
			<p>
				Kode sumbernya terbuka dengan lisensi MIT di
				<a href="https://github.com/devnolife/magang-it-sulsel" rel="noopener">GitHub</a>. Seluruh
				direktori bisa diunduh sebagai CSV, dan bagian data yang berasal dari OpenStreetMap tunduk
				pada ODbL.
			</p>
			<p class="unduh">
				<a class="tombol" href={resolve('/data.csv')} download>
					<Icon name="download" size={16} /> Unduh data (CSV)
				</a>
			</p>
		</section>
	</div>
</div>

<style>
	.sampul {
		padding-block: clamp(1.75rem, 5vw, 3.75rem) clamp(1.5rem, 4vw, 2.75rem);
	}

	.sampul-alis {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--accent);
		font-weight: 650;
	}

	.sampul-alis::before {
		content: '';
		width: 2.25rem;
		height: 2px;
		background: currentColor;
	}

	h1 {
		max-width: 19ch;
		margin-top: 1rem;
		font-size: clamp(2.15rem, 1.15rem + 3.8vw, 4.1rem);
		line-height: 1.04;
		letter-spacing: -0.02em;
	}

	.sampul-lede {
		max-width: 62ch;
		margin-top: 1.25rem;
		color: var(--ink-soft);
		font-size: clamp(1.02rem, 0.96rem + 0.3vw, 1.18rem);
	}

	.sampul-lede strong {
		color: var(--ink);
	}

	/* ── Angka ───────────────────────────────────────────────────────────── */

	.angka {
		display: grid;
		gap: 1.5rem;
		margin-top: clamp(1.75rem, 4vw, 2.75rem);
		padding-top: 1.5rem;
		border-top: 1px solid var(--line-strong);
	}

	.angka-daftar {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
		gap: 1.25rem 2rem;
		margin: 0;
	}

	.angka-daftar dt {
		font-family: var(--font-mono);
		font-stretch: 87.5%;
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}

	.angka-daftar dd {
		margin: 0.2rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(2rem, 1.5rem + 1.8vw, 3rem);
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.angka-daftar dd span {
		color: var(--ink-faint);
		font-size: 0.5em;
	}

	.angka-daftar .angka-tanggal {
		font-size: clamp(1.35rem, 1.1rem + 0.9vw, 1.9rem);
		line-height: 1.25;
	}

	.komposisi {
		margin: 0;
	}

	.komposisi-bilah {
		display: flex;
		gap: 3px;
		height: 0.75rem;
		overflow: hidden;
		border-radius: 999px;
	}

	.komposisi-bilah span {
		flex-basis: 0;
		min-width: 4px;
		background: var(--c);
	}

	.komposisi-legenda {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1.2rem;
		margin: 0.8rem 0 0;
		padding: 0;
		list-style: none;
		font-size: 0.875rem;
	}

	.komposisi-legenda li {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	/* ── Badan: daftar isi + prosa ───────────────────────────────────────── */

	.badan {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2rem;
		padding-top: clamp(1rem, 3vw, 2rem);
	}

	@media (min-width: 960px) {
		.badan {
			grid-template-columns: 14rem minmax(0, 46rem);
			gap: clamp(3rem, 7vw, 6.5rem);
		}

		.daftar-isi {
			position: sticky;
			top: 1.25rem;
			align-self: start;
		}
	}

	.daftar-isi ol {
		display: grid;
		gap: 0.1rem;
		margin: 0.6rem 0 0;
		padding: 0;
		list-style: none;
	}

	.daftar-isi a {
		display: flex;
		align-items: baseline;
		gap: 0.65rem;
		padding: 0.35rem 0;
		color: var(--ink-soft);
		font-weight: 550;
		text-decoration: none;
	}

	.daftar-isi a:hover {
		color: var(--accent);
	}

	.daftar-isi .no {
		font-family: var(--font-mono);
		font-stretch: 87.5%;
		font-size: 0.6875rem;
		color: var(--accent);
	}

	@media (max-width: 959px) {
		.daftar-isi ol {
			display: flex;
			flex-wrap: wrap;
			gap: 0.35rem;
		}

		.daftar-isi a {
			padding: 0.35rem 0.75rem;
			border: 1px solid var(--line-strong);
			border-radius: 999px;
			background: var(--bg-elev);
			font-size: 0.875rem;
		}

		.daftar-isi .no {
			display: none;
		}
	}

	.prosa {
		display: grid;
		gap: clamp(2.5rem, 5vw, 3.5rem);
	}

	.prosa section {
		scroll-margin-top: 1.25rem;
	}

	.prosa h2 {
		margin-bottom: 1rem;
		padding-bottom: 0.6rem;
		border-bottom: 1px solid var(--line-strong);
		font-size: clamp(1.5rem, 1.3rem + 0.7vw, 1.95rem);
	}

	.prosa h3 {
		margin: 1.75rem 0 0.6rem;
		font-size: 1.2rem;
	}

	.prosa p,
	.prosa li,
	.prosa dd {
		color: var(--ink-soft);
	}

	.prosa p + p,
	.prosa ul + p,
	.prosa p + ul,
	.prosa p + table,
	.prosa table + p {
		margin-top: 0.9rem;
	}

	.prosa ul,
	.prosa ol {
		display: grid;
		gap: 0.45rem;
		margin: 0;
		padding-left: 1.25rem;
	}

	.prosa strong {
		color: var(--ink);
	}

	.prosa a,
	.prosa :global(a[target='_blank']) {
		color: var(--ink);
	}

	.prosa a:hover,
	.prosa :global(a[target='_blank']:hover) {
		color: var(--accent);
	}

	.sumber-daftar {
		display: grid;
		gap: 1.1rem;
		margin: 0;
	}

	.sumber-daftar div {
		display: grid;
		gap: 0.25rem;
		padding-left: 1rem;
		border-left: 2px solid var(--line-strong);
	}

	.sumber-daftar dt {
		font-family: var(--font-display);
		font-size: 1.15rem;
	}

	.sumber-daftar dd {
		margin: 0;
	}

	.prosa .jenis-daftar {
		margin-top: 0.9rem;
		padding: 0;
		list-style: none;
	}

	.jenis-daftar li {
		display: flex;
		align-items: baseline;
		gap: 0.7rem;
	}

	.jenis-daftar .titik-jenis {
		transform: translateY(-0.05em);
	}

	.prosa .jenis-daftar + p {
		margin-top: 0.9rem;
	}

	.tabel-status {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9375rem;
	}

	.tabel-status th,
	.tabel-status td {
		padding: 0.75rem 0.75rem 0.75rem 0;
		border-bottom: 1px solid var(--line);
		text-align: left;
		vertical-align: top;
	}

	.tabel-status thead th {
		padding-block: 0 0.5rem;
		font-family: var(--font-mono);
		font-stretch: 87.5%;
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}

	.tabel-status tbody th {
		width: 11rem;
		font-weight: 400;
	}

	.tabel-status td {
		color: var(--ink-soft);
	}

	.prosa .tips {
		gap: 0.75rem;
	}

	.tips ::marker {
		color: var(--accent);
		font-family: var(--font-mono);
		font-size: 0.8125rem;
	}

	.unduh {
		margin-top: 1.1rem !important;
	}
</style>
