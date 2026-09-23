<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';

	const hilang = $derived(page.status === 404);
	// pesan bawaan SvelteKit berbahasa Inggris ("Not Found", "Internal Error"): ganti dengan teks sendiri
	const pesan = $derived(
		page.error?.message && !/^(Not Found|Internal Error)$/i.test(page.error.message)
			? page.error.message
			: hilang
				? 'Alamat ini tidak ada di direktori. Mungkin tautannya salah ketik atau tempatnya sudah dihapus.'
				: 'Server sedang bermasalah. Coba muat ulang beberapa saat lagi.'
	);
</script>

<svelte:head>
	<title>{hilang ? 'Tidak ditemukan' : 'Terjadi kesalahan'} · Magang IT Sulsel</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="galat wadah" aria-labelledby="judul-galat">
	<p class="galat-kode" aria-hidden="true">{page.status}</p>
	<p class="label-mikro">{hilang ? 'Lembar tidak ditemukan' : `Galat ${page.status}`}</p>
	<h1 id="judul-galat">
		{hilang ? 'Titik ini belum ada di peta kami' : 'Ada yang tidak beres'}
	</h1>
	<p class="galat-pesan">{pesan}</p>
	<p class="galat-aksi">
		<a class="tombol tombol--utama" href={resolve('/')}>
			<Icon name="search" size={16} /> Cari di direktori
		</a>
		{#if hilang}
			<a class="tombol" href={resolve('/usulkan')}>
				<Icon name="plus" size={16} /> Usulkan tempat
			</a>
		{/if}
	</p>
</section>

<style>
	.galat {
		position: relative;
		display: grid;
		justify-items: start;
		gap: 0.9rem;
		padding-block: clamp(3rem, 10vw, 7rem) clamp(2rem, 6vw, 4rem);
	}

	.galat-kode {
		font-family: var(--font-display);
		font-size: clamp(5rem, 3rem + 10vw, 11rem);
		line-height: 0.85;
		letter-spacing: -0.04em;
		color: transparent;
		-webkit-text-stroke: 1.5px var(--line-strong);
	}

	h1 {
		max-width: 18ch;
		font-size: clamp(1.9rem, 1.2rem + 2.6vw, 3.1rem);
		line-height: 1.06;
	}

	.galat-pesan {
		max-width: 52ch;
		color: var(--ink-soft);
		font-size: 1.05rem;
	}

	.galat-aksi {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.6rem;
	}
</style>
