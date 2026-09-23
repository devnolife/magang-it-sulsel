<script>
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { JENIS, JENIS_KEYS } from '$lib/shared/jenis.js';
	import { SULSEL_BBOX, kabkotaLabel } from '$lib/shared/wilayah.js';

	/**
	 * @typedef {Pick<import('$lib/server/companies.js').ListItem, 'slug' | 'nama' | 'jenis' | 'kabkota' | 'lat' | 'lng'>} TitikPeta
	 * @typedef {TitikPeta & { lat: number, lng: number }} TitikValid
	 * @typedef {typeof import('leaflet')} Leaflet
	 */

	/**
	 * Leaflet baru dimuat saat wadah peta terlihat (di ponsel: saat tab Peta dibuka).
	 * `mini`: peta satu lokasi di tengah halaman, jadi tanpa popup dan tidak membajak gulir
	 * halaman (roda tetikus; seret di layar sentuh).
	 * @type {{
	 *   items: TitikPeta[],
	 *   saya?: { lat: number, lng: number } | null,
	 *   onpilih?: (slug: string) => void,
	 *   label?: string,
	 *   mini?: boolean
	 * }}
	 */
	let { items, saya = null, onpilih, label = 'Peta sebaran tempat', mini = false } = $props();

	/** @type {HTMLDivElement | undefined} */
	let kanvas = $state();
	let siap = $state(false);
	let gagal = $state(false);

	/** @type {Leaflet | null} */
	let L = null;
	/** @type {import('leaflet').Map | null} */
	let peta = null;
	/** @type {import('leaflet').MarkerClusterGroup | null} */
	let klaster = null;
	/** @type {import('leaflet').Marker | null} */
	let penandaSaya = null;
	// Cache objek Leaflet yang diurus secara imperatif; sengaja tidak reaktif.
	/* eslint-disable svelte/prefer-svelte-reactivity */
	const penanda = /** @type {Map<string, import('leaflet').Marker>} */ (new Map());
	const jenisPenanda = /** @type {WeakMap<import('leaflet').Marker, string>} */ (new WeakMap());
	const ikonJenis = /** @type {Map<string, import('leaflet').DivIcon>} */ (new Map());
	/* eslint-enable svelte/prefer-svelte-reactivity */
	let kunciTerakhir = '';
	let sudahDiatur = false;
	let sayaPernahDitampilkan = false;
	/** @type {{ slug: string, pindahFokus: boolean } | null} */
	let tertunda = null;

	/** @param {TitikPeta} c @returns {c is TitikValid} */
	const berkoordinat = (c) => c.lat != null && c.lng != null;

	/** @param {{ lat: number, lng: number }} p */
	const diSulsel = (p) =>
		p.lat >= SULSEL_BBOX[0] &&
		p.lat <= SULSEL_BBOX[2] &&
		p.lng >= SULSEL_BBOX[1] &&
		p.lng <= SULSEL_BBOX[3];

	onMount(() => {
		let batal = false;
		/** @type {ResizeObserver | undefined} */
		let ro;
		const el = /** @type {HTMLDivElement} */ (kanvas);

		async function muat() {
			const mod = await import('leaflet');
			const Lf = /** @type {Leaflet} */ (/** @type {any} */ (mod).default ?? mod);
			// leaflet.markercluster (UMD) menempel ke L global
			/** @type {any} */ (window).L = Lf;
			await import('leaflet.markercluster');
			if (batal) return;
			L = Lf;
			buatPeta(Lf, el);
			ro = new ResizeObserver(() => peta?.invalidateSize());
			ro.observe(el);
			siap = true;
		}

		const io = new IntersectionObserver(
			(entri) => {
				if (!entri.some((e) => e.isIntersecting)) return;
				io.disconnect();
				muat().catch(() => {
					gagal = true;
				});
			},
			{ rootMargin: '300px' }
		);
		io.observe(el);

		return () => {
			batal = true;
			io.disconnect();
			ro?.disconnect();
			peta?.remove();
			peta = null;
		};
	});

	/** @param {Leaflet} Lf @param {HTMLDivElement} el */
	function buatPeta(Lf, el) {
		const [s, w, n, e] = SULSEL_BBOX;
		peta = Lf.map(el, {
			zoomSnap: 0.5,
			minZoom: 6,
			maxBounds: Lf.latLngBounds([s - 2, w - 2], [n + 2, e + 2]),
			maxBoundsViscosity: 0.7,
			scrollWheelZoom: !mini,
			dragging: !mini || !Lf.Browser.mobile
		});
		peta.attributionControl.setPrefix('<a href="https://leafletjs.com" rel="noopener">Leaflet</a>');
		Lf.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a>'
		}).addTo(peta);
		Lf.control.scale({ imperial: false }).addTo(peta);
		klaster = Lf.markerClusterGroup({
			showCoverageOnHover: false,
			maxClusterRadius: 46,
			spiderfyOnMaxZoom: true,
			chunkedLoading: true,
			iconCreateFunction: ikonKlaster
		});
		peta.addLayer(klaster);
		peta.fitBounds(Lf.latLngBounds([s, w], [n, e]), { animate: false });
	}

	/** @param {Leaflet} Lf @param {string} jenis */
	function ikonUntuk(Lf, jenis) {
		let ikon = ikonJenis.get(jenis);
		if (!ikon) {
			const r = mini ? 11 : 8;
			ikon = Lf.divIcon({
				className: `penanda j-${jenis}${mini ? ' penanda--besar' : ''}`,
				iconSize: [r * 2, r * 2],
				iconAnchor: [r, r],
				popupAnchor: [0, -(r + 1)]
			});
			ikonJenis.set(jenis, ikon);
		}
		return ikon;
	}

	/** Gelembung klaster: cincin conic menunjukkan komposisi jenis di dalamnya. */
	function ikonKlaster(/** @type {import('leaflet').MarkerCluster} */ cl) {
		const Lf = /** @type {Leaflet} */ (L);
		const anak = cl.getAllChildMarkers();
		/** @type {Record<string, number>} */
		const hitung = {};
		for (const m of anak) {
			const j = jenisPenanda.get(m) ?? 'software';
			hitung[j] = (hitung[j] ?? 0) + 1;
		}
		const potong = [];
		let sudut = 0;
		for (const j of JENIS_KEYS) {
			if (!hitung[j]) continue;
			const akhir = sudut + (hitung[j] / anak.length) * 360;
			potong.push(`var(--j-${j}) ${sudut.toFixed(1)}deg ${akhir.toFixed(1)}deg`);
			sudut = akhir;
		}
		const n = anak.length;
		const ukuran = n < 10 ? 34 : n < 50 ? 40 : n < 200 ? 46 : 54;
		const cincin = document.createElement('div');
		cincin.className = 'klaster-cincin';
		cincin.style.background = `conic-gradient(${potong.join(', ')})`;
		const angka = document.createElement('span');
		angka.textContent = String(n);
		cincin.append(angka);
		return Lf.divIcon({ html: cincin, className: 'klaster', iconSize: [ukuran, ukuran] });
	}

	/** Isi popup dibangun lewat DOM + textContent (nama berasal dari data luar). */
	function isiPopup(/** @type {TitikValid} */ c) {
		const akar = document.createElement('div');
		akar.className = `popup j-${c.jenis}`;
		const meta = document.createElement('p');
		meta.className = 'popup-meta';
		meta.textContent = `${JENIS[c.jenis].short} · ${kabkotaLabel(c.kabkota)}`;
		const nama = document.createElement('a');
		nama.className = 'popup-nama';
		nama.href = resolve('/perusahaan/[slug]', { slug: c.slug });
		nama.textContent = c.nama;
		akar.append(meta, nama);
		if (onpilih) {
			const tombol = document.createElement('button');
			tombol.type = 'button';
			tombol.className = 'popup-tombol';
			tombol.textContent = 'Lihat kartunya di daftar';
			tombol.addEventListener('click', () => {
				peta?.closePopup();
				onpilih?.(c.slug);
			});
			akar.append(tombol);
		}
		return akar;
	}

	/** @param {Leaflet} Lf @param {TitikValid} c */
	function penandaUntuk(Lf, c) {
		let m = penanda.get(c.slug);
		if (!m) {
			m = Lf.marker([c.lat, c.lng], {
				icon: ikonUntuk(Lf, c.jenis),
				title: c.nama,
				riseOnHover: true,
				// peta mini: penanda hanya penunjuk, bukan kontrol (tidak ada yang bisa dibuka)
				interactive: !mini,
				keyboard: !mini
			});
			if (!mini) {
				m.bindPopup(() => isiPopup(c), { minWidth: 190, maxWidth: 270, autoPanPadding: [24, 24] });
			}
			jenisPenanda.set(m, c.jenis);
			penanda.set(c.slug, m);
		}
		return m;
	}

	/** @param {TitikPeta[]} daftar */
	function perbarui(daftar) {
		const Lf = L;
		if (!Lf || !peta || !klaster) return;
		const valid = daftar.filter(berkoordinat);
		// urutan (relevansi/nama/terdekat) tidak mengubah isi peta, jadi jangan reset tampilan
		const kunci = valid
			.map((c) => c.slug)
			.sort()
			.join('|');
		if (kunci === kunciTerakhir && sudahDiatur) return;
		kunciTerakhir = kunci;
		klaster.clearLayers();
		klaster.addLayers(valid.map((c) => penandaUntuk(Lf, c)));
		const animasi = sudahDiatur;
		sudahDiatur = true;
		if (valid.length === 1) {
			peta.setView([valid[0].lat, valid[0].lng], mini ? 16 : 15, { animate: animasi });
		} else if (valid.length) {
			peta.fitBounds(Lf.latLngBounds(valid.map((c) => [c.lat, c.lng])), {
				padding: [36, 36],
				maxZoom: 14,
				animate: animasi
			});
		}
		if (tertunda) {
			const { slug, pindahFokus } = tertunda;
			tertunda = null;
			fokus(slug, pindahFokus);
		}
	}

	$effect(() => {
		const daftar = items;
		if (siap) perbarui(daftar);
	});

	$effect(() => {
		const posisi = saya;
		if (!siap || !L || !peta) return;
		if (!posisi) {
			penandaSaya?.remove();
			penandaSaya = null;
			return;
		}
		const ll = L.latLng(posisi.lat, posisi.lng);
		if (penandaSaya) penandaSaya.setLatLng(ll);
		else {
			penandaSaya = L.marker(ll, {
				icon: L.divIcon({
					className: 'saya',
					html: '<span class="saya-label">Anda</span>',
					iconSize: [18, 18],
					iconAnchor: [9, 9]
				}),
				interactive: false,
				keyboard: false,
				zIndexOffset: 1000
			}).addTo(peta);
		}
		if (!sayaPernahDitampilkan && diSulsel(posisi)) {
			sayaPernahDitampilkan = true;
			peta.setView(ll, Math.max(peta.getZoom(), 13));
		}
	});

	/**
	 * Perbesar ke satu tempat dan buka popup-nya. Aman dipanggil sebelum peta siap.
	 * @param {string} slug
	 * @param {boolean} [pindahFokus] pindahkan fokus ke popup (dipakai saat daftar disembunyikan)
	 */
	export function fokus(slug, pindahFokus = false) {
		const m = penanda.get(slug);
		if (!siap || !peta || !klaster || !m || !klaster.hasLayer(m)) {
			tertunda = { slug, pindahFokus };
			return;
		}
		peta.invalidateSize();
		klaster.zoomToShowLayer(m, () => {
			m.openPopup();
			if (pindahFokus) {
				/** @type {HTMLElement | null | undefined} */ (
					m.getPopup()?.getElement()?.querySelector('.popup-nama')
				)?.focus({ preventScroll: true });
			}
		});
	}
</script>

<section class="peta" aria-label={label}>
	<div class="peta-kanvas" bind:this={kanvas}></div>
	{#if !siap}
		<div class="peta-tunggu">
			{#if gagal}
				<p>Peta gagal dimuat. Periksa koneksi, lalu muat ulang halaman.</p>
			{:else}
				<p class="label-mikro">Memuat peta…</p>
			{/if}
		</div>
	{/if}
</section>

<style>
	.peta {
		position: relative;
		height: 100%;
		min-height: 18rem;
		overflow: hidden;
		border: 1px solid var(--line-strong);
		border-radius: var(--radius);
		background: var(--bg-sunk);
		isolation: isolate;
	}

	.peta-kanvas {
		position: absolute;
		inset: 0;
	}

	.peta-tunggu {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 1.5rem;
		text-align: center;
	}

	.peta-tunggu::before {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--kontur);
		-webkit-mask: url('/tekstur/kontur.svg') center / cover;
		mask: url('/tekstur/kontur.svg') center / cover;
	}

	.peta-tunggu p {
		position: relative;
		color: var(--ink-soft);
	}
</style>
