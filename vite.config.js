import { defineConfig } from 'vitest/config';
import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';

// Vercel mengisi VERCEL=1 saat build. Di laptop dan VPS tetap adapter-node.
const adapter = process.env.VERCEL
	? adapterVercel({ regions: ['sin1'] })
	: adapterNode({ precompress: true });

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter,
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:', 'https://tile.openstreetmap.org'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'frame-ancestors': ['none'],
					'form-action': ['self'],
					'base-uri': ['self'],
					'object-src': ['none']
				}
			}
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.js',
				test: {
					name: 'server',
					environment: 'node',
					include: [
						'src/**/*.{test,spec}.{js,ts}',
						'pipeline/**/*.test.js',
						'scripts/**/*.test.js'
					],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
