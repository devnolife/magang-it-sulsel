<script>
	import { onMount } from 'svelte';
	import { formatAngka } from '$lib/format.js';
	import { JENIS, JENIS_KEYS } from '$lib/shared/jenis.js';
	import {
		BATAS_LEMBAR,
		LABEL_LEMBAR,
		LEBAR_LEMBAR,
		SKALA_LEMBAR,
		TINGGI_LEMBAR,
		proyeksiLembar
	} from '$lib/shared/lembar.js';

	/**
	 * Lembar atlas kecil: siluet Sulsel + satu titik per tempat hasil filter.
	 * @type {{ items: Pick<import('$lib/server/companies.js').ListItem, 'slug' | 'jenis' | 'lat' | 'lng'>[] }}
	 */
	let { items } = $props();

	// titik baru digambar setelah hidrasi: HTML awal tetap ringan dan titik "turun" dari utara
	let hidup = $state(false);
	onMount(() => {
		hidup = true;
	});

	const titik = $derived(
		items.flatMap((c) => {
			if (c.lat == null || c.lng == null) return [];
			const [x, y] = proyeksiLembar(c.lat, c.lng);
			if (x < 0 || x > LEBAR_LEMBAR || y < 0 || y > TINGGI_LEMBAR) return [];
			return [
				{ slug: c.slug, jenis: c.jenis, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
			];
		})
	);

	const BUJUR = [119, 120, 121].map((b) => ({ b, x: (b - BATAS_LEMBAR.barat) * SKALA_LEMBAR }));
	const LINTANG = [2, 3, 4, 5, 6].map((l) => ({ l, y: (-BATAS_LEMBAR.utara - l) * -SKALA_LEMBAR }));
	const KM50 = (50 / 111.32) * SKALA_LEMBAR;
	const LABEL = LABEL_LEMBAR.map((l) => {
		const [x, y] = proyeksiLembar(l.lat, l.lng);
		return { ...l, x: l.sisi === 'kiri' ? x - 13 : x + 13, y: y + 7 };
	});
</script>

<figure class="lembar">
	<div class="lembar-bingkai">
		<div class="lembar-darat" aria-hidden="true"></div>
		<svg
			class="lembar-svg"
			viewBox="0 0 {LEBAR_LEMBAR} {TINGGI_LEMBAR}"
			aria-hidden="true"
			focusable="false"
		>
			<g class="lembar-grid">
				{#each BUJUR as g (g.b)}
					<line x1={g.x} x2={g.x} y1="0" y2={TINGGI_LEMBAR} />
					<text x={g.x + 6} y="30">{g.b}°BT</text>
				{/each}
				{#each LINTANG as g (g.l)}
					<line x1="0" x2={LEBAR_LEMBAR} y1={g.y} y2={g.y} />
					<text x="14" y={g.y - 7}>{g.l}°LS</text>
				{/each}
			</g>
			{#if hidup}
				<g class="lembar-titik">
					{#each titik as t (t.slug)}
						<circle
							class="j-{t.jenis}"
							cx={t.x}
							cy={t.y}
							r="5.2"
							style:--tunda="{Math.round(t.y * 0.8)}ms"
						/>
					{/each}
				</g>
			{/if}
			<g class="lembar-label">
				{#each LABEL as l (l.nama)}
					<circle cx={l.sisi === 'kiri' ? l.x + 13 : l.x - 13} cy={l.y - 7} r="3.2" />
					<text x={l.x} y={l.y} text-anchor={l.sisi === 'kiri' ? 'end' : 'start'}>{l.nama}</text>
				{/each}
			</g>
			<g class="lembar-skala" transform="translate(34 {TINGGI_LEMBAR - 44})">
				<rect width={KM50 / 2} height="7" />
				<rect class="kosong" x={KM50 / 2} width={KM50 / 2} height="7" />
				<text y="-9">0</text>
				<text x={KM50} y="-9" text-anchor="middle">50 km</text>
			</g>
			<g class="lembar-utara" transform="translate({LEBAR_LEMBAR - 46} 78)">
				<path d="M0-30 11 10 0 3-11 10Z" />
				<text y="36" text-anchor="middle">U</text>
			</g>
		</svg>
	</div>
	<figcaption>
		<p class="lembar-judul">
			<span class="label-mikro">Lembar I</span>
			<span>Sebaran {formatAngka(titik.length)} tempat</span>
		</p>
		<ul class="lembar-legenda" aria-label="Warna titik menurut jenis">
			{#each JENIS_KEYS as k (k)}
				<li class="j-{k}"><span class="titik-jenis" aria-hidden="true"></span>{JENIS[k].short}</li>
			{/each}
		</ul>
	</figcaption>
</figure>

<style>
	.lembar {
		display: grid;
		gap: 0.75rem;
		margin: 0;
	}

	.lembar-bingkai {
		position: relative;
		aspect-ratio: 667 / 1000;
		border: 1px solid var(--line-strong);
		background: var(--bg-elev);
		box-shadow: var(--shadow);
	}

	/* garis tepi ganda ala lembar atlas */
	.lembar-bingkai::after {
		content: '';
		position: absolute;
		inset: 5px;
		border: 1px solid var(--line);
		pointer-events: none;
	}

	.lembar-darat {
		position: absolute;
		inset: 0;
		background: var(--ink);
		-webkit-mask: url('/peta/sulsel.svg') 0 0 / 100% 100% no-repeat;
		mask: url('/peta/sulsel.svg') 0 0 / 100% 100% no-repeat;
	}

	.lembar-svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.lembar-grid line {
		stroke: var(--sea);
		stroke-opacity: 0.35;
		stroke-width: 1;
		stroke-dasharray: 2 7;
	}

	.lembar-grid text,
	.lembar-skala text,
	.lembar-utara text {
		fill: var(--ink-soft);
		font-family: var(--font-mono);
		font-stretch: 87.5%;
		font-size: 17px;
		letter-spacing: 0.06em;
	}

	.lembar-titik circle {
		fill: var(--c);
		stroke: var(--bg-elev);
		stroke-width: 1.3;
		transform-box: fill-box;
		transform-origin: center;
		animation: titik-muncul 0.5s var(--ease-out) backwards;
		animation-delay: var(--tunda);
	}

	@keyframes titik-muncul {
		from {
			opacity: 0;
			transform: scale(0.1);
		}
	}

	.lembar-label text {
		fill: var(--ink);
		paint-order: stroke;
		stroke: var(--bg-elev);
		stroke-width: 5px;
		stroke-linejoin: round;
		font-family: var(--font-mono);
		font-stretch: 87.5%;
		font-size: 21px;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.lembar-label circle {
		fill: var(--bg-elev);
		stroke: var(--ink);
		stroke-width: 2;
	}

	.lembar-skala rect {
		fill: var(--ink);
		stroke: var(--ink);
		stroke-width: 1.5;
	}

	.lembar-skala rect.kosong {
		fill: var(--bg-elev);
	}

	.lembar-utara path {
		fill: var(--accent);
	}

	.lembar-utara text {
		fill: var(--ink);
		font-size: 19px;
		font-weight: 650;
	}

	.lembar-judul {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.2rem 0.6rem;
		font-family: var(--font-display);
		font-size: 1.05rem;
		line-height: 1.2;
	}

	.lembar-legenda {
		display: grid;
		grid-template-columns: repeat(3, auto);
		justify-content: start;
		gap: 0.3rem 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
		color: var(--ink-soft);
		font-size: 0.8125rem;
	}

	.lembar-legenda li {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
	}
</style>
