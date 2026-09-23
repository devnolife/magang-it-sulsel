<script>
	import { daftarKontak, relEksternal } from '$lib/kontak.js';
	import Icon from './Icon.svelte';

	/**
	 * ringkas: baris ikon untuk kartu (kontak pertama berlabel). Lengkap: label + nilai, untuk detail.
	 * @type {{ c: import('$lib/kontak.js').SumberKontak & { origin: string }, ringkas?: boolean }}
	 */
	let { c, ringkas = false } = $props();

	const kontak = $derived(daftarKontak(c, { lengkap: !ringkas }));
	const rel = $derived(relEksternal(c.origin));
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- semua tautan di sini keluar situs (wa.me, tel:, mailto:, situs perusahaan) -->
{#if kontak.length}
	<ul class={['kontak', ringkas ? 'kontak--ringkas' : 'kontak--lengkap']} aria-label="Kontak">
		{#each kontak as k, i (k.jenis)}
			<li>
				<a
					class={['kontak-tombol', `kontak--${k.jenis}`, ringkas && i === 0 && 'kontak-utama']}
					href={k.href}
					target={k.eksternal ? '_blank' : undefined}
					rel={k.eksternal ? rel : undefined}
					title={k.catatan ?? (ringkas ? `${k.label}: ${k.nilai}` : undefined)}
				>
					<Icon name={k.ikon} size={ringkas ? 16 : 18} />
					{#if !ringkas}
						<span class="kontak-teks">
							<span class="kontak-label">{k.label}</span>
							<span class="kontak-nilai">{k.nilai}</span>
						</span>
					{:else if i === 0}
						<span>{k.label}</span><span class="sr-only">: {k.nilai}</span>
					{:else}
						<span class="sr-only">{k.label}: {k.nilai}</span>
					{/if}
					{#if k.eksternal}<span class="sr-only">(membuka tab baru)</span>{/if}
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.kontak {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.kontak-tombol {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		min-width: 2.25rem;
		min-height: 2.25rem;
		padding: 0 0.75rem;
		border: 1px solid var(--line-strong);
		border-radius: 999px;
		background: var(--bg-elev);
		color: var(--ink);
		font-size: 0.8125rem;
		font-weight: 600;
		line-height: 1.2;
		text-decoration: none;
		transition:
			border-color 0.15s,
			background-color 0.15s,
			color 0.15s,
			transform 0.15s var(--ease-out);
	}

	.kontak-tombol:hover {
		border-color: var(--ink);
		color: var(--accent);
	}

	.kontak-tombol:active {
		transform: translateY(1px);
	}

	.kontak--ringkas .kontak-tombol:not(.kontak-utama) {
		width: 2.25rem;
		padding: 0;
	}

	.kontak-utama {
		border-color: var(--ink);
		background: var(--ink);
		color: var(--bg-elev);
	}

	.kontak-utama:hover {
		border-color: var(--ink);
		background: var(--ink-soft);
		color: var(--bg-elev);
	}

	.kontak-utama.kontak--wa {
		border-color: var(--ok);
		background: var(--ok);
	}

	.kontak-utama.kontak--wa:hover {
		background: color-mix(in srgb, var(--ok) 82%, var(--ink));
	}

	.kontak--lengkap {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(13.5rem, 1fr));
		gap: 0.5rem;
	}

	.kontak--lengkap .kontak-tombol {
		justify-content: flex-start;
		gap: 0.75rem;
		width: 100%;
		min-height: 3.25rem;
		padding: 0.5rem 0.9rem;
		border-radius: var(--radius-sm);
		text-align: left;
	}

	.kontak--lengkap .kontak--wa {
		border-color: color-mix(in srgb, var(--ok) 45%, var(--line-strong));
	}

	.kontak-teks {
		display: grid;
		min-width: 0;
	}

	.kontak-label {
		font-family: var(--font-mono);
		font-stretch: 87.5%;
		font-size: 0.625rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}

	.kontak-nilai {
		overflow: hidden;
		font-size: 0.9375rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
