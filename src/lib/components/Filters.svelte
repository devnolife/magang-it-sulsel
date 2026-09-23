<script>
	import { onMount } from 'svelte';
	import { formatAngka } from '$lib/format.js';
	import { JENIS, JENIS_KEYS } from '$lib/shared/jenis.js';
	import { MAGANG_STATUS } from '$lib/shared/magang-status.js';
	import { KABKOTA, kabkotaLabel } from '$lib/shared/wilayah.js';
	import Icon from './Icon.svelte';

	/**
	 * Isi form GET #saring. Tanpa JS, tombol "Terapkan" mengirim form; dengan JS, halaman yang
	 * mendengarkan event change dan bernavigasi sendiri.
	 * @type {{
	 *   filters: import('$lib/server/companies.js').Filters,
	 *   facets: { kab: Record<string, number>, jenis: Record<string, number>, magang: Record<string, number>, lowongan: number },
	 *   js: boolean
	 * }}
	 */
	let { filters, facets, js } = $props();

	/** @type {readonly import('$lib/shared/magang-status.js').StatusMagang[]} */
	const MAGANG_PILIHAN = ['terbukti', 'indikasi'];

	const URUT = /** @type {const} */ ([
		['relevansi', 'Paling lengkap'],
		['nama', 'Nama A–Z'],
		['terdekat', 'Terdekat dari saya']
	]);

	/** Urutan kab/kota menurut jumlah; dibekukan selama panel terbuka supaya tidak melompat. */
	const urutKab = () =>
		KABKOTA.map((k) => k.slug).sort(
			(a, b) =>
				(facets.kab[b] ?? 0) - (facets.kab[a] ?? 0) ||
				kabkotaLabel(a).localeCompare(kabkotaLabel(b))
		);
	let kabTampil = $state(urutKab());

	const ringkasKab = $derived(
		filters.kab.length === 0
			? 'Semua kab/kota'
			: filters.kab.length === 1
				? kabkotaLabel(filters.kab[0])
				: `${filters.kab.length} kab/kota`
	);

	/** @type {HTMLDetailsElement | undefined} */
	let panelKab = $state();

	function saatBukaTutup() {
		if (panelKab?.open) kabTampil = urutKab();
	}

	onMount(() => {
		/** @param {MouseEvent} e */
		const klikLuar = (e) => {
			if (panelKab?.open && !panelKab.contains(/** @type {Node} */ (e.target))) {
				panelKab.open = false;
			}
		};
		/** @param {KeyboardEvent} e */
		const esc = (e) => {
			if (e.key === 'Escape' && panelKab?.open) {
				panelKab.open = false;
				panelKab.querySelector('summary')?.focus();
			}
		};
		document.addEventListener('click', klikLuar);
		document.addEventListener('keydown', esc);
		return () => {
			document.removeEventListener('click', klikLuar);
			document.removeEventListener('keydown', esc);
		};
	});
</script>

<div class="saring">
	<fieldset class="saring-jenis">
		<legend class="sr-only">Jenis tempat</legend>
		<div class="saring-gulir">
			{#each JENIS_KEYS as k (k)}
				{@const n = facets.jenis[k] ?? 0}
				{@const pilih = filters.jenis.includes(k)}
				<label class={['chip', `j-${k}`, !n && !pilih && 'chip--nol']} title={JENIS[k].label}>
					<input type="checkbox" name="jenis" value={k} checked={pilih} />
					<span class="titik-jenis" aria-hidden="true"></span>
					{JENIS[k].short}
					<span class="jumlah">{formatAngka(n)}</span>
				</label>
			{/each}
		</div>
	</fieldset>

	<div class="saring-baris">
		<details class="saring-kab" bind:this={panelKab} ontoggle={saatBukaTutup}>
			<summary class={['chip', filters.kab.length && 'chip--aktif']}>
				<Icon name="pin" size={15} />
				<span>{ringkasKab}</span>
				<Icon name="chevron" size={15} class="saring-panah" />
			</summary>
			<fieldset class="kab-panel">
				<legend class="label-mikro">Kabupaten / kota</legend>
				<ul>
					{#each kabTampil as slug (slug)}
						{@const n = facets.kab[slug] ?? 0}
						<li>
							<label class={['kab-opsi', !n && 'kab-opsi--nol']}>
								<input
									type="checkbox"
									name="kab"
									value={slug}
									checked={filters.kab.includes(slug)}
								/>
								<span>{kabkotaLabel(slug)}</span>
								<span class="jumlah">{formatAngka(n)}</span>
							</label>
						</li>
					{/each}
				</ul>
				{#if !js}
					<button class="tombol tombol--utama" type="submit">Terapkan</button>
				{/if}
			</fieldset>
		</details>

		<fieldset class="saring-grup">
			<legend class="sr-only">Status magang dan lowongan</legend>
			{#each MAGANG_PILIHAN as m (m)}
				{@const n = facets.magang[m] ?? 0}
				{@const pilih = filters.magang.includes(m)}
				<label class={['chip', !n && !pilih && 'chip--nol']} title={MAGANG_STATUS[m].keterangan}>
					<input type="checkbox" name="magang" value={m} checked={pilih} />
					<Icon name={m === 'terbukti' ? 'verified' : 'briefcase'} size={15} />
					{MAGANG_STATUS[m].short}
					<span class="jumlah">{formatAngka(n)}</span>
				</label>
			{/each}
			<label class={['chip', !facets.lowongan && !filters.lowongan && 'chip--nol']}>
				<input type="checkbox" name="lowongan" value="1" checked={filters.lowongan} />
				Ada lowongan
				<span class="jumlah">{formatAngka(facets.lowongan)}</span>
			</label>
		</fieldset>

		<label class="saring-urut">
			<span class="label-mikro">Urutkan</span>
			<span class="pilihan">
				<select name="urut" value={filters.urut}>
					{#each URUT as [nilai, label] (nilai)}
						<option value={nilai}>{label}</option>
					{/each}
				</select>
				<Icon name="chevron" size={15} />
			</span>
		</label>

		{#if !js}
			<button class="tombol tombol--utama" type="submit">Terapkan</button>
		{/if}
	</div>
</div>

<style>
	.saring {
		display: grid;
		gap: 0.6rem;
	}

	fieldset {
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}

	.saring-gulir {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	@media (max-width: 719px) {
		/* satu baris yang bisa digeser; tepi kanan memudar sebagai isyarat */
		.saring-gulir {
			flex-wrap: nowrap;
			margin-inline: calc(-1 * clamp(1rem, 3.2vw, 2.25rem));
			padding: 0.15rem clamp(1rem, 3.2vw, 2.25rem) 0.35rem;
			overflow-x: auto;
			scrollbar-width: none;
			scroll-padding-inline: 1rem;
			-webkit-mask: linear-gradient(90deg, #000 88%, transparent);
			mask: linear-gradient(90deg, #000 88%, transparent);
		}

		.saring-gulir::-webkit-scrollbar {
			display: none;
		}
	}

	.chip--nol {
		opacity: 0.5;
	}

	.saring-baris {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}

	.saring-grup {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.saring-kab {
		position: relative;
	}

	.saring-kab > summary {
		list-style: none;
	}

	.saring-kab > summary::-webkit-details-marker {
		display: none;
	}

	.chip--aktif {
		border-color: var(--ink);
		box-shadow: inset 0 0 0 1px var(--ink);
	}

	.saring-kab :global(.saring-panah) {
		transition: transform 0.2s var(--ease-out);
	}

	.saring-kab[open] :global(.saring-panah) {
		transform: rotate(180deg);
	}

	.kab-panel {
		position: absolute;
		z-index: 40;
		top: calc(100% + 0.45rem);
		left: 0;
		display: grid;
		gap: 0.6rem;
		width: min(21rem, calc(100vw - 2rem));
		padding: 0.9rem 0.6rem 0.7rem;
		border: 1px solid var(--line-strong);
		border-radius: var(--radius);
		background: var(--bg-elev);
		box-shadow: var(--shadow);
		animation: naik 0.22s var(--ease-out);
	}

	.kab-panel > legend {
		float: left;
		padding-inline: 0.5rem;
	}

	.kab-panel ul {
		clear: both;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.1rem 0.3rem;
		max-height: min(21rem, 55vh);
		margin: 0;
		padding: 0;
		overflow-y: auto;
		list-style: none;
		overscroll-behavior: contain;
	}

	.kab-opsi {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		min-height: 2.25rem;
		padding: 0.2rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		cursor: pointer;
	}

	.kab-opsi:hover {
		background: var(--bg-sunk);
	}

	.kab-opsi input {
		flex: none;
		width: 1rem;
		height: 1rem;
		margin: 0;
		accent-color: var(--accent);
	}

	.kab-opsi .jumlah {
		margin-left: auto;
	}

	.kab-opsi--nol {
		color: var(--ink-faint);
	}

	.saring-urut {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin-left: auto;
	}

	.pilihan {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.pilihan select {
		min-height: 2.25rem;
		padding: 0.3rem 2rem 0.3rem 0.85rem;
		border: 1px solid var(--line-strong);
		border-radius: 999px;
		background: var(--bg-elev);
		font-size: 0.875rem;
		font-weight: 550;
		cursor: pointer;
		appearance: none;
	}

	.pilihan select:hover {
		border-color: var(--ink);
	}

	.pilihan :global(.ikon) {
		position: absolute;
		right: 0.7rem;
		pointer-events: none;
	}

	@media (max-width: 719px) {
		.saring-urut {
			margin-left: 0;
		}
	}
</style>
