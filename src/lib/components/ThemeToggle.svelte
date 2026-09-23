<script>
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';

	/** @typedef {'sistem' | 'terang' | 'gelap'} Tema */
	/** @type {Tema[]} */
	const URUTAN = ['sistem', 'terang', 'gelap'];
	/** @type {Record<Tema, string>} */
	const LABEL = {
		sistem: 'Tema mengikuti sistem. Klik untuk tema terang',
		terang: 'Tema terang. Klik untuk tema gelap',
		gelap: 'Tema gelap. Klik untuk mengikuti sistem'
	};

	/** @type {Tema} */
	let tema = $state('sistem');

	/** Warna --bg per tema; bilah alamat browser ponsel ikut tema pilihan, bukan hanya tema sistem. */
	const WARNA_BILAH = { terang: '#f3ede2', gelap: '#0f1a1c' };

	/** @param {Tema} t */
	function setelWarnaBilah(t) {
		for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
			const el = /** @type {HTMLMetaElement} */ (m);
			el.dataset.asli ??= el.content;
			el.content = t === 'sistem' ? el.dataset.asli : WARNA_BILAH[t];
		}
	}

	onMount(() => {
		const t = document.documentElement.dataset.tema;
		if (t === 'terang' || t === 'gelap') {
			tema = t;
			setelWarnaBilah(t);
		}
	});

	function ganti() {
		tema = URUTAN[(URUTAN.indexOf(tema) + 1) % URUTAN.length];
		const root = document.documentElement;
		try {
			if (tema === 'sistem') localStorage.removeItem('tema');
			else localStorage.setItem('tema', tema);
		} catch {
			// mode privat: tema tetap berlaku sampai halaman ditutup
		}
		if (tema === 'sistem') delete root.dataset.tema;
		else root.dataset.tema = tema;
		setelWarnaBilah(tema);
	}
</script>

<button
	type="button"
	class="ikon-tombol"
	onclick={ganti}
	aria-label={LABEL[tema]}
	title={LABEL[tema]}
>
	<Icon name={tema === 'sistem' ? 'monitor' : tema === 'terang' ? 'sun' : 'moon'} />
</button>
