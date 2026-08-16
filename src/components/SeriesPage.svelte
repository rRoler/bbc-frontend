<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { capitalizeFirstLetter, getAllSvelteSearchParams } from '../lib/utils.ts';
	import { downloadLocation } from '../lib/locations.ts';
	import { Download } from 'lucide-svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import Hover3D from './Hover3D.svelte';
	import BBC_API, { type BBCSeriesDetail, type BBCBook } from '../lib/apis/bbc.ts';
	import WsrvApi from '../lib/apis/wsrv.ts';
	import allProviders from '../lib/svelte/providers.svelte.ts';
	import SeriesCard from './SeriesCard.svelte';
	import BookCard from './BookCard.svelte';
	import Image from './Image.svelte';
	import ProviderSelector from './ProviderSelector.svelte';
	import ProviderLangSelector from './ProviderLangSelector.svelte';
	import { appState, addAppError } from '../lib/svelte/app.svelte.ts';
	import type { Provider } from '../lib/svelte/providers.svelte.ts';
	import { matureContentSetting } from '../lib/svelte/settings.svelte.ts';

	let id = $state<string>('');

	const api = new BBC_API();
	const imageApi = new WsrvApi();

	let mergedSeriesData = $state<Record<string, BBCSeriesDetail[]>>({});
	let singleSeriesData = $state<BBCSeriesDetail | null>(null);

	let isMerged = $derived(Object.keys(mergedSeriesData).length > 0);

	// Aggregated Hero Data
	let mergedHeroSeries = $state<BBCSeriesDetail | null>(null);
	let heroSeries = $derived(isMerged ? mergedHeroSeries : singleSeriesData);

	let allSubSeries = $derived(isMerged ? Object.values(mergedSeriesData).flat() : []);

	let activeProviders = $state<Provider[]>([]);

	// eslint-disable-next-line svelte/no-unnecessary-state-wrap
	let selectedLanguages = $state<SvelteSet<string>>(new SvelteSet<string>());

	let allAvailableLanguages = $derived.by(() => {
		const langs = new SvelteSet<string>();
		for (const provider of activeProviders) {
			if (provider.locale === 'multi') {
				const books = booksData[provider.id] || [];
				for (const b of books) {
					if (b.language) langs.add(b.language);
				}
			}
		}
		return Array.from(langs);
	});

	// Books data
	let booksData = $state<Record<string, BBCBook[]>>({});
	let booksLoading = $state<boolean>(false);
	let subSeriesLoading = $state<boolean>(false);

	onMount(() => {
		const parseHash = async () => {
			id = getAllSvelteSearchParams('id')[0];

			if (!id) {
				addAppError('No series ID provided.');
				appState.loading = false;
				return;
			}

			appState.loading = true;
			await init();
		};

		window.addEventListener('hashchange', parseHash);
		parseHash();

		return () => window.removeEventListener('hashchange', parseHash);
	});

	async function init() {
		try {
			if (id.includes('/')) {
				// Format: providerId/seriesId
				const [providerId, seriesId] = id.split('/');

				const sRes = await api.getSeries({ [providerId]: [seriesId] }, undefined, true);
				if (sRes.data[providerId]?.[0]) {
					singleSeriesData = sRes.data[providerId][0];
				} else {
					throw new Error('Series not found');
				}

				appState.loading = false; // Hero is ready

				loadSubSeriesAndBooks(providerId, seriesId, undefined);
			} else {
				// Format: mappedId
				const heroRes = await api.getDiscoverySeriesMapped(id);

				if (heroRes.data) {
					mergedHeroSeries = heroRes.data;
				} else {
					throw new Error('Mapped series not found');
				}

				appState.loading = false; // Hero is ready

				loadSubSeriesAndBooks(undefined, undefined, id);
			}
		} catch (e: unknown) {
			addAppError(e);
			appState.loading = false;
		}
	}

	async function loadSubSeriesAndBooks(providerId?: string, seriesId?: string, mappedId?: string) {
		subSeriesLoading = true;
		try {
			if (mappedId) {
				const res = await api.getSeriesByMappedId(mappedId);
				if (Object.keys(res.data).length > 0) {
					mergedSeriesData = res.data;
				}
			} else if (providerId && seriesId) {
				const res = await api.getMappedSeries(providerId, seriesId);
				if (res.data.length > 0) {
					const grouped: Record<string, BBCSeriesDetail[]> = {};
					res.data.forEach((s) => {
						if (!grouped[s.providerId]) grouped[s.providerId] = [];
						grouped[s.providerId].push(s);
					});
					mergedSeriesData = grouped;

					const mId = res.data[0].mappedId;
					if (mId) {
						api
							.getDiscoverySeriesMapped(mId)
							.then((h) => {
								if (h.data) mergedHeroSeries = h.data;
							})
							.catch(() => {});
					}
				}
			}

			// Initialize active providers
			if (isMerged) {
				activeProviders = allProviders.providers.filter((p) =>
					Object.keys(mergedSeriesData).includes(p.id)
				);
			} else if (singleSeriesData) {
				activeProviders = allProviders.providers.filter(
					(p) => p.id === singleSeriesData!.providerId
				);
			}
		} catch (e: unknown) {
			addAppError(e);
		} finally {
			subSeriesLoading = false;
		}

		await loadBooks();
	}

	async function loadBooks() {
		booksLoading = true;
		try {
			const seriesIdsToFetch: Record<string, string[]> = {};

			if (isMerged) {
				activeProviders.forEach((p) => {
					seriesIdsToFetch[p.id] = mergedSeriesData[p.id].map((s) => s.id);
				});
			} else if (
				singleSeriesData &&
				activeProviders.map((p) => p.id).includes(singleSeriesData.providerId)
			) {
				seriesIdsToFetch[singleSeriesData.providerId] = [singleSeriesData.id];
			}

			if (Object.keys(seriesIdsToFetch).length > 0) {
				const res = await api.getBooks(seriesIdsToFetch, {}, 'desc', 1, {}, false);
				booksData = res.data;
			} else {
				booksData = {};
			}
		} catch (e: unknown) {
			addAppError(e);
		} finally {
			booksLoading = false;
		}
	}

	function handleProviderChange() {
		loadBooks();
	}

	let flattenedBooks = $derived.by(() => {
		const result = Object.values(booksData)
			.flat()
			.filter((b) => b && activeProviders.map((p) => p.id).includes(b.providerId))
			.filter((b) => {
				const p = activeProviders.find((prov) => prov.id === b.providerId);
				if (p?.locale === 'multi' && selectedLanguages.size > 0 && !selectedLanguages.has('none')) {
					return b.language && selectedLanguages.has(b.language);
				}
				return true;
			});
		return result.sort((a, b) => {
			const volA = parseFloat(a.volume.number || '0');
			const volB = parseFloat(b.volume.number || '0');
			return volB - volA; // desc
		});
	});

	let openLink = $derived.by(() => {
		const basePath = downloadLocation.path;
		const params = new SvelteURLSearchParams();

		if (isMerged) {
			Object.entries(mergedSeriesData).forEach(([providerId, series]) => {
				series.forEach((s) => params.append(`${s.type}(${providerId})`, s.id));
			});
		} else if (singleSeriesData) {
			params.append(
				`${singleSeriesData.type}(${singleSeriesData.providerId})`,
				singleSeriesData.id
			);
		}

		if (heroSeries?.mbId) {
			params.append('mb_id', heroSeries.mbId);
		}

		return `${basePath}?${params.toString()}`;
	});

	const getMuLink = (id: string) => {
		return /^\d+$/.test(id)
			? `https://www.mangaupdates.com/series.html?id=${id}`
			: `https://www.mangaupdates.com/series/${id}`;
	};

	const trackers = $derived.by(() => {
		if (!heroSeries) return [];

		const list: { name: string; url: string; iconUrl: string }[] = [];

		if (heroSeries.alId)
			list.push({
				name: 'AniList',
				url: `https://anilist.co/manga/${heroSeries.alId}`,
				iconUrl: 'https://anilist.co',
			});
		if (heroSeries.malId)
			list.push({
				name: 'MyAnimeList',
				url: `https://myanimelist.net/manga/${heroSeries.malId}`,
				iconUrl: 'https://myanimelist.net',
			});
		if (heroSeries.muId)
			list.push({
				name: 'MangaUpdates',
				url: getMuLink(heroSeries.muId),
				iconUrl: 'https://www.mangaupdates.com',
			});
		if (heroSeries.nuId)
			list.push({
				name: 'NovelUpdates',
				url: `https://www.novelupdates.com/series/${heroSeries.nuId}`,
				iconUrl: 'https://www.novelupdates.com',
			});
		if (heroSeries.apId)
			list.push({
				name: 'Anime-Planet',
				url: `https://www.anime-planet.com/manga/${heroSeries.apId}`,
				iconUrl: 'https://www.anime-planet.com',
			});
		if (heroSeries.ktId)
			list.push({
				name: 'Kitsu',
				url: `https://kitsu.app/manga/${heroSeries.ktId}`,
				iconUrl: 'https://kitsu.app',
			});
		if (heroSeries.shikiId)
			list.push({
				name: 'Shikimori',
				url: `https://shikimori.one/mangas/${heroSeries.shikiId}`,
				iconUrl: 'https://shikimori.one',
			});
		if (heroSeries.mbId)
			list.push({
				name: 'MangaBaka',
				url: `https://mangabaka.org/${heroSeries.mbId}`,
				iconUrl: 'https://mangabaka.org',
			});

		return list;
	});
</script>

{#if heroSeries}
	<div class="bg-base-100 flex w-full grow flex-col">
		<!-- Hero Section -->
		<div
			class="hero bg-base-200 relative overflow-hidden"
			style={heroSeries.thumbnail
				? `background-image: url(${imageApi.getUrl(heroSeries.thumbnail, { width: 1200, output: 'webp' }).href}); background-size: cover; background-position: center;`
				: ''}
		>
			<!-- Background Blur -->
			{#if heroSeries.thumbnail}
				<div class="hero-overlay bg-base-200/80 z-0 backdrop-blur-2xl"></div>
			{/if}

			<div
				class="hero-content relative z-10 w-full max-w-6xl flex-col items-center gap-8 py-12 md:flex-row md:items-start md:gap-12 md:py-20"
			>
				<!-- Cover -->
				<Hover3D class="z-10 w-48 shrink-0 md:w-64 lg:w-72">
					<div class="rounded-box bg-base-300 overflow-hidden shadow-2xl">
						{#if heroSeries.thumbnail}
							<Image
								src={imageApi.getUrl(heroSeries.thumbnail, { width: 640, output: 'webp' }).href}
								alt="{heroSeries.title} cover"
								class="aspect-[2.1/3] h-auto w-full object-cover {heroSeries.isMature &&
								matureContentSetting.value === 'blur'
									? 'blur-lg'
									: ''}"
							/>
						{:else}
							<div
								class="bg-base-300 flex aspect-[2.1/3] h-auto w-full items-center justify-center rounded-lg"
							>
								No Cover
							</div>
						{/if}
						{#if heroSeries.isMature}
							<div class="badge badge-error absolute top-2 right-2 font-bold">18+</div>
						{/if}
					</div>
				</Hover3D>

				<!-- Details -->
				<div class="flex w-full flex-col gap-4 text-center md:text-left">
					<div class="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
						<h1 class="line-clamp-3 text-3xl leading-tight font-bold md:text-5xl">
							<span class="from-primary to-secondary bg-linear-to-r bg-clip-text text-transparent">
								{heroSeries.title}
							</span>
						</h1>
					</div>

					<div
						class="flex flex-wrap justify-center gap-2 text-sm font-semibold opacity-80 md:justify-start"
					>
						{#if heroSeries.authors?.length}
							<span
								><span class="font-normal opacity-70">Author:</span>
								{heroSeries.authors.join(', ')}</span
							>
						{/if}
						{#if heroSeries.artists?.length}
							<span class="mx-2 opacity-30">•</span>
							<span
								><span class="font-normal opacity-70">Artist:</span>
								{heroSeries.artists.join(', ')}</span
							>
						{/if}
					</div>

					<div class="my-2 flex flex-wrap justify-center gap-2 md:justify-start">
						{#if heroSeries.bookType}
							<span class="badge badge-primary capitalize">{heroSeries.bookType}</span>
						{/if}
						{#if heroSeries.status}
							<span class="badge badge-outline capitalize">{heroSeries.status}</span>
						{/if}
					</div>

					{#if heroSeries.description}
						<div
							class="prose prose-sm md:prose-base mt-2 max-h-48 max-w-none overflow-y-auto opacity-80"
						>
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html heroSeries.description.replace(/\n/g, '<br/>')}
						</div>
					{/if}

					{#if heroSeries.tags?.length}
						<div class="mt-4 flex flex-wrap justify-center gap-1 md:justify-start">
							{#each heroSeries.tags.slice(0, 15) as tag (tag)}
								<span class="badge badge-sm badge-neutral">{capitalizeFirstLetter(tag)}</span>
							{/each}
						</div>
					{/if}

					<!-- Tracking Sites -->
					{#if trackers.length > 0}
						<div class="my-2 mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
							{#each trackers as tracker (tracker.name)}
								<a
									href={tracker.url}
									target="_blank"
									rel="noopener noreferrer"
									class="btn btn-soft btn-xs sm:btn-sm"
								>
									<img
										src={`https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${tracker.iconUrl}&size=64`}
										alt={tracker.name}
										class="size-3 sm:size-4"
									/>
									{tracker.name}
								</a>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="container mx-auto flex max-w-7xl flex-col gap-12 px-4 py-8">
			<!-- Sub-Series Cards for Merged Cluster -->
			{#if subSeriesLoading}
				<section>
					<h2 class="mb-4 text-2xl font-bold">Sub-Series</h2>
					<div class="flex w-full flex-col items-center justify-center gap-4 py-16">
						<span class="loading loading-spinner loading-xl text-primary size-16"></span>
						<p class="text-base-content/70 text-lg font-semibold">Loading sub-series...</p>
					</div>
				</section>
			{:else if isMerged && allSubSeries.length > 0}
				<section>
					<h2 class="mb-4 text-2xl font-bold">Sub-Series ({allSubSeries.length})</h2>
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
						{#each allSubSeries as subSeries (subSeries.providerId + '-' + subSeries.id)}
							<SeriesCard series={subSeries} />
						{/each}
					</div>
				</section>
			{/if}

			<!-- Books Section -->
			<section>
				<div class="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
					<h2 class="text-2xl font-bold">Books & Volumes</h2>

					{#if isMerged && Object.keys(mergedSeriesData).length > 1}
						<ProviderSelector
							onchange={handleProviderChange}
							providers={allProviders.providers.filter((p) =>
								Object.keys(mergedSeriesData).includes(p.id)
							)}
							bind:selected={activeProviders}
						/>
					{/if}
					{#if allAvailableLanguages.length > 1 || selectedLanguages.size > 0}
						<ProviderLangSelector
							languages={allAvailableLanguages}
							bind:selected={selectedLanguages}
						/>
					{/if}
				</div>

				<!-- Books List -->
				<div class="w-full pb-12">
					{#if booksLoading}
						<div class="flex w-full flex-col items-center justify-center gap-4 p-16">
							<span class="loading loading-spinner loading-xl text-primary size-16"></span>
							<p class="text-base-content/70 text-lg font-semibold">Loading books...</p>
						</div>
					{:else if flattenedBooks.length > 0}
						<div
							class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
						>
							{#each flattenedBooks as book (book.providerId + '-' + book.id)}
								<BookCard {book} />
							{/each}
						</div>
					{:else}
						<div class="py-12 text-center opacity-50">
							No books found matching the active filters.
						</div>
					{/if}
				</div>
			</section>
		</div>

		<!-- Floating Download Button -->
		<div
			class="pointer-events-none sticky bottom-4 left-0 z-50 flex w-full flex-row items-center justify-center pt-4"
		>
			<a class="btn btn-lg btn-primary pointer-events-auto shadow-lg" href={openLink}>
				<Download class="size-6" />
				Download Covers
			</a>
		</div>
	</div>
{/if}
