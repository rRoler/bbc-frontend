// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import svelte from '@astrojs/svelte';

import sitemap from '@astrojs/sitemap';

import AstroPWA from '@vite-pwa/astro';

const prodBranch = 'prod';
const prodSite = 'https://covers.roler.dev';
const previewSite = process.env.CF_PAGES_BRANCH
	? `https://${process.env.CF_PAGES_BRANCH}.bbc-frontend.pages.dev`
	: null;
const currentTime = new Date();

// https://astro.build/config
export default defineConfig({
	vite: {
		// @ts-ignore
		plugins: [tailwindcss()],
	},
	site:
		!process.env.CF_PAGES_BRANCH || process.env.CF_PAGES_BRANCH === prodBranch
			? prodSite
			: previewSite || prodSite,
	integrations: [
		svelte(),
		sitemap({
			serialize(item) {
				const itemURL = new URL(item.url);

				// @ts-ignore
				item.lastmod = currentTime;
				// @ts-ignore
				item.changefreq = 'daily';
				item.priority = 0.5;
				if (itemURL.pathname === '/') {
					// @ts-ignore
					item.changefreq = 'monthly';
					item.priority = 1.0;
				} else {
					// @ts-ignore
					item.changefreq = 'weekly';
					item.priority = 0.7;
				}

				return item;
			},
		}),
		AstroPWA({
			mode: import.meta.env.DEV ? 'development' : 'production',
			base: '/',
			scope: '/',
			includeAssets: ['favicon.svg'],
			registerType: 'prompt',
			manifest: {
				name: 'Big Book Covers',
				short_name: 'BBC',
				theme_color: '#04262e',
				background_color: '#030d11',
			},
			pwaAssets: {
				config: true,
			},
			workbox: {
				navigateFallback: '/404',
				navigateFallbackDenylist: [/sitemap.*\.xml$/, /robots\.txt$/],
				globPatterns: ['**/*.{css,js,html,svg,png,ico,txt}'],
				ignoreURLParametersMatching: [/.*/],
			},
			devOptions: {
				enabled: false,
				navigateFallbackAllowlist: [/^\/.*/],
			},
			experimental: {
				directoryAndTrailingSlashHandler: true,
			},
		}),
	],
	prefetch: true,
	output: 'static',
});
