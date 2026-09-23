<script>
	import '@fontsource/young-serif/400.css';
	import '@fontsource-variable/schibsted-grotesk/wght.css';
	import '@fontsource-variable/martian-mono/standard.css';
	// CSS Leaflet dimuat sebelum app.css supaya penimpaan tema menang pada spesifisitas yang sama
	import 'leaflet/dist/leaflet.css';
	import 'leaflet.markercluster/dist/MarkerCluster.css';
	import '../app.css';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { formatAngka, formatTanggal } from '$lib/format.js';
	import { KABKOTA, kabkotaLabel } from '$lib/shared/wilayah.js';

	let { data, children } = $props();

	const RUMAH = resolve('/');

	/** @param {string} href */
	const kini = (href) =>
		(href === RUMAH ? page.url.pathname === RUMAH : page.url.pathname.startsWith(href))
			? 'page'
			: undefined;
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<meta name="theme-color" content="#f3ede2" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#0f1a1c" media="(prefers-color-scheme: dark)" />
</svelte:head>

<a class="lompat" href="#isi">Langsung ke isi</a>

<div class="situs">
	<div class="sabbe" aria-hidden="true"></div>

	<header class="kepala wadah">
		<a class="merek" href={resolve('/')} aria-label="Magang IT Sulsel, ke beranda">
			<svg class="merek-lambang" viewBox="0 0 32 32" aria-hidden="true">
				<rect class="l-dasar" width="32" height="32" rx="8" />
				<path
					class="l-pin"
					d="M16 4.6c-4.5 0-8.1 3.5-8.1 7.9 0 5.7 6.5 11.8 7.4 12.6a1 1 0 0 0 1.4 0c.9-.8 7.4-6.9 7.4-12.6 0-4.4-3.6-7.9-8.1-7.9Z"
				/>
				<circle class="l-dasar" cx="16" cy="12.4" r="3.1" />
				<rect class="l-emas" x="7" y="27" width="18" height="1.8" rx=".9" />
			</svg>
			<span class="merek-nama">Magang IT</span>
			<span class="merek-tag">Sulsel</span>
		</a>
		<nav class="nav" aria-label="Utama">
			<a href={resolve('/')} class="rumah" aria-current={kini(resolve('/'))}>Direktori</a>
			<a href={resolve('/usulkan')} aria-current={kini(resolve('/usulkan'))}>
				<span class="nav-panjang">Usulkan tempat</span><span class="nav-pendek">Usulkan</span>
			</a>
			<a href={resolve('/tentang')} aria-current={kini(resolve('/tentang'))}>Tentang</a>
		</nav>
		<ThemeToggle />
	</header>

	<main id="isi" tabindex="-1">
		{@render children()}
	</main>

	<footer class="kaki">
		<div class="sabbe" aria-hidden="true"></div>
		<div class="wadah kaki-isi">
			<section class="kaki-utama">
				<p class="kaki-judul">Magang IT Sulsel</p>
				<p>
					Direktori terbuka tempat magang berunsur informatika di 24 kabupaten/kota Sulawesi
					Selatan. Dibuat untuk mahasiswa; siapa pun boleh mengusulkan tempat baru atau mengoreksi
					data.
				</p>
			</section>
			<nav aria-label="Tautan bawah">
				<p class="label-mikro">Jelajah</p>
				<ul>
					<li><a href={resolve('/')}>Direktori</a></li>
					<li><a href={resolve('/usulkan')}>Usulkan tempat</a></li>
					<li><a href={resolve('/tentang')}>Tentang &amp; sumber data</a></li>
					<li><a href={resolve('/data.csv')} download>Unduh data (CSV)</a></li>
					<li>
						<a href="https://github.com/devnolife/magang-it-sulsel" rel="noopener">Kode di GitHub</a
						>
					</li>
				</ul>
			</nav>
			<section>
				<p class="label-mikro">Data</p>
				<p>
					<strong>{formatAngka(data.stats.total)}</strong> tempat di
					<strong>{data.stats.kabkota}</strong> kab/kota
				</p>
				{#if data.stats.lastImport}
					<p>Diperbarui {formatTanggal(data.stats.lastImport)}</p>
				{/if}
				<p class="kaki-kecil">
					Peta &copy;
					<a href="https://www.openstreetmap.org/copyright" rel="noopener"
						>OpenStreetMap contributors</a
					>
					(ODbL). Fakta bisnis dari Google Maps; setiap entri menautkan balik ke sumbernya. Status magang
					bukan jaminan, jadi tanyakan langsung ke tempatnya.
				</p>
			</section>
		</div>
		<div class="wadah kaki-bawah">
			<p class="label-mikro">
				Cakupan: {KABKOTA.map((k) => kabkotaLabel(k.slug)).join(' · ')}
			</p>
			<p class="label-mikro">Kode berlisensi MIT</p>
		</div>
	</footer>
</div>

<style>
	.situs {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		min-height: 100dvh;
	}

	main {
		flex: 1;
	}

	main:focus {
		outline: none;
	}

	.kepala {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding-block: 0.9rem;
	}

	.merek {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		margin-right: auto;
		color: var(--ink);
		text-decoration: none;
	}

	.merek:hover {
		color: var(--ink);
	}

	.merek-lambang {
		width: 2rem;
		height: 2rem;
		transition: transform 0.35s var(--ease-out);
	}

	.merek:hover .merek-lambang {
		transform: rotate(-6deg) translateY(-1px);
	}

	.l-dasar {
		fill: var(--ink);
	}

	.l-pin {
		fill: var(--accent);
	}

	.l-emas {
		fill: var(--gold);
	}

	.merek-nama {
		font-family: var(--font-display);
		font-size: 1.3rem;
		line-height: 1;
		white-space: nowrap;
	}

	.merek-tag {
		padding: 0.2rem 0.38rem 0.16rem;
		border: 1px solid currentColor;
		border-radius: 4px;
		color: var(--accent);
		font-family: var(--font-mono);
		font-stretch: 87.5%;
		font-size: 0.625rem;
		font-weight: 650;
		letter-spacing: 0.12em;
		line-height: 1;
		text-transform: uppercase;
	}

	.nav {
		display: flex;
		gap: 0.2rem;
	}

	.nav a {
		padding: 0.45rem 0.8rem;
		border-radius: 999px;
		color: var(--ink-soft);
		font-size: 0.9375rem;
		font-weight: 550;
		text-decoration: none;
		white-space: nowrap;
	}

	.nav a:hover {
		background: var(--bg-sunk);
		color: var(--ink);
	}

	.nav a[aria-current='page'] {
		background: var(--bg-elev);
		color: var(--ink);
		box-shadow: inset 0 0 0 1px var(--line-strong);
	}

	.nav-pendek {
		display: none;
	}

	@media (max-width: 720px) {
		.nav a.rumah {
			display: none;
		}

		.nav-panjang {
			display: none;
		}

		.nav-pendek {
			display: inline;
		}

		.nav a {
			padding: 0.4rem 0.6rem;
			font-size: 0.875rem;
		}
	}

	@media (max-width: 420px) {
		.kepala {
			gap: 0.4rem;
		}

		.merek-nama {
			font-size: 1.08rem;
		}

		.merek-tag {
			display: none;
		}
	}

	.kaki {
		margin-top: clamp(3rem, 8vw, 6rem);
		border-top: 1px solid var(--line);
		background: var(--bg-sunk);
	}

	.kaki-isi {
		display: grid;
		gap: 2rem;
		padding-block: 2.5rem 2rem;
		font-size: 0.9375rem;
	}

	@media (min-width: 820px) {
		.kaki-isi {
			grid-template-columns: 1.5fr 1fr 1.3fr;
			gap: 3rem;
		}
	}

	.kaki-isi :global(p + p) {
		margin-top: 0.35rem;
	}

	.kaki-isi .label-mikro {
		margin-bottom: 0.6rem;
	}

	.kaki-judul {
		margin-bottom: 0.6rem;
		font-family: var(--font-display);
		font-size: 1.6rem;
		line-height: 1.1;
	}

	.kaki-utama p:not(.kaki-judul) {
		max-width: 44ch;
		color: var(--ink-soft);
	}

	.kaki ul {
		display: grid;
		gap: 0.4rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.kaki-kecil {
		margin-top: 0.8rem !important;
		color: var(--ink-soft);
		font-size: 0.8125rem;
	}

	.kaki-bawah {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem 2rem;
		padding-block: 1rem 1.6rem;
		border-top: 1px dashed var(--line-strong);
	}

	.kaki-bawah p:first-child {
		max-width: 90ch;
	}
</style>
