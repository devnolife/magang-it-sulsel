<script>
	import { resolve } from '$app/paths';
	import { formatAngka, formatRating } from '$lib/format.js';
	import { formatJarak, formatKoordinat } from '$lib/shared/geo.js';
	import { JENIS } from '$lib/shared/jenis.js';
	import { MAGANG_STATUS } from '$lib/shared/magang-status.js';
	import { kabkotaLabel } from '$lib/shared/wilayah.js';
	import ContactButtons from './ContactButtons.svelte';
	import Icon from './Icon.svelte';

	/**
	 * @type {{
	 *   c: import('$lib/server/companies.js').ListItem,
	 *   nomor: number,
	 *   jarak?: number | null,
	 *   dipilih?: boolean,
	 *   muncul?: number,
	 *   onpeta?: (slug: string) => void
	 * }}
	 */
	let { c, nomor, jarak = null, dipilih = false, muncul = 0, onpeta } = $props();

	const kab = $derived(kabkotaLabel(c.kabkota));
	const tag = $derived(c.tags.map((t) => t.charAt(0).toUpperCase() + t.slice(1)));
	const adaLencana = $derived(
		c.magang !== 'belum' || c.lowongan_aktif > 0 || c.peringatan || c.rating != null
	);
</script>

<article
	id="k-{c.slug}"
	class={['kartu', `j-${c.jenis}`, dipilih && 'dipilih']}
	style:--muncul={muncul}
	tabindex="-1"
	aria-labelledby="n-{c.slug}"
>
	<p class="kartu-meta">
		<span class="titik-jenis" aria-hidden="true"></span>
		<span>{JENIS[c.jenis].short}</span>
		<span class="kartu-tempat">
			{kab}{#if c.kecamatan && c.kecamatan !== kab}<span aria-hidden="true"> · </span>Kec. {c.kecamatan}{/if}
		</span>
		<span class="kartu-nomor" aria-hidden="true">No. {String(nomor).padStart(3, '0')}</span>
	</p>

	<h3 class="kartu-nama" id="n-{c.slug}">
		<a href={resolve('/perusahaan/[slug]', { slug: c.slug })}>{c.nama}</a>
	</h3>

	{#if adaLencana}
		<ul class="kartu-lencana">
			{#if c.magang !== 'belum'}
				<li class="lencana lencana--{c.magang}" title={MAGANG_STATUS[c.magang].keterangan}>
					<Icon name={c.magang === 'terbukti' ? 'verified' : 'briefcase'} size={13} />
					{MAGANG_STATUS[c.magang].short}
				</li>
			{/if}
			{#if c.lowongan_aktif > 0}
				<li class="lencana lencana--lowongan">
					<Icon name="briefcase" size={13} />
					{c.lowongan_aktif} lowongan aktif
				</li>
			{/if}
			{#if c.peringatan}
				<li class="lencana lencana--peringatan" title="Lihat catatan di halaman detail">
					<Icon name="alert" size={13} /> Ada catatan
				</li>
			{/if}
			{#if c.rating != null}
				<li class="kartu-rating">
					<Icon name="star" size={13} />
					<span>{formatRating(c.rating)}</span>
					{#if c.jumlah_ulasan}
						<span class="kartu-ulasan">({formatAngka(c.jumlah_ulasan)} ulasan)</span>
					{/if}
				</li>
			{/if}
		</ul>
	{/if}

	{#if tag.length}
		<p class="kartu-tag">{tag.join(' · ')}</p>
	{/if}

	<ContactButtons {c} ringkas />

	<div class="kartu-kaki">
		{#if c.lat != null && c.lng != null}
			<span class="kartu-koordinat">{formatKoordinat(c.lat, c.lng)}</span>
		{/if}
		{#if jarak != null}
			<span class="kartu-jarak"
				><Icon name="locate" size={13} /> {formatJarak(jarak)} dari Anda</span
			>
		{/if}
		<span class="kartu-aksi">
			{#if onpeta && c.lat != null}
				<button
					type="button"
					class="kartu-tautan"
					aria-label="Lihat {c.nama} di peta"
					onclick={() => onpeta(c.slug)}
				>
					<Icon name="map" size={15} /> Peta
				</button>
			{/if}
			<!-- Duplikat tautan judul: disembunyikan dari pembaca layar dan urutan Tab. -->
			<a
				class="kartu-tautan"
				href={resolve('/perusahaan/[slug]', { slug: c.slug })}
				tabindex="-1"
				aria-hidden="true"
			>
				Detail <Icon name="arrow" size={15} />
			</a>
		</span>
	</div>
</article>

<style>
	.kartu {
		position: relative;
		display: grid;
		gap: 0.6rem;
		padding: 1rem 1.1rem 0.8rem 1.4rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--bg-elev);
		box-shadow: var(--shadow-sm);
		scroll-margin-block: 6rem;
		animation: naik 0.5s var(--ease-out) backwards;
		animation-delay: calc(min(var(--muncul, 0), 10) * 40ms);
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}

	/* strip warna jenis di tepi kiri */
	.kartu::before {
		content: '';
		position: absolute;
		inset-block: 0.95rem;
		left: -1px;
		width: 4px;
		border-radius: 0 4px 4px 0;
		background: var(--c);
	}

	.kartu:hover {
		border-color: var(--line-strong);
		box-shadow: var(--shadow);
	}

	.kartu:focus {
		outline: none;
	}

	.kartu:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.kartu.dipilih {
		border-color: var(--c);
		box-shadow:
			0 0 0 3px color-mix(in srgb, var(--c) 28%, transparent),
			var(--shadow);
	}

	.kartu-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.2rem 0.55rem;
		font-family: var(--font-mono);
		font-stretch: 87.5%;
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.07em;
		line-height: 1.4;
		text-transform: uppercase;
		color: var(--ink-soft);
	}

	.kartu-meta > span:nth-child(2) {
		color: var(--c);
		font-weight: 650;
	}

	.kartu-tempat {
		min-width: 0;
	}

	.kartu-nomor {
		margin-left: auto;
		color: var(--ink-faint);
		font-variant-numeric: tabular-nums;
	}

	.kartu-nama {
		font-size: clamp(1.13rem, 1.02rem + 0.35vw, 1.3rem);
		line-height: 1.22;
		overflow-wrap: anywhere;
	}

	.kartu-nama a {
		color: var(--ink);
		text-decoration: none;
		background: linear-gradient(currentColor, currentColor) 0 100% / 0 1px no-repeat;
		transition:
			background-size 0.3s var(--ease-out),
			color 0.15s;
	}

	.kartu-nama a:hover {
		color: var(--accent);
		background-size: 100% 1px;
	}

	.kartu-lencana {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.4rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.kartu-rating {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding-left: 0.15rem;
		font-size: 0.8125rem;
		font-weight: 650;
		color: var(--ink);
	}

	.kartu-rating :global(.ikon) {
		color: var(--gold);
		fill: var(--gold);
	}

	.kartu-ulasan {
		color: var(--ink-soft);
		font-weight: 450;
	}

	.kartu-tag {
		color: var(--ink-soft);
		font-size: 0.875rem;
		line-height: 1.4;
	}

	.kartu-kaki {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.9rem;
		margin-top: 0.15rem;
		padding-top: 0.6rem;
		border-top: 1px dashed var(--line);
	}

	.kartu-koordinat,
	.kartu-jarak {
		font-family: var(--font-mono);
		font-stretch: 87.5%;
		font-size: 0.6875rem;
		color: var(--ink-faint);
		font-variant-numeric: tabular-nums;
	}

	.kartu-jarak {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--sea);
		font-weight: 600;
	}

	.kartu-aksi {
		display: inline-flex;
		gap: 0.25rem;
		margin-left: auto;
	}

	.kartu-tautan {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		min-height: 2rem;
		padding: 0.2rem 0.6rem;
		border: 0;
		border-radius: 999px;
		background: none;
		color: var(--ink);
		font-size: 0.8125rem;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
	}

	.kartu-tautan:hover {
		background: var(--bg-sunk);
		color: var(--accent);
	}
</style>
