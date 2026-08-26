<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		capitalizeFirstLetter,
		getAllSvelteSearchParams,
		getLocaleName,
		langToFlag,
	} from '../../utils';
	import { fade } from 'svelte/transition';
	import { downloadLocation, discoveryLocation } from '../../config/locations.ts';
	import {
		Download,
		EllipsisVertical,
		X,
		Check,
		Plus,
		ChevronLeft,
		ChevronRight,
	} from 'lucide-svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import Hover3D from '../ui/Hover3D.svelte';
	import userState from '../../stores/user.svelte.ts';
	import { ALLOWED_EDIT_ROLES } from '../../config/constants.ts';
	import BBC_API, {
		type BBCSeriesDetail,
		type BBCSeriesMerged,
		type BBCBook,
		type BBCSeriesSearchResult,
		getPeopleNames,
		getTagLabels,
		getPrimaryTitle,
		coverUrl,
	} from '../../api/bbc.ts';
	import WsrvApi from '../../api/wsrv.ts';
	import allProviders from '../../stores/providers.svelte.ts';
	import SeriesCard from '../domain/SeriesCard.svelte';
	import SeriesMapModal from '../domain/SeriesMapModal.svelte';
	import BookCard from '../domain/BookCard.svelte';
	import Image from '../ui/Image.svelte';
	import ProviderSelector from '../domain/ProviderSelector.svelte';
	import ProviderLabel from '../domain/ProviderLabel.svelte';
	import ProviderIcons from '../domain/ProviderIcons.svelte';
	import { appState, addAppError } from '../../stores/app.svelte.ts';
	import type { Provider } from '../../stores/providers.svelte.ts';
	import { deriveAvailableLanguages, toBaseLangSet } from '../../stores/providers.svelte.ts';
	import { matureContentSetting } from '../../stores/settings.svelte.ts';
	import { setPageMeta } from '../../utils/meta.ts';

	let id = $state<string>('');

	const api = new BBC_API();
	const imageApi = new WsrvApi();

	let mergedSeriesData = $state<Record<string, BBCSeriesDetail[]>>({});
	let singleSeriesData = $state<BBCSeriesDetail | null>(null);

	let isMerged = $derived(Object.keys(mergedSeriesData).length > 0);

	let mergedHeroSeries = $state<BBCSeriesMerged | null>(null);
	let heroSeries = $derived(isMerged ? mergedHeroSeries : singleSeriesData);

	let mainTitle = $derived(getPrimaryTitle(heroSeries?.titles));

	let mainDescription = $derived.by(() => {
		if (!heroSeries) return '';
		const descriptions = heroSeries.descriptions ?? [];
		return descriptions.find((d) => d.isPrimary)?.description ?? descriptions[0]?.description ?? '';
	});

	$effect(() => {
		setPageMeta({ title: mainTitle || undefined, description: mainDescription || undefined });
	});

	let allSubSeries = $derived.by(() => {
		const raw = isMerged
			? Object.values(mergedSeriesData).flat()
			: singleSeriesData
				? [singleSeriesData]
				: [];
		const seen = new SvelteSet<string>();
		return raw.filter((s) => {
			const key = s.providerId + '::' + s.id;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	});

	let activeProviders = $state<Provider[]>([]);

	// eslint-disable-next-line svelte/no-unnecessary-state-wrap
	let selectedLocales = $state<SvelteSet<string>>(new SvelteSet<string>());

	let langBaseSet = $derived(toBaseLangSet(selectedLocales));

	let availableLanguages = $derived(
		deriveAvailableLanguages(
			activeProviders,
			(p) => (booksData[p.id] ?? []).map((b) => b.language).filter(Boolean) as string[]
		)
	);

	// Books data
	let booksData = $state<Record<string, BBCBook[]>>({});
	let booksLoading = $state<boolean>(false);
	let subSeriesLoading = $state<boolean>(false);

	// Edit Mapping state
	let canEdit = $derived(userState.session && ALLOWED_EDIT_ROLES.includes(userState.session.role));
	let isEditing = $state(false);
	let applyingEdits = $state(false);
	let seriesToUnmap = new SvelteSet<string>();
	let seriesToAdd = new SvelteSet<BBCSeriesDetail | BBCSeriesSearchResult>();
	let mapModal = $state<ReturnType<typeof SeriesMapModal>>();

	let excludeIds = $derived.by(() => {
		const set = new SvelteSet<string>();
		allSubSeries.forEach((s) => set.add(s.providerId + '::' + s.id));
		seriesToAdd.forEach((s) => set.add(s.providerId + '::' + s.id));
		return set;
	});

	async function applyEdits() {
		if (applyingEdits) return;
		applyingEdits = true;
		try {
			// Process Unmaps
			for (const compositeId of seriesToUnmap) {
				const [pId, sId] = compositeId.split('::');
				await api.unmapSeries(pId, sId);

				if (mergedSeriesData[pId]) {
					mergedSeriesData[pId] = mergedSeriesData[pId].filter((s) => s.id !== sId);
					if (mergedSeriesData[pId].length === 0) {
						delete mergedSeriesData[pId];
					}
				}
			}

			// Process Maps
			if (seriesToAdd.size > 0) {
				const seriesList = Array.from(seriesToAdd).map((s) => ({
					providerId: s.providerId,
					id: s.id,
				}));

				if (!isMerged && singleSeriesData) {
					seriesList.push({
						providerId: singleSeriesData.providerId,
						id: singleSeriesData.id,
					});
				}

				const existingMappedId = heroSeries?.mappedId || singleSeriesData?.mappedId || undefined;
				await api.mapSeries(seriesList, existingMappedId);
			}

			isEditing = false;
			seriesToUnmap.clear();
			seriesToAdd.clear();

			// Reload page to fetch new mapping data
			await init();
		} catch (e) {
			addAppError(e);
		} finally {
			applyingEdits = false;
		}
	}

	function cancelEdits() {
		isEditing = false;
		seriesToUnmap.clear();
		seriesToAdd.clear();
	}

	function getBestSearchTitle(): string {
		const cjkRegex = /[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7a3]/;

		for (const series of allSubSeries) {
			const primaryTitle = getPrimaryTitle(series.titles);
			if (primaryTitle && cjkRegex.test(primaryTitle)) return primaryTitle;
			if (series.titles) {
				const cjkAlt = series.titles.find((t) => cjkRegex.test(t.title));
				if (cjkAlt) return cjkAlt.title;
			}
		}

		if (heroSeries) {
			const flatTitle = getPrimaryTitle(heroSeries.titles);
			if (flatTitle && cjkRegex.test(flatTitle)) return flatTitle;
			const cjkTitle = heroSeries.titles?.find((t) => cjkRegex.test(t.title));
			if (cjkTitle) return cjkTitle.title;
			return flatTitle;
		}

		return '';
	}

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

				if (matureContentSetting.value === 'hide') {
					await loadSubSeriesAndBooks(providerId, seriesId, undefined);
				} else {
					appState.loading = false; // Hero is ready
					loadSubSeriesAndBooks(providerId, seriesId, undefined);
				}
			} else {
				// Format: mappedId
				const heroRes = await api.getDiscoverySeriesMapped(id);

				if (heroRes.data) {
					mergedHeroSeries = heroRes.data;
				} else {
					throw new Error('Mapped series not found');
				}

				if (matureContentSetting.value === 'hide') {
					await loadSubSeriesAndBooks(undefined, undefined, id);
				} else {
					appState.loading = false; // Hero is ready
					loadSubSeriesAndBooks(undefined, undefined, id);
				}
			}

			if (matureContentSetting.value === 'hide') {
				const pageIsMature =
					(heroSeries?.isMature ?? false) || allSubSeries.some((s) => s.isMature);
				if (pageIsMature && !confirm('Mature content is disabled. Continue?')) {
					window.location.href = discoveryLocation.path;
					return;
				}
				appState.loading = false;
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

		loadBooks();
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

			if (matureContentSetting.value === 'hide' && flattenedBooks.some((b) => b.isMature)) {
				if (!confirm('Mature content is disabled. Continue?')) {
					window.location.href = discoveryLocation.path;
				}
			}
		} catch (e: unknown) {
			addAppError(e);
		} finally {
			booksLoading = false;
		}
	}

	let flattenedBooks = $derived.by(() => {
		const result = Object.values(booksData)
			.flat()
			.filter((b) => b && activeProviders.map((p) => p.id).includes(b.providerId))
			.filter((b) => {
				const p = activeProviders.find((prov) => prov.id === b.providerId);
				if (langBaseSet.size > 0 && p) {
					return b.language && langBaseSet.has(b.language);
				}
				return true;
			});

		const seen = new SvelteSet<string>();
		const deduplicated = result.filter((b) => {
			const key = b.providerId + '::' + b.id;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});

		return deduplicated.sort((a, b) => {
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

		const mbTracker = heroSeries?.trackers?.find((t) => t.trackerId === 'mb');
		if (mbTracker) {
			params.append('mb_id', mbTracker.externalId);
		}

		return `${basePath}?${params.toString()}`;
	});

	const trackers = $derived.by(() => {
		if (!heroSeries?.trackers) return [];

		return heroSeries.trackers.map((t) => ({
			trackerName: t.trackerName,
			url: t.externalUrl,
			iconUrl: new URL(t.externalUrl).origin,
		}));
	});

	function getProviderName(providerId: string): string {
		return allProviders.providers.find((p) => p.id === providerId)?.name || providerId;
	}

	function toProviders(ids: string[]): Provider[] {
		return ids
			.map((id) => allProviders.providers.find((p) => p.id === id))
			.filter((p): p is Provider => !!p);
	}

	let mergedDescriptions = $derived.by(() => {
		if (!mergedHeroSeries?.descriptions) return [];
		return mergedHeroSeries.descriptions;
	});

	let mergedTitles = $derived.by(() => {
		if (!mergedHeroSeries) return [];
		const titles: { language: string | null; title: string; isAlt: boolean }[] = [];
		if (mergedHeroSeries.titles) {
			mergedHeroSeries.titles.forEach((mt) => {
				if (mt.title !== mainTitle) {
					titles.push({ language: mt.language, title: mt.title, isAlt: !mt.isPrimary });
				}
			});
		}

		const seen = new SvelteSet<string>();
		return titles.filter((t) => {
			const key = `${t.title}-${t.language}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	});

	let heroAuthors = $derived(getPeopleNames(heroSeries?.people, 'author'));
	let heroArtists = $derived(getPeopleNames(heroSeries?.people, 'artist'));
	let heroTagList = $derived(
		(heroSeries?.tags ?? []).map((t) => ({
			label: getTagLabels([t])[0] ?? '',
			type: t.type,
			providers:
				'providers' in t && t.providers
					? (t.providers as string[])
					: 'providerId' in t && t.providerId
						? [t.providerId]
						: [],
		}))
	);

	let activeDescIdx = $state(0);
	let showAllTitles = $state(false);
	let showAllTags = $state(false);

	let visibleDescIdx = $derived.by(() => {
		if (mergedDescriptions.length === 0) return 0;
		return Math.min(mergedDescriptions.length - 1, Math.max(0, activeDescIdx));
	});

	function cycleDesc(delta: number) {
		const n = mergedDescriptions.length;
		if (n === 0) return;
		activeDescIdx = (activeDescIdx + delta + n) % n;
	}
</script>

{#if heroSeries}
	<div class="bg-base-100 flex w-full grow flex-col">
		<!-- Hero Section -->
		<div
			class="hero bg-base-200 relative overflow-hidden"
			style={coverUrl(heroSeries.covers)
				? `background-image: url(${imageApi.getUrl(coverUrl(heroSeries.covers)!, { width: 1200, output: 'webp' }).href}); background-size: cover; background-position: center;`
				: ''}
		>
			<!-- Background Blur -->
			{#if coverUrl(heroSeries.covers)}
				<div class="hero-overlay bg-base-200/80 z-0 backdrop-blur-2xl"></div>
			{/if}

			<div
				class="hero-content z-10 w-full max-w-7xl flex-col items-start gap-8 p-4 py-8 md:flex-row"
			>
				<!-- Cover -->
				<Hover3D class="z-10 mx-auto w-48 shrink-0 md:mx-0 md:w-64 lg:w-72">
					<div class="rounded-box bg-base-300 overflow-hidden shadow-2xl">
						{#if coverUrl(heroSeries.covers)}
							<Image
								src={imageApi.getUrl(coverUrl(heroSeries.covers)!, { width: 640, output: 'webp' })
									.href}
								alt="{mainTitle} cover"
								class="aspect-[2.1/3] h-auto w-full object-cover"
							/>
						{:else}
							<div
								class="flex aspect-[2.1/3] w-full items-center justify-center font-bold opacity-30"
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
				<div class="z-10 flex w-full flex-col">
					<div class="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
						<h1
							class="line-clamp-3 text-center text-2xl leading-tight font-bold md:text-left md:text-5xl"
						>
							<span class="from-primary to-secondary bg-linear-to-r bg-clip-text text-transparent">
								{mainTitle}
							</span>
						</h1>
					</div>

					<div
						class="mb-4 ml-2 flex flex-wrap justify-center gap-2 text-sm font-semibold opacity-80 md:justify-start"
					>
						{#if heroAuthors.length}
							<span
								><span class="font-normal opacity-70">Author:</span>
								{heroAuthors.join(', ')}</span
							>
						{/if}
						{#if heroArtists.length}
							<span class="mx-2 opacity-30">•</span>
							<span
								><span class="font-normal opacity-70">Artist:</span>
								{heroArtists.join(', ')}</span
							>
						{/if}
					</div>

					{#if mergedTitles.length > 0}
						<div class="mb-5 flex flex-wrap items-center justify-center gap-2 md:justify-start">
							{#each mergedTitles.slice(0, showAllTitles ? mergedTitles.length : 4) as title, idx (title.title + '-' + title.language + '-' + idx)}
								<div class="badge badge-neutral h-fit shadow-sm">
									{#if title.language}
										{@const Flag = langToFlag(title.language)}
										{#if Flag}
											<Flag size="14" class="shrink-0 rounded-xs opacity-80" />
										{:else}
											<span class="shrink-0 text-[10px] uppercase opacity-40"
												>({getLocaleName(title.language)})</span
											>
										{/if}
									{/if}
									<span class="text-xs font-semibold">{title.title}</span>
								</div>
							{/each}
							{#if mergedTitles.length > 4}
								<button
									class="btn btn-ghost btn-xs text-xs font-normal opacity-70 hover:opacity-100"
									onclick={() => (showAllTitles = !showAllTitles)}
								>
									{showAllTitles ? 'Show Less' : `+${mergedTitles.length - 4} More`}
								</button>
							{/if}
						</div>
					{/if}

					<div class="mb-4 flex flex-wrap justify-center gap-2 md:justify-start">
						{#if heroSeries.bookType}
							<span class="badge badge-primary capitalize">{heroSeries.bookType}</span>
						{/if}
						{#if heroSeries.status}
							<span class="badge badge-outline capitalize">{heroSeries.status}</span>
						{/if}
					</div>

					{#if mergedDescriptions.length > 0}
						{@const currentDesc = mergedDescriptions[visibleDescIdx]}
						{@const currentProviders = currentDesc.providers}
						<div class="mt-2 w-full max-w-full">
							<div
								class="bg-base-100/50 border-base-300 rounded-box relative overflow-hidden border p-4 shadow-sm backdrop-blur-sm"
							>
								<div class="mb-4 flex items-center justify-between">
									<div class="flex flex-wrap items-center gap-2">
										{#if currentProviders.length > 1}
											<ProviderIcons providers={toProviders(currentProviders)} size="size-5" />
										{:else if currentProviders.length === 1}
											{@const prov = allProviders.providers.find(
												(p) => p.id === currentProviders[0]
											)}
											{#if prov}
												<ProviderLabel provider={prov} />
											{:else}
												<span class="badge badge-primary font-semibold">
													{getProviderName(currentProviders[0])}
												</span>
											{/if}
										{/if}
									</div>

									{#if mergedDescriptions.length > 1}
										<div class="flex gap-2">
											<button
												class="btn btn-circle btn-sm"
												onclick={() => cycleDesc(-1)}
												aria-label="Previous synopsis"
											>
												<ChevronLeft class="size-4" />
											</button>
											<button
												class="btn btn-circle btn-sm"
												onclick={() => cycleDesc(1)}
												aria-label="Next synopsis"
											>
												<ChevronRight class="size-4" />
											</button>
										</div>
									{/if}
								</div>

								<div class="relative w-full">
									{#each mergedDescriptions as desc, i (desc.providers.join(',') + '-' + i)}
										{#if i === activeDescIdx}
											<div
												class="prose prose-sm max-h-48 max-w-none overflow-y-auto select-text"
												in:fade={{ duration: 200 }}
											>
												<!-- eslint-disable-next-line svelte/no-at-html-tags -->
												{@html desc.description.replace(/\n/g, '<br/>')}
											</div>
										{/if}
									{/each}
								</div>

								{#if mergedDescriptions.length > 1}
									<div class="mt-4 flex justify-center gap-1">
										{#each mergedDescriptions as _, i (i)}
											<div
												class="h-1.5 rounded-full transition-all duration-300 {i === visibleDescIdx
													? 'bg-primary w-4'
													: 'bg-base-content/20 w-1.5'}"
											></div>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{:else if mainDescription && !('descriptions' in heroSeries)}
						<div
							class="prose prose-sm md:prose-base mt-2 max-h-48 max-w-none overflow-y-auto opacity-80"
						>
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html mainDescription.replace(/\n/g, '<br/>')}
						</div>
					{/if}

					{#if heroTagList.length}
						<div
							class="mt-4 mb-2 flex flex-wrap items-center justify-center gap-1 md:justify-start"
						>
							{#each heroTagList.slice(0, showAllTags ? heroTagList.length : 10) as tag (tag.type + '-' + tag.label)}
								<span class="badge badge-sm badge-neutral flex items-center gap-1">
									{capitalizeFirstLetter(tag.label)}
								</span>
							{/each}
							{#if heroTagList.length > 10}
								<button
									class="btn btn-ghost btn-xs text-xs font-normal opacity-70 hover:opacity-100"
									onclick={() => (showAllTags = !showAllTags)}
								>
									{showAllTags ? 'Show Less' : `+${heroTagList.length - 10} More`}
								</button>
							{/if}
						</div>
					{/if}

					<!-- Tracking Sites -->
					{#if trackers.length > 0}
						<div class="mt-3 mb-2 flex flex-wrap justify-center gap-2 md:justify-start">
							{#each trackers as tracker (tracker.trackerName)}
								<a
									href={tracker.url}
									target="_blank"
									rel="noopener noreferrer"
									class="btn btn-soft btn-sm"
								>
									<img
										src={`https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${tracker.iconUrl}&size=64`}
										alt={tracker.trackerName}
										class="size-4 rounded-sm"
									/>
									{tracker.trackerName}
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
					<h2 class="mb-4 text-center text-2xl font-bold sm:text-left">Sub-Series</h2>
					<div class="flex w-full flex-col items-center justify-center gap-4 py-16">
						<span class="loading loading-spinner loading-xl text-primary size-16"></span>
						<p class="text-base-content/70 text-lg font-semibold">Loading sub-series...</p>
					</div>
				</section>
			{:else if isEditing || (isMerged && allSubSeries.length > 0)}
				<section>
					<h2 class="mb-4 text-center text-2xl font-bold sm:text-left">
						Sub-Series {isMerged ? `(${allSubSeries.length})` : ''}
					</h2>
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
						{#each allSubSeries as subSeries (subSeries.providerId + '-' + subSeries.id)}
							{#if !seriesToUnmap.has(subSeries.providerId + '::' + subSeries.id)}
								<div class="relative">
									<SeriesCard
										series={subSeries}
										href={`${downloadLocation.path}?${subSeries.type}(${subSeries.providerId})=${subSeries.id}`}
										blurMature={false}
									/>
									{#if isEditing && isMerged}
										<button
											class="btn btn-sm btn-circle btn-error absolute -top-2 -right-2 z-50 shadow-lg"
											onclick={() => seriesToUnmap.add(subSeries.providerId + '::' + subSeries.id)}
										>
											<X class="size-4" />
										</button>
									{/if}
								</div>
							{/if}
						{/each}

						{#if isEditing}
							{#each Array.from(seriesToAdd) as newSeries (newSeries.providerId + '-' + newSeries.id)}
								<div class="relative opacity-80">
									<div
										class="badge badge-success absolute -top-2 left-2 z-50 font-semibold shadow-lg"
									>
										New
									</div>
									<SeriesCard series={newSeries} disableLink={true} />
									<button
										class="btn btn-sm btn-circle btn-error absolute -top-2 -right-2 z-50 shadow-lg"
										onclick={() => seriesToAdd.delete(newSeries)}
									>
										<X class="size-4" />
									</button>
								</div>
							{/each}

							<button
								class="border-base-300 bg-base-200/50 text-base-content/50 hover:border-primary hover:text-primary hover:bg-base-200 rounded-box flex aspect-[2.1/3] w-full flex-col items-center justify-center gap-2 border-2 border-dashed transition-colors"
								onclick={() => mapModal?.showModal(getBestSearchTitle())}
							>
								<Plus class="size-12" />
								<span class="font-semibold">Add Series</span>
							</button>
						{/if}
					</div>
				</section>
			{/if}

			<!-- Books Section -->
			<section>
				<div
					class="mb-6 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left"
				>
					<h2 class="text-2xl font-bold">Books & Volumes</h2>

					<div class="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-end">
						{#if isMerged && Object.keys(mergedSeriesData).length > 1}
							<ProviderSelector
								providers={allProviders.providers.filter((p) =>
									Object.keys(mergedSeriesData).includes(p.id)
								)}
								bind:selected={activeProviders}
								bind:selectedLocales
								languages={availableLanguages}
								dropdownPosition="sm:dropdown-end dropdown-center"
							/>
						{/if}
					</div>
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
								<BookCard {book} blurMature={false} />
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

		<!-- Floating Action Bar -->
		<div
			class="pointer-events-none sticky bottom-4 left-0 z-50 flex w-full flex-row items-center justify-center gap-2 pt-4"
		>
			{#if isEditing}
				<button class="btn btn-lg btn-soft pointer-events-auto shadow-lg" onclick={cancelEdits}>
					<X class="size-6" />
					Cancel
				</button>
				<button
					class="btn btn-lg btn-primary pointer-events-auto shadow-lg"
					onclick={applyEdits}
					disabled={applyingEdits || (seriesToAdd.size === 0 && seriesToUnmap.size === 0)}
				>
					{#if applyingEdits}
						<span class="loading loading-spinner loading-sm"></span>
					{:else}
						<Check class="size-6" />
					{/if}
					Apply
				</button>
			{:else}
				{#if canEdit}
					<div class="dropdown dropdown-top pointer-events-auto">
						<div tabindex="0" role="button" class="btn btn-lg btn-circle btn-soft shadow-lg">
							<EllipsisVertical class="size-6" />
						</div>
						<ul
							tabindex="-1"
							class="dropdown-content menu rounded-box bg-base-100 z-50 mb-2 w-36 min-w-fit p-2 shadow-sm"
						>
							<li>
								<button onclick={() => (isEditing = true)}>
									{isMerged ? 'Edit Mapping' : 'Map Series'}
								</button>
							</li>
						</ul>
					</div>
				{/if}

				<a class="btn btn-lg btn-primary pointer-events-auto shadow-lg" href={openLink}>
					<Download class="size-6" />
					Download Covers
				</a>
			{/if}
		</div>
	</div>

	<SeriesMapModal
		bind:this={mapModal}
		{excludeIds}
		onAdd={(seriesArray) => {
			const currentPending = Array.from(seriesToAdd);
			seriesArray.forEach((s) => {
				const isDuplicate = currentPending.some(
					(existing) => existing.providerId === s.providerId && existing.id === s.id
				);
				if (!isDuplicate) {
					seriesToAdd.add(s);
					currentPending.push(s);
				}
			});
		}}
	/>
{/if}
