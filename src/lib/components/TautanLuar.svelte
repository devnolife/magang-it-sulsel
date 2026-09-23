<script>
	import { urlAman } from '$lib/kontak.js';

	/**
	 * Tautan keluar situs: hanya http/https, selalu tab baru dengan rel aman, dan diumumkan ke
	 * pembaca layar. URL yang tidak aman dirender sebagai teks biasa.
	 * @type {{
	 *   href: string | null | undefined,
	 *   rel?: string,
	 *   class?: import('svelte/elements').ClassValue,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { href, rel = 'external noopener noreferrer', class: kelas, children } = $props();

	const aman = $derived(urlAman(href));
</script>

{#if aman}
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- tautan keluar situs -->
	<a href={aman} class={kelas} target="_blank" {rel}
		>{@render children()}<span class="sr-only"> (membuka tab baru)</span></a
	>
{:else}
	<span class={kelas}>{@render children()}</span>
{/if}
