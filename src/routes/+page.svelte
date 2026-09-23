<script>
	import { onMount, tick, untrack } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { navigating, page } from '$app/state';
	import CompanyCard from '$lib/components/CompanyCard.svelte';
	import Filters from '$lib/components/Filters.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import LembarAtlas from '$lib/components/LembarAtlas.svelte';
	import MapView from '$lib/components/MapView.svelte';
	import { jumlahFilterAktif, LANGKAH, queryDariForm, queryFilter } from '$lib/filter-url.js';
	import { formatAngka } from '$lib/format.js';
	import { lokasi, mintaLokasi } from '$lib/lokasi.svelte.js';
	import { haversineKm } from '$lib/shared/geo.js';
	import { JENIS } from '$lib/shared/jenis.js';
	import { kabkotaLabel } from '$lib/shared/wilayah.js';

	let { data } = $props();

	const CONTOH = ['aplikasi', 'Diskominfo', 'internet', 'Tamalanrea', 'Parepare'];

	let js = $state(false);
	let q = $state(untrack(() => data.filters.q));
	/** @type {'daftar' | 'peta'} tampilan hasil di layar sempit */
	let tampilan = $state('daftar');
	/** @type {string | null} */
	let dipilih = $state(null);
	/** indeks kartu pertama yang dianimasikan, supaya kartu lama tidak "muncul" ulang */
	let mulaiAnimasi = $state(0);
	let menambah = false;

	/** @type {HTMLFormElement | undefined} */
	let formEl = $state();
	/** @type {HTMLInputElement | undefined} */
	let inputQ = $state();
	/** @type {HTMLElement | undefined} */
	let hasilEl = $state();
	/** @type {ReturnType<typeof MapView> | undefined} */
	let petaRef = $state();
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let jedaKetik;

	const posisi = $derived(
		lokasi.status === 'ok' && lokasi.lat != null && lokasi.lng != null
			? { lat: lokasi.lat, lng: lokasi.lng }
			: null
	);

	/** Jarak (km) per slug; hanya dihitung di browser setelah izin lokasi diberikan. */
	const jarak = $derived.by(() => {
		/** @type {[string, number][]} */
		const pasangan = [];
		if (posisi) {
			for (const c of data.items) {
				if (c.lat != null && c.lng != null) {
					pasangan.push([c.slug, haversineKm(posisi, { lat: c.lat, lng: c.lng })]);
				}
			}
		}
		return new Map(pasangan);
	});

	const terdekat = $derived(data.filters.urut === 'terdekat' && posisi != null);
	const urutan = $derived(
		terdekat
			? [...data.items].sort(
					(a, b) => (jarak.get(a.slug) ?? Infinity) - (jarak.get(b.slug) ?? Infinity)
				)
			: data.items
	);
	const tampil = $derived(urutan.slice(0, data.n));
	const sisa = $derived(Math.max(0, urutan.length - data.n));
	const aktif = $derived(jumlahFilterAktif(data.filters));
	const memuat = $derived(navigating.to?.route.id === '/');

	const keteranganUrut = $derived(
		data.filters.urut === 'nama'
			? 'Urut nama A–Z'
			: terdekat
				? 'Urut dari yang terdekat'
				: data.filters.q
					? 'Urut paling cocok'
					: 'Urut paling lengkap: bukti magang, lowongan, lalu kontak'
	);

	const judul = $derived.by(() => {
		const f = data.filters;
		const merek = 'Magang IT Sulsel';
		if (f.q) return `“${f.q}”: ${formatAngka(data.total)} tempat · ${merek}`;
		const wilayah = f.kab.length === 1 ? kabkotaLabel(f.kab[0]) : 'Sulawesi Selatan';
		if (f.jenis.length === 1) return `${JENIS[f.jenis[0]].label} di ${wilayah} · ${merek}`;
		if (f.kab.length === 1) return `Tempat magang IT di ${wilayah} · ${merek}`;
		return `${merek}: direktori tempat magang informatika di Sulawesi Selatan`;
	});
	const deskripsi = $derived(
		`Direktori ${formatAngka(data.stats.total)} software house, ISP, digital agency, instansi, dan startup di ${data.stats.kabkota} kabupaten/kota Sulawesi Selatan, lengkap dengan kontak untuk bertanya soal magang atau PKL.`
	);
	/** filter aktif tanpa urutan: untuk canonical dan unduhan CSV */
	const qsFilter = $derived(queryFilter(data.filters, { tanpaUrut: true }));
	// saat SSR resolve() menghasilkan path relatif, jadi URL absolut dibangun terhadap page.url
	const kanonik = $derived(new URL(resolve(qsFilter ? `/?${qsFilter}` : '/'), page.url).href);

	const layarLebar = () => matchMedia('(min-width: 1080px)').matches;
	const gerakHalus = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;

	onMount(() => {
		js = true;
		return () => clearTimeout(jedaKetik);
	});

	// ?urut=terdekat dari tautan yang dibagikan: minta lokasi sekali saat halaman dibuka
	$effect(() => {
		if (js && data.filters.urut === 'terdekat' && lokasi.status === 'awal') mintaLokasi();
	});

	afterNavigate(() => {
		// jangan timpa teks yang sedang diketik (hasil debounce bisa datang di tengah ketikan)
		if (document.activeElement !== inputQ) q = data.filters.q;
		if (!menambah) {
			mulaiAnimasi = 0;
			dipilih = null;
		}
		menambah = false;
	});

	function kirim() {
		clearTimeout(jedaKetik);
		if (!formEl) return;
		const qs = queryDariForm(new FormData(formEl));
		goto(resolve(qs ? `/?${qs}` : '/'), { keepFocus: true, noScroll: true, replaceState: true });
	}

	function ketik() {
		clearTimeout(jedaKetik);
		jedaKetik = setTimeout(kirim, 350);
	}

	/** @param {Event} e */
	function saatUbah(e) {
		const el = /** @type {HTMLInputElement | HTMLSelectElement} */ (e.target);
		if (el.name === 'urut' && el.value === 'terdekat' && lokasi.status !== 'ok') mintaLokasi();
		kirim();
	}

	/** @param {SubmitEvent} e */
	function saatKirim(e) {
		e.preventDefault();
		kirim();
		// tutup keyboard layar sentuh setelah menekan "Cari"
		if (matchMedia('(pointer: coarse)').matches) inputQ?.blur();
	}

	/** @param {number} n */
	async function tampilkanSampai(n) {
		menambah = true;
		mulaiAnimasi = data.n;
		const bulat = Math.ceil(n / LANGKAH) * LANGKAH;
		await goto(resolve(`/?${queryFilter(data.filters, { n: bulat })}`), {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
		await tick();
	}

	/** @param {MouseEvent} e */
	async function tambah(e) {
		if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		const sebelum = data.n;
		await tampilkanSampai(sebelum + LANGKAH);
		// pindahkan fokus ke kartu pertama yang baru supaya pengguna keyboard tidak kehilangan tempat
		const c = urutan[sebelum];
		if (c) document.getElementById(`k-${c.slug}`)?.focus({ preventScroll: true });
	}

	/** Dari popup peta: tampilkan kartunya di daftar. @param {string} slug */
	async function pilihDariPeta(slug) {
		const i = urutan.findIndex((c) => c.slug === slug);
		if (i < 0) return;
		if (i >= data.n) await tampilkanSampai(i + 1);
		tampilan = 'daftar';
		dipilih = slug;
		await tick();
		const el = document.getElementById(`k-${slug}`);
		el?.scrollIntoView({ behavior: gerakHalus() ? 'smooth' : 'auto', block: 'center' });
		el?.focus({ preventScroll: true });
	}

	/** Dari tombol "Peta" di kartu. @param {string} slug */
	async function lihatDiPeta(slug) {
		dipilih = slug;
		const lebar = layarLebar();
		if (!lebar) {
			tampilan = 'peta';
			await tick();
			hasilEl?.scrollIntoView({ block: 'start' });
		}
		// di layar sempit tombol asal ikut tersembunyi, jadi fokus pindah ke popup
		petaRef?.fokus(slug, !lebar);
	}

	/** @param {'daftar' | 'peta'} t */
	async function gantiTampilan(t) {
		if (tampilan === t) return;
		tampilan = t;
		await tick();
		const kartu = t === 'daftar' && dipilih ? document.getElementById(`k-${dipilih}`) : null;
		if (kartu) kartu.scrollIntoView({ block: 'center' });
		else hasilEl?.scrollIntoView({ block: 'start' });
	}

	/** @type {import('./$types').Snapshot<{ tampilan: 'daftar' | 'peta' }>} */
	export const snapshot = {
		capture: () => ({ tampilan }),
		restore: (s) => {
			tampilan = s.tampilan;
		}
	};
</script>

<svelte:head>
	<title>{judul}</title>
	<meta name="description" content={deskripsi} />
	<link rel="canonical" href={kanonik} />
	{#if data.filters.q}
		<meta name="robots" content="noindex, follow" />
	{/if}
	<meta property="og:type" content="website" />
	<meta property="og:locale" content="id_ID" />
	<meta property="og:title" content={judul} />
	<meta property="og:description" content={deskripsi} />
</svelte:head>

<section class="sampul wadah" aria-labelledby="judul-sampul">
	<div class="sampul-teks">
		<p class="label-mikro sampul-alis">Atlas magang · Sulawesi Selatan</p>
		<h1 id="judul-sampul">
			Tempat magang informatika, dari <span class="rute">Makassar</span> sampai
			<span class="rute">Selayar</span>.
		</h1>
		<p class="sampul-lede">
			<strong>{formatAngka(data.stats.total)}</strong> software house, ISP, agency, instansi, dan
			startup di <strong>{data.stats.kabkota}</strong> kabupaten/kota. Hubungi langsung lewat WhatsApp,
			telepon, atau email, lalu tanyakan kesempatan magang atau PKL.
		</p>

		<div class="cari">
			<Icon name="search" size={20} class="cari-ikon" />
			<label for="q" class="sr-only">Cari nama tempat, bidang, atau alamat</label>
			<input
				bind:this={inputQ}
				bind:value={q}
				oninput={ketik}
				id="q"
				name="q"
				type="search"
				form="saring"
				maxlength="100"
				placeholder="Cari nama, bidang, atau kecamatan"
				autocomplete="off"
				spellcheck="false"
				enterkeyhint="search"
			/>
			<button class="tombol tombol--utama cari-tombol" type="submit" form="saring">Cari</button>
		</div>

		<p class="contoh">
			<span class="label-mikro">Coba</span>
			{#each CONTOH as k (k)}
				<a href={resolve(`/?${queryFilter({ q: k })}`)}>{k}</a>
			{/each}
		</p>
	</div>

	<div class="sampul-lembar">
		<LembarAtlas items={data.items} />
	</div>
</section>

<form
	bind:this={formEl}
	id="saring"
	class="saring-wadah wadah"
	method="GET"
	action={resolve('/')}
	aria-label="Saring hasil"
	onchange={saatUbah}
	onsubmit={saatKirim}
>
	<Filters filters={data.filters} facets={data.facets} {js} />
</form>

<section
	bind:this={hasilEl}
	class="hasil wadah"
	data-tampilan={tampilan}
	aria-labelledby="judul-hasil"
>
	<div class="hasil-kepala">
		<div>
			<h2 id="judul-hasil" class="hasil-judul">
				<span class="hasil-angka">{formatAngka(data.total)}</span>
				tempat{#if aktif}&nbsp;cocok{/if}
			</h2>
			<p class="label-mikro">{keteranganUrut}</p>
		</div>
		<div class="hasil-aksi">
			{#if aktif}
				<a class="tombol tombol--tenang" href={resolve('/')}>
					<Icon name="x" size={16} /> Hapus filter
				</a>
			{/if}
			<a
				class="tombol tombol--tenang"
				href={resolve(qsFilter ? `/data.csv?${qsFilter}` : '/data.csv')}
				download
			>
				<Icon name="download" size={16} /> Unduh CSV
			</a>
		</div>
	</div>

	<p class="sr-only" role="status">{formatAngka(data.total)} tempat ditemukan</p>

	{#if data.filters.urut === 'terdekat' && lokasi.status !== 'ok'}
		<div class="pesan">
			<Icon name="locate" size={18} />
			<p>
				{#if lokasi.status === 'meminta'}
					Meminta izin lokasi… Posisi Anda hanya dipakai di browser ini dan tidak dikirim ke server.
				{:else if lokasi.status === 'ditolak'}
					Izin lokasi ditolak, jadi daftar memakai urutan paling lengkap. Izinkan lokasi untuk situs
					ini di pengaturan browser, lalu coba lagi.
				{:else if lokasi.status === 'gagal'}
					Lokasi belum bisa ditentukan. Pastikan layanan lokasi menyala, lalu coba lagi.
				{:else if lokasi.status === 'tidak-didukung'}
					Browser ini tidak bisa membagikan lokasi, jadi daftar memakai urutan paling lengkap.
				{:else}
					Urut terdekat memerlukan izin lokasi. Posisi Anda hanya dipakai di browser ini.
				{/if}
			</p>
			{#if js && ['awal', 'ditolak', 'gagal'].includes(lokasi.status)}
				<button type="button" class="tombol tombol--tenang" onclick={mintaLokasi}>
					{lokasi.status === 'awal' ? 'Izinkan lokasi' : 'Coba lagi'}
				</button>
			{/if}
		</div>
	{/if}

	<div class="hasil-isi">
		<div class="hasil-daftar" aria-busy={memuat}>
			{#if tampil.length}
				<ol class="daftar">
					{#each tampil as c, i (c.slug)}
						<li>
							<CompanyCard
								{c}
								nomor={i + 1}
								jarak={jarak.get(c.slug) ?? null}
								dipilih={dipilih === c.slug}
								muncul={i - mulaiAnimasi}
								onpeta={js ? lihatDiPeta : undefined}
							/>
						</li>
					{/each}
				</ol>
				<div class="lagi">
					<p class="label-mikro">
						Menampilkan {formatAngka(tampil.length)} dari {formatAngka(urutan.length)}
					</p>
					{#if sisa > 0}
						<a
							class="tombol"
							href={resolve(`/?${queryFilter(data.filters, { n: data.n + LANGKAH })}`)}
							onclick={tambah}
							data-sveltekit-preload-data="off"
							data-sveltekit-noscroll
						>
							Tampilkan {Math.min(LANGKAH, sisa)} lagi
						</a>
					{/if}
				</div>
			{:else}
				<div class="kosong">
					<p class="label-mikro">Hasil kosong</p>
					<h3>Belum ada tempat yang cocok</h3>
					<p>
						Coba kurangi filter atau pakai kata kunci lain. Tahu tempat berunsur IT yang belum
						tercatat? Usulkan supaya mahasiswa lain juga tahu.
					</p>
					<p class="kosong-aksi">
						<a class="tombol" href={resolve('/')}>Hapus semua filter</a>
						<a class="tombol tombol--utama" href={resolve('/usulkan')}>
							<Icon name="plus" size={16} /> Usulkan tempat
						</a>
					</p>
				</div>
			{/if}
		</div>

		<div class="hasil-peta">
			<MapView
				bind:this={petaRef}
				items={data.items}
				saya={posisi}
				onpilih={pilihDariPeta}
				label="Peta sebaran {formatAngka(data.total)} tempat"
			/>
		</div>
	</div>

	{#if js}
		<!-- sticky di dalam section: hanya melayang selama hasil terlihat, tidak menutupi filter -->
		<div class="alih" role="group" aria-label="Tampilan hasil">
			<button
				type="button"
				aria-pressed={tampilan === 'daftar'}
				onclick={() => gantiTampilan('daftar')}
			>
				<Icon name="list" size={17} /> Daftar
			</button>
			<button
				type="button"
				aria-pressed={tampilan === 'peta'}
				onclick={() => gantiTampilan('peta')}
			>
				<Icon name="map" size={17} /> Peta
			</button>
		</div>
	{/if}
</section>

<style>
	/* ── Sampul ──────────────────────────────────────────────────────────── */

	.sampul {
		display: grid;
		/* minmax(0, …): lebar intrinsik input pencarian tidak boleh melebarkan kolom di ponsel */
		grid-template-columns: minmax(0, 1fr);
		gap: 2rem;
		padding-block: clamp(1.75rem, 5vw, 4rem) clamp(1.5rem, 3.5vw, 2.75rem);
	}

	@media (min-width: 860px) {
		.sampul {
			grid-template-columns: minmax(0, 1fr) clamp(15rem, 23vw, 19.5rem);
			align-items: center;
			column-gap: clamp(2.5rem, 6vw, 6rem);
		}
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
		max-width: 15ch;
		margin-top: 1rem;
		font-size: clamp(2.35rem, 1.1rem + 4.6vw, 4.75rem);
		line-height: 1.02;
		letter-spacing: -0.022em;
	}

	/* nama kota bergaris putus-putus seperti rute di peta */
	.rute {
		text-decoration: underline dashed var(--accent);
		text-decoration-thickness: 0.07em;
		text-underline-offset: 0.12em;
	}

	.sampul-lede {
		max-width: 50ch;
		margin-top: 1.25rem;
		color: var(--ink-soft);
		font-size: clamp(1.02rem, 0.96rem + 0.3vw, 1.18rem);
	}

	.sampul-lede strong {
		color: var(--ink);
	}

	.cari {
		position: relative;
		display: flex;
		align-items: center;
		max-width: 40rem;
		margin-top: 1.75rem;
		border: 1.5px solid var(--ink);
		border-radius: 999px;
		background: var(--bg-elev);
		box-shadow: 5px 5px 0 var(--ink);
		transition:
			box-shadow 0.2s var(--ease-out),
			transform 0.2s var(--ease-out),
			border-color 0.2s;
	}

	.cari:focus-within {
		border-color: var(--accent);
		box-shadow: 2px 2px 0 var(--accent);
		transform: translate(3px, 3px);
	}

	.cari :global(.cari-ikon) {
		position: absolute;
		left: 1.15rem;
		color: var(--ink-soft);
		pointer-events: none;
	}

	.cari input {
		flex: 1;
		min-width: 0;
		height: 3.4rem;
		padding: 0 0.75rem 0 3.1rem;
		border: 0;
		border-radius: 999px;
		background: transparent;
		font-size: 1.0625rem;
		text-overflow: ellipsis;
		outline: none;
	}

	.cari input::placeholder {
		color: var(--ink-faint);
	}

	.cari-tombol {
		flex: none;
		min-height: 2.65rem;
		margin-right: 0.35rem;
		padding-inline: 1.35rem;
	}

	.contoh {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.3rem 1rem;
		margin-top: 1.15rem;
		font-size: 0.9375rem;
	}

	.contoh a {
		color: var(--ink);
		text-decoration: underline dotted var(--line-strong);
		text-decoration-thickness: 1.5px;
	}

	.contoh a:hover {
		color: var(--accent);
		text-decoration-color: currentColor;
	}

	.sampul-lembar {
		display: none;
	}

	@media (min-width: 860px) {
		.sampul-lembar {
			display: block;
		}
	}

	/* ── Saring ──────────────────────────────────────────────────────────── */

	.saring-wadah {
		padding-block: 1rem;
		border-block: 1px solid var(--line);
	}

	/* ── Hasil ───────────────────────────────────────────────────────────── */

	.hasil {
		padding-top: 1.5rem;
		scroll-margin-top: 0.5rem;
	}

	.hasil-kepala {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 0.75rem 1.5rem;
		margin-bottom: 1rem;
	}

	.hasil-judul {
		font-size: clamp(1.5rem, 1.2rem + 1vw, 2rem);
	}

	.hasil-angka {
		font-variant-numeric: tabular-nums;
	}

	.hasil-judul + .label-mikro {
		margin-top: 0.35rem;
	}

	.hasil-aksi {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.pesan {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem 0.9rem;
		margin-bottom: 1rem;
		padding: 0.75rem 1rem;
		border: 1px solid color-mix(in srgb, var(--sea) 35%, var(--line));
		border-radius: var(--radius-sm);
		background: var(--sea-soft);
		font-size: 0.9375rem;
	}

	.pesan p {
		flex: 1 1 16rem;
	}

	.pesan :global(.ikon) {
		flex: none;
		color: var(--sea);
	}

	.hasil-isi {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1.5rem;
	}

	@media (min-width: 1080px) {
		.hasil-isi {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			align-items: start;
		}

		.hasil-peta {
			position: sticky;
			top: 1rem;
			height: calc(100vh - 2rem);
			height: calc(100dvh - 2rem);
		}
	}

	@media (min-width: 1280px) {
		.hasil-isi {
			grid-template-columns: minmax(0, 7fr) minmax(0, 6fr);
		}
	}

	@media (max-width: 1079px) {
		.hasil-peta {
			height: calc(100vh - 8rem);
			height: calc(100svh - 8rem);
			min-height: 22rem;
		}

		.hasil[data-tampilan='daftar'] .hasil-peta,
		.hasil[data-tampilan='peta'] .hasil-daftar {
			display: none;
		}

		.hasil-daftar {
			padding-bottom: 4.5rem;
		}
	}

	.hasil-daftar {
		transition: opacity 0.2s;
	}

	.hasil-daftar[aria-busy='true'] {
		opacity: 0.55;
		transition-delay: 0.15s;
	}

	.daftar {
		display: grid;
		gap: 0.8rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.lagi {
		display: grid;
		justify-items: center;
		gap: 0.65rem;
		margin-top: 1.5rem;
	}

	.kosong {
		display: grid;
		justify-items: start;
		gap: 0.6rem;
		padding: 2rem 1.5rem;
		border: 1.5px dashed var(--line-strong);
		border-radius: var(--radius);
		background: color-mix(in srgb, var(--bg-elev) 60%, transparent);
	}

	.kosong h3 {
		font-size: 1.45rem;
	}

	.kosong p:not(.label-mikro) {
		max-width: 50ch;
		color: var(--ink-soft);
	}

	.kosong-aksi {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.4rem;
	}

	/* ── Alih daftar/peta (layar sempit) ─────────────────────────────────── */

	.alih {
		position: sticky;
		z-index: 60;
		bottom: calc(1rem + env(safe-area-inset-bottom));
		display: flex;
		gap: 2px;
		width: fit-content;
		margin: 1.25rem auto 0;
		padding: 4px;
		border-radius: 999px;
		background: var(--ink);
		box-shadow: 0 12px 28px -10px rgb(0 0 0 / 0.55);
	}

	.alih button {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		min-height: 2.6rem;
		padding: 0 1.05rem;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: var(--bg);
		font-size: 0.9375rem;
		font-weight: 600;
		cursor: pointer;
	}

	.alih button[aria-pressed='true'] {
		background: var(--bg);
		color: var(--ink);
	}

	@media (min-width: 1080px) {
		.alih {
			display: none;
		}
	}
</style>
