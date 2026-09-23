<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import TautanLuar from '$lib/components/TautanLuar.svelte';
	import { urlIsu } from '$lib/isu.js';
	import { emailKontak } from '$lib/kontak-pengelola.js';

	const email = emailKontak();

	const JALUR = [
		{
			no: '01',
			ikon: /** @type {const} */ ('plus'),
			judul: 'Usulkan tempat',
			isi: 'Perusahaan atau instansi berunsur informatika di Sulawesi Selatan yang belum ada di direktori. Sertakan tautan Google Maps bila bisa.',
			tombol: 'Isi formulir usulan',
			href: urlIsu('usulan-tempat')
		},
		{
			no: '02',
			ikon: /** @type {const} */ ('alert'),
			judul: 'Koreksi atau laporan',
			isi: 'Data salah, tempat tutup atau pindah, info lowongan, waspada penipuan, atau minta hapus data. Paling mudah lewat tautan “Laporkan koreksi” di halaman tempatnya.',
			tombol: 'Isi formulir koreksi',
			href: urlIsu('koreksi-data')
		},
		{
			no: '03',
			ikon: /** @type {const} */ ('briefcase'),
			judul: 'Cerita magang',
			isi: 'Pernah magang atau PKL di salah satu tempat? Ceritakan bidang, durasi, uang saku, sertifikat, dan saran untuk adik tingkat.',
			tombol: 'Tulis cerita',
			href: urlIsu('cerita-magang')
		}
	];

	const judul = 'Usulkan tempat, koreksi, atau cerita magang · Magang IT Sulsel';
	const deskripsi =
		'Usulkan tempat magang informatika di Sulawesi Selatan, laporkan data yang salah, atau bagikan cerita magang Anda.';
	const kanonik = $derived(new URL(resolve('/usulkan'), page.url).href);
</script>

<svelte:head>
	<title>{judul}</title>
	<meta name="description" content={deskripsi} />
	<link rel="canonical" href={kanonik} />
	<meta property="og:type" content="website" />
	<meta property="og:locale" content="id_ID" />
	<meta property="og:title" content={judul} />
	<meta property="og:description" content={deskripsi} />
</svelte:head>

<section class="sampul wadah" aria-labelledby="judul-usulkan">
	<p class="label-mikro sampul-alis">Usulkan · Koreksi · Cerita</p>
	<h1 id="judul-usulkan">Bantu lengkapi atlas ini.</h1>
	<p class="sampul-lede">
		Direktori ini dirawat bersama. Kiriman dibuat lewat formulir <strong>GitHub Issues</strong>:
		perlu akun GitHub (gratis), dan isiannya tampil publik, jadi jangan menulis data pribadi.
		Pengelola memeriksa setiap kiriman sebelum datanya diubah.
	</p>
</section>

<div class="wadah">
	<ol class="jalur">
		{#each JALUR as j (j.no)}
			<li class="kartu-jalur">
				<p class="jalur-no" aria-hidden="true">{j.no}</p>
				<h2><Icon name={j.ikon} size={20} /> {j.judul}</h2>
				<p class="jalur-isi">{j.isi}</p>
				<TautanLuar href={j.href} class="tombol tombol--utama jalur-tombol">
					{j.tombol}
					<Icon name="external" size={15} />
				</TautanLuar>
			</li>
		{/each}
	</ol>

	<div class="lanjut">
		<section aria-labelledby="judul-proses">
			<h2 id="judul-proses">Setelah dikirim</h2>
			<ol class="proses">
				<li>Pengelola mencocokkan kiriman dengan Google Maps, situs resmi, atau sumber lain.</li>
				<li>Bila sesuai, datanya masuk pada pembaruan direktori berikutnya.</li>
				<li>Isu di GitHub ditutup dengan keterangan, jadi Anda bisa memantau hasilnya.</li>
			</ol>
		</section>

		<section aria-labelledby="judul-tanpa-akun">
			<h2 id="judul-tanpa-akun">Tidak punya akun GitHub?</h2>
			{#if email}
				<p>
					Kirim usulan, koreksi, atau permintaan hapus data lewat email ke
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- tautan email -->
					<a href="mailto:{email}?subject={encodeURIComponent('Magang IT Sulsel')}">{email}</a>.
				</p>
			{:else}
				<p>
					Membuat akun GitHub gratis dan cukup memakai email:
					<TautanLuar href="https://github.com/signup">github.com/signup</TautanLuar>. Bisa juga
					minta tolong teman yang sudah punya akun.
				</p>
			{/if}
			<p class="catatan-kecil">
				Toko atau servis komputer, kursus/LPK, warnet, percetakan, dan konter pulsa tidak
				dimasukkan.
				<a href={resolve('/tentang#jenis')}>Siapa yang masuk direktori?</a>
			</p>
		</section>
	</div>
</div>

<style>
	.sampul {
		padding-block: clamp(1.75rem, 5vw, 3.75rem) clamp(1.5rem, 4vw, 2.5rem);
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
		max-width: 18ch;
		margin-top: 1rem;
		font-size: clamp(2.15rem, 1.15rem + 3.8vw, 4.1rem);
		line-height: 1.04;
		letter-spacing: -0.02em;
	}

	.sampul-lede {
		max-width: 64ch;
		margin-top: 1.25rem;
		color: var(--ink-soft);
		font-size: clamp(1.02rem, 0.96rem + 0.3vw, 1.18rem);
	}

	.sampul-lede strong {
		color: var(--ink);
	}

	.jalur {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr));
		gap: 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.kartu-jalur {
		position: relative;
		display: grid;
		grid-template-rows: auto auto 1fr auto;
		gap: 0.7rem;
		padding: 1.35rem 1.35rem 1.25rem;
		overflow: hidden;
		border: 1px solid var(--line-strong);
		border-radius: var(--radius);
		background: var(--bg-elev);
		box-shadow: var(--shadow-sm);
		animation: naik 0.5s var(--ease-out) backwards;
	}

	.kartu-jalur:nth-child(2) {
		animation-delay: 0.06s;
	}

	.kartu-jalur:nth-child(3) {
		animation-delay: 0.12s;
	}

	.jalur-no {
		font-family: var(--font-mono);
		font-stretch: 87.5%;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		color: var(--accent);
	}

	.kartu-jalur h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.45rem;
	}

	.jalur-isi {
		color: var(--ink-soft);
	}

	.kartu-jalur :global(.jalur-tombol) {
		justify-self: start;
		margin-top: 0.35rem;
	}

	.lanjut {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
		gap: 1.75rem clamp(2rem, 6vw, 5rem);
		margin-top: clamp(2.25rem, 5vw, 3.25rem);
	}

	.lanjut h2 {
		margin-bottom: 0.8rem;
		padding-bottom: 0.55rem;
		border-bottom: 1px solid var(--line-strong);
		font-size: clamp(1.3rem, 1.15rem + 0.5vw, 1.6rem);
	}

	.lanjut p,
	.proses li {
		color: var(--ink-soft);
	}

	.lanjut a,
	.lanjut :global(a[target='_blank']) {
		color: var(--ink);
	}

	.lanjut a:hover,
	.lanjut :global(a[target='_blank']:hover) {
		color: var(--accent);
	}

	.proses {
		display: grid;
		gap: 0.45rem;
		margin: 0;
		padding-left: 1.25rem;
	}

	.proses ::marker {
		color: var(--accent);
		font-family: var(--font-mono);
		font-size: 0.8125rem;
	}

	.catatan-kecil {
		margin-top: 0.9rem;
		font-size: 0.9375rem;
	}
</style>
