<script>
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ContactButtons from '$lib/components/ContactButtons.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import MapView from '$lib/components/MapView.svelte';
	import TautanLuar from '$lib/components/TautanLuar.svelte';
	import { queryFilter } from '$lib/filter-url.js';
	import { formatAngka, formatRating, formatTanggal } from '$lib/format.js';
	import { urlCariIsu, urlIsu } from '$lib/isu.js';
	import { daftarKontak, relEksternal, urlAman } from '$lib/kontak.js';
	import { formatKoordinat } from '$lib/shared/geo.js';
	import { JENIS } from '$lib/shared/jenis.js';
	import { SKEMA } from '$lib/shared/kiriman.js';
	import { MAGANG_STATUS } from '$lib/shared/magang-status.js';
	import { kabkotaBySlug, kabkotaLabel } from '$lib/shared/wilayah.js';

	let { data } = $props();

	const c = $derived(data.c);

	const STEMPEL = { terbukti: 'Terbukti', indikasi: 'Ada indikasi', belum: 'Belum diketahui' };
	const IKON_STATUS = /** @type {const} */ ({
		terbukti: 'verified',
		indikasi: 'briefcase',
		belum: 'info'
	});
	const PENJELASAN = {
		terbukti: `${MAGANG_STATUS.terbukti.keterangan} Jadwal dan syaratnya tetap perlu ditanyakan langsung.`,
		indikasi:
			'Halaman karir atau catatan kurasi menyebut program magang, PKL, atau internship. Pastikan programnya masih dibuka dengan bertanya langsung.',
		belum:
			'Belum ada bukti yang tercatat. Banyak tempat tetap menerima mahasiswa magang tanpa mengumumkannya, jadi tanyakan langsung lewat kontak di atas.'
	};
	/** @type {Record<string, string>} */
	const TIPE_BUKTI = {
		'halaman-karir': 'Halaman karir',
		kurasi: 'Catatan kurasi',
		lowongan: 'Lowongan',
		pengalaman: 'Pengalaman magang'
	};
	/** @type {Record<string, string>} */
	const NAMA_SUMBER = {
		maps: 'Google Maps',
		osm: 'OpenStreetMap',
		website: 'Situs web',
		kurasi: 'Kurasi manual',
		mahasiswa: 'Usulan mahasiswa'
	};

	const labelSkema = (/** @type {string} */ s) =>
		SKEMA[/** @type {import('$lib/shared/kiriman.js').Skema} */ (s)] ?? s;
	const hostTampil = (/** @type {string} */ url) => new URL(url).hostname.replace(/^www\./, '');
	const tgl = (/** @type {string | null} */ v) => formatTanggal(v, { pendek: true });

	const kab = $derived(kabkotaLabel(c.kabkota));
	const kabNama = $derived(kabkotaBySlug(c.kabkota)?.nama ?? kab);
	const kec = $derived(c.kecamatan && c.kecamatan !== kab ? c.kecamatan : null);
	const wilayah = $derived(`${kec ? `Kec. ${kec}, ` : ''}${kabNama}`);
	const titik = $derived(c.lat != null && c.lng != null ? { lat: c.lat, lng: c.lng } : null);
	const petaItems = $derived(
		titik ? [{ slug: c.slug, nama: c.nama, jenis: c.jenis, kabkota: c.kabkota, ...titik }] : []
	);
	const kontak = $derived(daftarKontak(c, { lengkap: true }));
	const rel = $derived(relEksternal(c.origin));
	const rute = $derived(
		titik ? `https://www.google.com/maps/dir/?api=1&destination=${titik.lat},${titik.lng}` : null
	);
	const osm = $derived(
		urlAman(c.osm_url) ??
			(titik
				? `https://www.openstreetmap.org/?mlat=${titik.lat}&mlon=${titik.lng}#map=18/${titik.lat}/${titik.lng}`
				: null)
	);
	const adaLencana = $derived(
		c.lowongan.length > 0 || c.rating != null || c.origin === 'mahasiswa'
	);

	/** @param {string} s @param {number} n */
	function potong(s, n) {
		if (s.length <= n) return s;
		const t = s.slice(0, n - 1);
		const spasi = t.lastIndexOf(' ');
		return `${(spasi > n - 30 ? t.slice(0, spasi) : t).replace(/[\s,.;:–-]+$/, '')}…`;
	}

	const judul = $derived(`${c.nama} · ${JENIS[c.jenis].short} di ${kab} · Magang IT Sulsel`);
	const deskripsi = $derived(
		potong(
			[
				`${JENIS[c.jenis].label} di ${wilayah}.`,
				c.magang === 'belum' ? '' : `${MAGANG_STATUS[c.magang].label}.`,
				c.deskripsi ? c.deskripsi.trim().replace(/([^.!?])$/, '$1.') : '',
				'Lihat kontak dan lokasinya untuk bertanya soal magang atau PKL.'
			]
				.filter(Boolean)
				.join(' '),
			160
		)
	);
	const kanonik = $derived(new URL(resolve('/perusahaan/[slug]', { slug: c.slug }), page.url).href);
	const isianTempat = $derived({ tempat: `${c.nama} (${kanonik})` });
	const urlKoreksi = $derived(
		urlIsu('koreksi-data', { judul: `Koreksi: ${c.nama}`, isian: isianTempat })
	);
	const urlCerita = $derived(
		urlIsu('cerita-magang', { judul: `Cerita magang: ${c.nama}`, isian: isianTempat })
	);

	/** URL direktori asal (dengan filternya) bila halaman ini dibuka dari daftar. */
	let asal = $state(/** @type {URL | null} */ (null));
	afterNavigate(({ from }) => {
		asal = from?.route.id === '/' ? from.url : null;
	});

	/** Kembali lewat riwayat supaya filter, jumlah kartu, dan posisi gulir pulih. @param {MouseEvent} e */
	function kembali(e) {
		if (!asal || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		history.back();
	}
</script>

<svelte:head>
	<title>{judul}</title>
	<meta name="description" content={deskripsi} />
	<link rel="canonical" href={kanonik} />
	<meta property="og:type" content="website" />
	<meta property="og:locale" content="id_ID" />
	<meta property="og:title" content={judul} />
	<meta property="og:description" content={deskripsi} />
	<meta property="og:url" content={kanonik} />
</svelte:head>

<article class="entri j-{c.jenis}" aria-labelledby="nama-entri">
	<nav class="jejak wadah" aria-label="Jejak halaman">
		<ol>
			<li>
				<a
					href={asal?.search ? resolve(`/?${asal.search.slice(1)}`) : resolve('/')}
					onclick={kembali}
				>
					{#if asal}<Icon name="arrow" size={14} class="jejak-balik" /> Kembali ke hasil{:else}Direktori{/if}
				</a>
			</li>
			<li><a href={resolve(`/?${queryFilter({ kab: [c.kabkota] })}`)}>{kab}</a></li>
			<li><span aria-current="page">{c.nama}</span></li>
		</ol>
	</nav>

	<header class="kepala-entri wadah">
		<div class="kepala-teks">
			<p class="entri-meta">
				<span class="titik-jenis" aria-hidden="true"></span>
				<span class="entri-jenis">{JENIS[c.jenis].label}</span>
				<span>{wilayah}</span>
			</p>
			<h1 id="nama-entri">{c.nama}</h1>

			{#if adaLencana}
				<ul class="entri-lencana">
					{#if c.lowongan.length}
						<li class="lencana lencana--lowongan">
							<Icon name="briefcase" size={13} />
							{c.lowongan.length} lowongan aktif
						</li>
					{/if}
					{#if c.rating != null}
						<li class="entri-rating">
							<Icon name="star" size={14} />
							<strong>{formatRating(c.rating)}</strong>
							{#if c.jumlah_ulasan}
								<span>dari {formatAngka(c.jumlah_ulasan)} ulasan di Google Maps</span>
							{/if}
						</li>
					{/if}
					{#if c.origin === 'mahasiswa'}
						<li class="lencana lencana--belum">Diusulkan mahasiswa</li>
					{/if}
				</ul>
			{/if}

			{#if c.deskripsi}
				<p class="entri-lede">{c.deskripsi}</p>
			{/if}
			{#if c.tags.length}
				<p class="entri-tag">
					{c.tags.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(' · ')}
				</p>
			{/if}
		</div>

		<p class="stempel stempel--{c.magang}">
			<span class="stempel-kecil">Status magang</span>
			<strong>{STEMPEL[c.magang]}</strong>
			{#if c.diperbarui_pada}
				<span class="stempel-kecil">per {tgl(c.diperbarui_pada)}</span>
			{/if}
		</p>
	</header>

	{#if c.peringatan}
		<aside class="catatan wadah" aria-labelledby="judul-catatan">
			<div class="catatan-isi">
				<Icon name="alert" size={22} />
				<div>
					<h2 id="judul-catatan" class="label-mikro">Catatan penting</h2>
					<p>{c.peringatan}</p>
				</div>
			</div>
		</aside>
	{/if}

	<div class="entri-isi wadah">
		<section class="bagian bagian--hubungi" aria-labelledby="judul-hubungi">
			<h2 id="judul-hubungi" class="bagian-judul">
				<span class="bagian-no" aria-hidden="true">01</span> Hubungi
			</h2>

			{#if kontak.length}
				<ContactButtons {c} />
			{:else}
				<p class="kosong-kecil">
					Belum ada kontak yang tercatat. Coba datangi alamatnya, atau tanyakan lewat kenalan yang
					bekerja di sana.
				</p>
			{/if}

			{#if c.web_host}
				<p class="info-web">
					<Icon name="alert" size={16} />
					<span>
						{#if c.status_web === 'dibajak'}
							Situs lamanya (<span class="mono">{c.web_host}</span>) tampak dibajak, jadi tidak
							ditautkan. Jangan isi data apa pun di sana.
						{:else}
							Situs <span class="mono">{c.web_host}</span> tidak bisa dibuka saat diperiksa, jadi tidak
							ditautkan.
						{/if}
					</span>
				</p>
			{/if}

			<div class="saran">
				<p class="label-mikro">Sebelum menghubungi</p>
				<ol>
					<li>Perkenalkan diri: nama, kampus, program studi, dan semester.</li>
					<li>
						Sebut bidang yang diminati dan periodenya, misalnya “web developer, Januari sampai
						Maret”.
					</li>
					<li>Hubungi di jam kerja. Bila diminta, kirim CV dan portofolio lewat email.</li>
				</ol>
				{#if kontak.some((k) => k.jenis === 'wa')}
					<p class="saran-wa">
						Tombol WhatsApp membuka pesan pembuka yang bisa Anda ubah sebelum dikirim.
					</p>
				{/if}
				<p class="saran-kaki">
					Magang yang sah tidak memungut biaya.
					<a href={resolve('/tentang#tips')}>Baca tips aman magang</a>
				</p>
			</div>
		</section>

		<section class="bagian bagian--lokasi" aria-labelledby="judul-lokasi">
			<h2 id="judul-lokasi" class="bagian-judul">
				<span class="bagian-no" aria-hidden="true">02</span> Lokasi
			</h2>

			{#if titik}
				<div class="peta-mini">
					<MapView items={petaItems} mini label="Peta lokasi {c.nama}" />
				</div>
			{/if}

			<dl class="rinci">
				<div>
					<dt>Alamat</dt>
					<dd>{c.alamat ?? 'Belum tercatat'}</dd>
				</div>
				<div>
					<dt>Wilayah</dt>
					<dd>{wilayah}</dd>
				</div>
				{#if titik}
					<div>
						<dt>Koordinat</dt>
						<dd class="mono">{formatKoordinat(titik.lat, titik.lng)}</dd>
					</div>
				{/if}
			</dl>

			{#if rute || osm}
				<p class="lokasi-aksi">
					{#if rute}
						<TautanLuar href={rute} class="tombol">
							<Icon name="locate" size={16} /> Rute ke sini
						</TautanLuar>
					{/if}
					{#if osm}
						<TautanLuar href={osm} class="tombol tombol--tenang">
							<Icon name="map" size={16} /> OpenStreetMap
						</TautanLuar>
					{/if}
				</p>
			{/if}

			<div class="sumber">
				<p class="label-mikro">Sumber data</p>
				<p>{c.sumber.map((s) => NAMA_SUMBER[s] ?? s).join(' · ') || 'Tidak tercatat'}</p>
				{#if c.diperbarui_pada}
					<p>Terakhir diperiksa {formatTanggal(c.diperbarui_pada)}.</p>
				{/if}
				<p class="sumber-koreksi">
					Data salah, tempat sudah tutup, atau Anda pengelolanya?
					<TautanLuar href={urlKoreksi}>Laporkan koreksi</TautanLuar>
				</p>
			</div>
		</section>

		<section class="bagian bagian--magang" aria-labelledby="judul-magang">
			<h2 id="judul-magang" class="bagian-judul">
				<span class="bagian-no" aria-hidden="true">03</span> Magang &amp; lowongan
			</h2>

			<div class="status status--{c.magang}">
				<Icon name={IKON_STATUS[c.magang]} size={22} />
				<div>
					<p class="status-label">{MAGANG_STATUS[c.magang].label}</p>
					<p>{PENJELASAN[c.magang]}</p>
				</div>
			</div>

			{#if c.bukti.length}
				<h3 class="sub-judul">Bukti yang tercatat</h3>
				<ol class="bukti-daftar">
					{#each c.bukti as b, i (i)}
						{@const url = urlAman(b.url)}
						<li class="bukti">
							<p class="label-mikro">
								{TIPE_BUKTI[b.tipe] ?? b.tipe}{#if b.tanggal}<span aria-hidden="true">
										·
									</span>dicek {tgl(b.tanggal)}{/if}
							</p>
							{#if b.kutipan}
								<blockquote>{b.kutipan}</blockquote>
							{/if}
							{#if url}
								<TautanLuar href={url} {rel} class="bukti-tautan">
									{hostTampil(url)}
									<Icon name="external" size={14} />
								</TautanLuar>
							{/if}
						</li>
					{/each}
				</ol>
			{/if}

			{#if urlAman(c.url_karir)}
				<p class="karir">
					<TautanLuar href={c.url_karir} {rel} class="tombol">
						<Icon name="briefcase" size={16} /> Buka halaman karir resminya
					</TautanLuar>
				</p>
			{/if}

			{#if c.lowongan.length}
				<h3 class="sub-judul">Lowongan aktif</h3>
				<ul class="lowongan-daftar">
					{#each c.lowongan as o (o.id)}
						<li class="lowongan">
							<p class="lowongan-judul">
								{#if urlAman(o.url)}
									<TautanLuar href={o.url} rel={relEksternal(o.sumber)}>{o.judul}</TautanLuar>
								{:else}
									{o.judul}
								{/if}
								{#if o.is_magang}
									<span class="lencana lencana--terbukti">Magang</span>
								{/if}
							</p>
							<p class="label-mikro">
								{o.sumber === 'mahasiswa' ? 'Info mahasiswa' : (o.sumber_detail ?? 'Pemindaian')}
								<span aria-hidden="true"> · </span>ditemukan {tgl(o.ditemukan_pada)}
								<span aria-hidden="true"> · </span>{o.tutup_pada
									? `tutup ${tgl(o.tutup_pada)}`
									: `perkiraan berakhir ${tgl(o.kedaluwarsa_pada)}`}
							</p>
							{#if o.catatan}
								<p class="lowongan-catatan">{o.catatan}</p>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="bagian bagian--cerita" aria-labelledby="judul-cerita">
			<h2 id="judul-cerita" class="bagian-judul">
				<span class="bagian-no" aria-hidden="true">04</span> Cerita magang
			</h2>

			{#if c.pengalaman.length}
				<ul class="cerita-daftar">
					{#each c.pengalaman as p (p.id)}
						<li class="cerita">
							<p class="label-mikro">
								{p.tahun}<span aria-hidden="true"> · </span>{labelSkema(
									p.skema
								)}{#if p.durasi_bulan}<span aria-hidden="true"> · </span>{p.durasi_bulan} bulan{/if}
							</p>
							<p class="cerita-bidang">{p.bidang}</p>
							{#if p.catatan}
								<blockquote class="cerita-catatan">{p.catatan}</blockquote>
							{/if}
							{#if p.uang_saku || p.sertifikat}
								<ul class="cerita-fakta">
									{#if p.uang_saku}
										<li>Uang saku: {p.uang_saku === 'ada' ? 'ada' : 'tidak ada'}</li>
									{/if}
									{#if p.sertifikat}
										<li>Sertifikat: {p.sertifikat === 'ada' ? 'ada' : 'tidak ada'}</li>
									{/if}
								</ul>
							{/if}
							<p class="cerita-oleh">
								{p.nama_tampil}{#if p.kampus}, {p.kampus}{/if}
							</p>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="kosong-kecil">
					Belum ada cerita magang yang tercatat untuk tempat ini. Cerita dari mahasiswa yang pernah
					magang di sini (bidang, durasi, uang saku, sertifikat) sangat membantu adik tingkat.
				</p>
			{/if}
			<p class="cerita-aksi">
				<TautanLuar href={urlCerita} class="tombol">
					<Icon name="plus" size={16} /> Tulis cerita magang
				</TautanLuar>
				<TautanLuar href={urlCariIsu('Cerita magang:', c.nama)} class="tombol tombol--tenang">
					<Icon name="github" size={16} /> Cerita lain di GitHub
				</TautanLuar>
			</p>
		</section>
	</div>
</article>

<style>
	/* ── Jejak ───────────────────────────────────────────────────────────── */

	.jejak {
		padding-top: clamp(1rem, 2.5vw, 1.5rem);
	}

	.jejak ol {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.55rem;
		margin: 0;
		padding: 0;
		list-style: none;
		font-family: var(--font-mono);
		font-stretch: 87.5%;
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}

	.jejak li {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		min-width: 0;
	}

	.jejak li + li::before {
		content: '/';
		color: var(--ink-faint);
	}

	.jejak a {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding-block: 0.3rem;
		color: var(--ink-soft);
		text-decoration: none;
	}

	.jejak a:hover {
		color: var(--accent);
	}

	.jejak :global(.jejak-balik) {
		transform: scaleX(-1);
	}

	.jejak [aria-current] {
		overflow: hidden;
		max-width: 36ch;
		color: var(--ink);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* ── Kepala entri ────────────────────────────────────────────────────── */

	.kepala-entri {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1.75rem 3rem;
		padding-block: clamp(1.25rem, 3.5vw, 2.5rem) clamp(1.5rem, 3vw, 2.25rem);
	}

	@media (min-width: 860px) {
		.kepala-entri {
			grid-template-columns: minmax(0, 1fr) auto;
			align-items: end;
		}
	}

	/* garis warna jenis di atas nama, seperti tab lembar atlas */
	.kepala-teks::before {
		content: '';
		display: block;
		width: 3.25rem;
		height: 4px;
		margin-bottom: 1rem;
		border-radius: 2px;
		background: var(--c);
	}

	.entri-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.6rem;
		font-family: var(--font-mono);
		font-stretch: 87.5%;
		font-size: 0.75rem;
		font-weight: 500;
		letter-spacing: 0.07em;
		line-height: 1.4;
		text-transform: uppercase;
		color: var(--ink-soft);
	}

	.entri-jenis {
		color: var(--c);
		font-weight: 650;
	}

	h1 {
		max-width: 24ch;
		margin-top: 0.7rem;
		font-size: clamp(2.05rem, 1.2rem + 3.1vw, 3.9rem);
		line-height: 1.04;
		letter-spacing: -0.02em;
		overflow-wrap: anywhere;
	}

	.entri-lencana {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.45rem 0.9rem;
		margin: 1.1rem 0 0;
		padding: 0;
		list-style: none;
	}

	.entri-rating {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.875rem;
		color: var(--ink-soft);
	}

	.entri-rating strong {
		color: var(--ink);
	}

	.entri-rating :global(.ikon) {
		color: var(--gold);
		fill: var(--gold);
	}

	.entri-lede {
		max-width: 62ch;
		margin-top: 1.1rem;
		color: var(--ink-soft);
		font-size: clamp(1.02rem, 0.97rem + 0.25vw, 1.15rem);
	}

	.entri-tag {
		max-width: 70ch;
		margin-top: 0.6rem;
		color: var(--ink-faint);
		font-size: 0.875rem;
	}

	/* stempel status magang: cap tinta di sudut lembar */
	.stempel {
		justify-self: start;
		display: grid;
		justify-items: center;
		gap: 0.3rem;
		min-width: 11rem;
		padding: 0.75rem 1.2rem 0.65rem;
		border: 2px solid currentColor;
		border-radius: 6px;
		outline: 1px solid currentColor;
		outline-offset: 3px;
		color: var(--sc);
		font-family: var(--font-mono);
		font-stretch: 87.5%;
		line-height: 1.1;
		text-align: center;
		text-transform: uppercase;
		transform: rotate(-3.5deg);
		animation: cap 0.55s var(--ease-out) 0.2s backwards;
	}

	.stempel strong {
		font-size: 1.12rem;
		font-weight: 700;
		letter-spacing: 0.07em;
	}

	.stempel-kecil {
		font-size: 0.625rem;
		font-weight: 500;
		letter-spacing: 0.14em;
	}

	.stempel--terbukti {
		--sc: var(--ok);
	}

	.stempel--indikasi {
		--sc: var(--sea);
	}

	.stempel--belum {
		--sc: var(--ink-faint);
		border-style: dashed;
		outline-style: dashed;
	}

	@media (min-width: 860px) {
		.stempel {
			justify-self: end;
			margin: 0 0.5rem 0.4rem 0;
		}
	}

	@keyframes cap {
		from {
			opacity: 0;
			transform: rotate(-3.5deg) scale(1.4);
		}
		to {
			opacity: 1;
			transform: rotate(-3.5deg) scale(1);
		}
	}

	/* ── Catatan penting ─────────────────────────────────────────────────── */

	.catatan {
		margin-bottom: clamp(1.5rem, 3vw, 2.25rem);
	}

	.catatan-isi {
		display: flex;
		align-items: flex-start;
		gap: 0.9rem;
		max-width: 60rem;
		padding: 1rem 1.25rem;
		border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--line));
		border-left: 4px solid var(--accent);
		border-radius: var(--radius-sm);
		background: var(--accent-soft);
	}

	.catatan-isi :global(.ikon) {
		margin-top: 0.1rem;
		color: var(--accent-strong);
	}

	.catatan h2 {
		margin-bottom: 0.25rem;
		color: var(--accent-strong);
		font-weight: 650;
	}

	/* ── Isi: dua kolom di layar lebar, lokasi di kanan ──────────────────── */

	.entri-isi {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: clamp(2.25rem, 5vw, 3.25rem);
	}

	@media (min-width: 980px) {
		.entri-isi {
			grid-template-columns: minmax(0, 1fr) clamp(20rem, 29vw, 25.5rem);
			/* baris terakhir 1fr menampung sisa tinggi kolom lokasi supaya bagian kiri tidak renggang */
			grid-template-rows: repeat(4, auto) 1fr;
			column-gap: clamp(2.5rem, 5vw, 4.5rem);
		}

		.bagian {
			grid-column: 1;
		}

		.bagian--lokasi {
			grid-column: 2;
			grid-row: 1 / -1;
			align-self: start;
		}
	}

	@media (min-width: 980px) and (min-height: 760px) {
		.bagian--lokasi {
			position: sticky;
			top: 1rem;
		}
	}

	.bagian-judul {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		margin-bottom: 1.1rem;
		padding-bottom: 0.65rem;
		border-bottom: 1px solid var(--line-strong);
		font-size: clamp(1.35rem, 1.2rem + 0.5vw, 1.7rem);
	}

	.bagian-no {
		font-family: var(--font-mono);
		font-stretch: 87.5%;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		color: var(--accent);
	}

	.sub-judul {
		margin: 1.6rem 0 0.75rem;
		font-size: 1.15rem;
	}

	.kosong-kecil {
		max-width: 62ch;
		color: var(--ink-soft);
	}

	/* ── Hubungi ─────────────────────────────────────────────────────────── */

	.info-web {
		display: flex;
		align-items: flex-start;
		gap: 0.55rem;
		max-width: 62ch;
		margin-top: 0.9rem;
		color: var(--warn);
		font-size: 0.9375rem;
	}

	.info-web :global(.ikon) {
		flex: none;
		margin-top: 0.2rem;
	}

	.saran {
		margin-top: 1.25rem;
		padding: 1rem 1.2rem;
		border: 1px dashed var(--line-strong);
		border-radius: var(--radius-sm);
	}

	.saran ol {
		display: grid;
		gap: 0.3rem;
		margin: 0.55rem 0 0;
		padding-left: 1.25rem;
		color: var(--ink-soft);
	}

	.saran ol ::marker {
		color: var(--accent);
		font-family: var(--font-mono);
		font-size: 0.8125rem;
	}

	.saran-wa {
		margin-top: 0.6rem;
		color: var(--ink-soft);
		font-size: 0.875rem;
	}

	.saran-kaki {
		margin-top: 0.75rem;
		font-weight: 600;
	}

	.saran-kaki a {
		margin-left: 0.2rem;
		color: var(--accent);
	}

	/* ── Lokasi ──────────────────────────────────────────────────────────── */

	.peta-mini {
		height: clamp(14rem, 34vw, 17rem);
		margin-bottom: 1.1rem;
	}

	.rinci {
		display: grid;
		gap: 0.75rem;
		margin: 0;
	}

	.rinci div {
		display: grid;
		gap: 0.1rem;
	}

	.rinci dt {
		font-family: var(--font-mono);
		font-stretch: 87.5%;
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}

	.rinci dd {
		margin: 0;
		overflow-wrap: anywhere;
	}

	.rinci dd.mono {
		font-size: 0.875rem;
		font-variant-numeric: tabular-nums;
	}

	.lokasi-aksi {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 1rem;
	}

	.sumber {
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px dashed var(--line-strong);
		color: var(--ink-soft);
		font-size: 0.875rem;
	}

	.sumber .label-mikro {
		margin-bottom: 0.3rem;
	}

	.sumber p + p {
		margin-top: 0.2rem;
	}

	.sumber .sumber-koreksi {
		margin-top: 0.6rem;
	}

	.sumber-koreksi :global(a) {
		color: var(--ink);
		font-weight: 600;
	}

	.sumber-koreksi :global(a:hover) {
		color: var(--accent);
	}

	.cerita-aksi {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 1rem;
	}

	/* ── Magang & lowongan ───────────────────────────────────────────────── */

	.status {
		display: flex;
		align-items: flex-start;
		gap: 0.9rem;
		padding: 1rem 1.2rem;
		border-radius: var(--radius-sm);
		background: var(--ss);
	}

	.status--terbukti {
		--ss: var(--ok-soft);
		--si: var(--ok);
	}

	.status--indikasi {
		--ss: var(--sea-soft);
		--si: var(--sea);
	}

	.status--belum {
		--ss: var(--bg-sunk);
		--si: var(--ink-soft);
	}

	.status :global(.ikon) {
		flex: none;
		margin-top: 0.1rem;
		color: var(--si);
	}

	.status-label {
		font-weight: 650;
	}

	.status p + p {
		max-width: 62ch;
		margin-top: 0.2rem;
		color: var(--ink-soft);
	}

	.bukti-daftar,
	.lowongan-daftar,
	.cerita-daftar {
		display: grid;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.bukti {
		padding: 0.9rem 1.1rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-sm);
		background: var(--bg-elev);
	}

	.bukti blockquote {
		margin: 0.45rem 0 0;
		padding-left: 0.9rem;
		border-left: 2px solid var(--gold);
		font-family: var(--font-display);
		font-size: 1.05rem;
		line-height: 1.4;
		overflow-wrap: anywhere;
	}

	.bukti :global(.bukti-tautan) {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		margin-top: 0.55rem;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.karir {
		margin-top: 1rem;
	}

	.lowongan {
		display: grid;
		gap: 0.3rem;
		padding: 0.8rem 1rem;
		border-left: 3px solid var(--gold);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		background: var(--bg-elev);
	}

	.lowongan-judul {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem 0.6rem;
		font-weight: 600;
	}

	.lowongan-catatan {
		color: var(--ink-soft);
		font-size: 0.9375rem;
	}

	/* ── Cerita magang ───────────────────────────────────────────────────── */

	.cerita-daftar {
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
		gap: 1rem;
	}

	.cerita {
		display: grid;
		align-content: start;
		gap: 0.45rem;
		padding: 1rem 1.1rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--bg-elev);
	}

	.cerita-bidang {
		font-family: var(--font-display);
		font-size: 1.15rem;
		line-height: 1.25;
	}

	.cerita-catatan {
		margin: 0;
		color: var(--ink-soft);
		overflow-wrap: anywhere;
	}

	.cerita-fakta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.9rem;
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 0.8125rem;
	}

	.cerita-oleh {
		color: var(--ink-faint);
		font-size: 0.8125rem;
	}
</style>
