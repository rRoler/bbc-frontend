<script lang="ts">
	import { Search, LayoutGrid, X, ExternalLink, EllipsisVertical, Link2 } from 'lucide-svelte';
	import BBC_API, { type BBCSeries, type BBCSeriesSearchResult } from '../lib/apis/bbc.ts';
	import WsrvApi from '../lib/apis/wsrv.ts';
	import { addAppError, appState } from '../lib/svelte/app.svelte.ts';
	import allProviders, { type Provider } from '../lib/svelte/providers.svelte.ts';
	import { SvelteDate, SvelteSet, SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		addKeyHold,
		getLocaleName,
		getSvelteSearchParam,
		removeSvelteSearchParam,
		replaceTextVariables,
		setSvelteSearchParam,
	} from '../lib/utils.ts';
	import Image from './Image.svelte';
	import ProviderLabel from './ProviderLabel.svelte';
	import ProviderSelector from './ProviderSelector.svelte';
	import {
		autoMatchResultsSetting,
		searchCopyFormatSetting,
		textVariables,
		matureContentSetting,
		ALLOWED_EDIT_ROLES,
		matchFlagsFromLevel,
	} from '../lib/svelte/settings.svelte.ts';
	import type { AutoMatchLevel } from '../lib/svelte/settings.svelte.ts';
	import userState from '../lib/svelte/user.svelte.ts';
	import { onMount } from 'svelte';
	import { downloadLocation, searchLocation } from '../lib/locations.ts';
	import DynamicIcon from './DynamicIcon.svelte';
	import Tooltip from './Tooltip.svelte';
	import { MAX_SELECTED_SEARCH_RESULTS } from '../lib/constants.ts';

	const MAX_SEARCH_TIME = 10000;

	const api = new BBC_API();
	const imageApi = new WsrvApi();

	let selectedProviders = $state<Provider[]>([]);
	let loadingProviders = $state<SvelteSet<string>>();
	let searching = $state<boolean>(false);
	let searchQuery = $state<string>('');
	let searchResults = $state<Record<string, BBCSeriesSearchResult[]>>({});
	let selectedSeries = $state<Record<string, BBCSeriesSearchResult[]>>({});
	let selectedSeriesCount = $derived(Object.values(selectedSeries).flat().length);
	let mbId = $state<string | null>();
	let openLink = $derived.by(() => {
		const basePath = downloadLocation.path;
		const params = new SvelteURLSearchParams();

		Object.entries(selectedSeries).forEach(([providerId, series]) => {
			series.forEach((s) => params.append(`${s.type}(${providerId})`, s.id));
		});

		if (mbId) {
			params.append('mb_id', mbId);
		}

		return `${basePath}?${params.toString()}`;
	});
	let resultAutoMatchEnabled = $state<boolean>(true);
	let resultAutoMatchLevel = $state<AutoMatchLevel>('full');
	let isAutoMapping = $state<boolean>(false);
	let linksCopied = $state<boolean | null>(null);
	let mappingStatus = $state<boolean | null>(null);
	let abortController = $state<AbortController>();

	function updateLocationStorage() {
		if (searchLocation.storageKey)
			localStorage.setItem(searchLocation.storageKey, window.location.href);
	}

	async function toggleSeries(providerId: string, series: BBCSeriesSearchResult, force?: boolean) {
		selectedSeries[providerId] = selectedSeries[providerId] ?? [];
		const seriesIndex = selectedSeries[providerId].indexOf(series);

		if (seriesIndex === -1 && force !== false) {
			if (selectedSeriesCount < MAX_SELECTED_SEARCH_RESULTS)
				selectedSeries[providerId].push(series);
		} else if (force !== true) {
			selectedSeries[providerId].splice(seriesIndex, 1);
		}
	}

	async function handleSeriesClick(
		provider: Provider,
		series: BBCSeriesSearchResult,
		isSelected: boolean
	) {
		const level = resultAutoMatchLevel;
		if (!resultAutoMatchEnabled || level === 'off') {
			await toggleSeries(provider.id, series);
			return;
		}

		const flags = matchFlagsFromLevel(level);
		let didMatch = false;
		const targetLanguage = series.language || provider.locale;

		if (flags.useMapped) {
			isAutoMapping = true;
			try {
				const mappedSeries = await api.getMappedSeries(provider.id, series.id);
				if (mappedSeries.data.length > 0) {
					for (const ms of mappedSeries.data) {
						const providerResults = searchResults[ms.providerId];
						if (!providerResults) continue;
						const match = providerResults.find((s) => s.id === ms.id);
						if (match) {
							const matchProvider = allProviders.updated.find((p) => p.id === ms.providerId);
							const matchLanguage = match.language || matchProvider?.locale;
							if (matchLanguage === targetLanguage) {
								didMatch = true;
								await toggleSeries(ms.providerId, match, !isSelected);
							}
						}
					}
				}
			} catch {
				/* no mapped series */
			} finally {
				isAutoMapping = false;
			}
		}

		if (flags.matchTitle) {
			const titleLower = series.title.toLowerCase().trim();
			const hasNullCriterion =
				(flags.matchType && series.type == null) ||
				(flags.matchBookType && series.bookType == null) ||
				(flags.matchPub && series.publicationType == null);

			if (!hasNullCriterion) {
				Object.entries(searchResults).forEach(([pId, seriesList]) => {
					const matchingSeries = seriesList.filter((s) => {
						const sProvider = allProviders.updated.find((p) => p.id === pId);
						const sLanguage = s.language || sProvider?.locale;
						return (
							s.title.toLowerCase().trim() === titleLower &&
							sLanguage === targetLanguage &&
							(flags.matchType ? s.type === series.type : true) &&
							(flags.matchBookType ? s.bookType === series.bookType : true) &&
							(flags.matchPub ? s.publicationType === series.publicationType : true)
						);
					});
					if (matchingSeries.length > 0) didMatch = true;
					matchingSeries.forEach((s) => toggleSeries(pId, s, !isSelected));
				});
			}
		}

		if (!didMatch) {
			await toggleSeries(provider.id, series);
		}
	}

	async function handleSubmit() {
		searching = true;
		let timer;

		if (abortController) abortController.abort();
		const currentAbortController = new AbortController();
		abortController = currentAbortController;

		try {
			loadingProviders = new SvelteSet(selectedProviders.map((p) => p.id));
			timer = setTimeout(() => {
				if (!currentAbortController.signal.aborted) searching = false;
			}, MAX_SEARCH_TIME);
			await api.search(searchQuery, selectedProviders, {
				include_mature: matureContentSetting.value !== 'hide',
				abortSignal: currentAbortController.signal,
				callback: (response) => {
					response.errors.forEach((e) => addAppError(e));
					searchResults = response.data;
					for (let searchResultsKey in searchResults) {
						loadingProviders?.delete(searchResultsKey);
						if (searchResultsKey === 'mb') {
							const mbSeries = searchResults[searchResultsKey].find((r) => r.id === mbId);
							if (mbSeries) {
								const isSelected = selectedSeries['mb']?.some((s) => s.id === mbSeries.id);
								if (!isSelected) toggleSeries('mb', mbSeries, true);
							}
						}
					}
					updateLocationStorage();
				},
			});
		} catch (e) {
			if ((e as Error | undefined)?.name !== 'AbortError') addAppError(e);
		}

		if (timer) clearTimeout(timer);
		if (!currentAbortController.signal.aborted) searching = false;
	}

	function handleKeys(event: KeyboardEvent) {
		if (event.key === 'Enter') handleSubmit();
	}

	function parseTextVariables(series: Partial<BBCSeries>, { providerId }: { providerId?: string }) {
		const vars: [string, string][] = [];
		const provider = allProviders.updated.find((p) => p.id === providerId);
		const currentDate = new SvelteDate();
		const date = currentDate.toISOString().split('T')[0];
		const time = currentDate.toISOString().split('T')[1].split('.')[0].replaceAll(':', '-');
		const datetime = `${date}_${time}`;

		vars.push([textVariables.date, date]);
		vars.push([textVariables.time, time]);
		vars.push([textVariables.datetime, datetime]);

		vars.push([textVariables.seriesTitle, series.title ?? '']);
		vars.push([textVariables.seriesThumbnailUrl, series.thumbnail ?? '']);
		vars.push([textVariables.seriesPublicationType, series.publicationType || 'digital']);
		vars.push([textVariables.seriesBookType, series.bookType || '']);
		vars.push([textVariables.seriesType, series.type ?? '']);
		vars.push([textVariables.seriesUrl, series.url ?? '']);
		vars.push([textVariables.seriesId, series.id ?? '']);
		vars.push([textVariables.seriesDescription, series.description ?? '']);
		vars.push([textVariables.seriesAuthors, series.authors?.join(', ') ?? '']);
		vars.push([textVariables.seriesArtists, series.artists?.join(', ') ?? '']);
		vars.push([textVariables.seriesPublisher, series.publisher ?? '']);
		vars.push([textVariables.seriesTags, series.tags?.join(', ') ?? '']);
		vars.push([textVariables.seriesStatus, series.status ?? '']);
		vars.push([textVariables.seriesRating, series.rating?.toString() ?? '']);
		vars.push([textVariables.seriesRatingCount, series.ratingCount?.toString() ?? '']);
		vars.push([textVariables.seriesLanguageCode, series.language ?? '']);
		vars.push([textVariables.seriesLanguageName, getLocaleName(series.language ?? '')]);
		vars.push([textVariables.seriesTranslator, series.translator?.join(', ') ?? '']);
		vars.push([textVariables.seriesFormat, series.format ?? '']);
		vars.push([textVariables.seriesReadingDirection, series.readingDirection ?? '']);
		vars.push([textVariables.seriesBookCount, series.bookCount?.toString() ?? '']);
		vars.push([textVariables.seriesChapterCount, series.chapterCount?.toString() ?? '']);
		vars.push([textVariables.seriesMagazine, series.magazine ?? '']);
		vars.push([textVariables.seriesGenre, series.genre ?? '']);
		vars.push([textVariables.seriesAltTitles, series.altTitles?.join(', ') ?? '']);
		vars.push([textVariables.seriesAlId, series.alId ?? '']);
		vars.push([textVariables.seriesApId, series.apId ?? '']);
		vars.push([textVariables.seriesMuId, series.muId ?? '']);
		vars.push([textVariables.seriesNuId, series.nuId ?? '']);
		vars.push([textVariables.seriesKtId, series.ktId ?? '']);
		vars.push([textVariables.seriesMalId, series.malId ?? '']);
		vars.push([textVariables.seriesMbId, series.mbId ?? '']);
		vars.push([textVariables.seriesShikiId, series.shikiId ?? '']);
		vars.push([textVariables.seriesLastUpdated, series.lastUpdated ?? '']);

		if (provider) {
			vars.push([textVariables.providerName, provider.name]);
			vars.push([textVariables.providerId, provider.id]);
			vars.push([textVariables.providerLanguageName, getLocaleName(provider.locale)]);
			vars.push([textVariables.providerLanguageCode, provider.locale]);
		}

		return replaceTextVariables(searchCopyFormatSetting.value, vars);
	}

	async function copySelectedLinksToClipboard(): Promise<void> {
		let text = '';

		for (const [providerId, series] of Object.entries(selectedSeries)) {
			for (const s of series) {
				text += parseTextVariables(s, { providerId });
			}
		}

		await navigator.clipboard.writeText(text).then(
			() => {
				console.debug('Copied links to clipboard');
				linksCopied = true;
			},
			() => {
				addAppError(new Error('Failed to copy links to clipboard'));
				linksCopied = false;
			}
		);
	}

	async function saveSeriesMapping(): Promise<void> {
		const series: { providerId: string; id: string }[] = [];

		for (const [providerId, seriesList] of Object.entries(selectedSeries)) {
			for (const s of seriesList) {
				series.push({ providerId, id: s.id });
			}
		}

		if (series.length < 2) return;

		const result = await api.mapSeries(series);

		if (result.errors.length > 0) {
			result.errors.forEach((e) => addAppError(e));
			mappingStatus = false;
		} else {
			mappingStatus = true;
		}
	}

	onMount(() => {
		appState.loading = true;

		if (selectedProviders.length === 0) {
			selectedProviders = allProviders.enabled;
		}

		resultAutoMatchLevel = autoMatchResultsSetting.value;

		const query = getSvelteSearchParam('q');
		if (query !== null) {
			searchQuery = query;
			handleSubmit();
		}

		mbId = getSvelteSearchParam('mb_id');
		removeSvelteSearchParam('mb_id');

		appState.loading = false;
	});

	$effect(() => {
		setSvelteSearchParam('q', searchQuery);
		updateLocationStorage();
	});

	$effect(() => {
		const keyToggleAutoMatchOptions = {
			onStart: () => {
				resultAutoMatchEnabled = !resultAutoMatchEnabled;
			},
			onEnd: () => {
				resultAutoMatchEnabled = !resultAutoMatchEnabled;
			},
			interval: 'once' as const,
		};
		const removeShortcuts = [
			addKeyHold(['ControlLeft'], keyToggleAutoMatchOptions),
			addKeyHold(['ControlRight'], keyToggleAutoMatchOptions),
		];

		return () => removeShortcuts.forEach((rm) => rm());
	});
</script>

<div class="relative flex h-full w-full flex-col items-center lg:w-5/6">
	<label class="input input-xl input-primary w-full shrink-0">
		<input
			bind:value={searchQuery}
			onkeydown={handleKeys}
			type="search"
			required
			placeholder="Search"
		/>
		<button onclick={handleSubmit} class="btn btn-circle btn-ghost">
			<Search class="size-6" />
		</button>
	</label>

	<div class="flex w-fit flex-col items-center justify-start gap-4 pt-4 sm:w-full sm:flex-row">
		<ProviderSelector
			providers={allProviders.sorted}
			bind:selected={selectedProviders}
			onchange={handleSubmit}
		/>

		<label class="label text-base-content">
			<input
				bind:checked={resultAutoMatchEnabled}
				type="checkbox"
				class="checkbox checkbox-primary"
			/>
			<span>Automatically match results</span>
			{#if isAutoMapping}
				<span class="loading loading-spinner loading-xs"></span>
			{/if}
			<kbd class="kbd hidden sm:inline-flex">ctrl (hold)</kbd>
		</label>
	</div>

	{#if searching}
		<div class="flex size-full flex-col items-center justify-center gap-4 p-4">
			<span class="loading loading-spinner loading-xl size-24"></span>
			<p class="text-xl font-semibold">Searching...</p>
		</div>
	{:else if Object.keys(searchResults).length > 0}
		<div class="flex size-full flex-col items-baseline pt-8">
			{#each selectedProviders as provider (provider.id)}
				{@const allSeries = searchResults[provider.id] ?? []}

				<div class="content-visibility-auto w-full text-left">
					<ProviderLabel
						{provider}
						class="pb-4"
						textClass="text-2xl font-bold"
						iconClass="size-6"
					/>

					{#if loadingProviders?.has(provider.id)}
						<div class="flex flex-col items-center justify-center gap-2 p-4">
							<span class="loading loading-spinner loading-xl size-12"></span>
							<p class="font-semibold">Searching provider...</p>
						</div>
					{:else if allSeries.length > 0}
						<div class="flex flex-row gap-2 overflow-x-auto p-1">
							{#each allSeries as series, index (index)}
								{@const isSelected = selectedSeries[provider.id]?.some((s) => s.id === series.id)}

								<div
									class="card bg-base-100 content-visibility-auto focus-within:outline-primary relative w-26 shrink-0 shadow-sm focus-within:outline-1 sm:w-42"
									class:bg-primary={isSelected}
									class:text-primary-content={isSelected}
									class:outline-primary={isSelected}
									class:outline-1={isSelected}
									class:hover:bg-base-300={!isSelected}
								>
									<button
										class="absolute top-0 left-0 z-10 size-full cursor-pointer"
										onclick={() => handleSeriesClick(provider, series, isSelected)}
										aria-label="Select {series.title} series"
									></button>

									<div class="relative h-36 overflow-hidden sm:h-58">
										<div
											class="absolute top-0 right-0 m-0.5 flex w-fit max-w-full flex-row flex-wrap justify-end gap-0.5 sm:m-1 sm:gap-1"
										>
											{#if series.bookType === 'manga'}
												<div class="badge badge-primary badge-xs sm:badge-sm shadow-sm">Manga</div>
											{:else if series.bookType === 'novel'}
												<div class="badge badge-secondary badge-xs sm:badge-sm shadow-sm">
													Novel
												</div>
											{:else if series.bookType === 'webtoon'}
												<div class="badge badge-accent badge-xs sm:badge-sm shadow-sm">Webtoon</div>
											{:else if series.bookType === 'audiobook'}
												<div class="badge badge-neutral badge-xs sm:badge-sm shadow-sm">
													Audiobook
												</div>
											{/if}

											{#if series.publicationType === 'digital'}
												<div class="badge badge-soft badge-primary badge-xs sm:badge-sm shadow-sm">
													Digital
												</div>
											{:else if series.publicationType === 'physical'}
												<div
													class="badge badge-soft badge-secondary badge-xs sm:badge-sm shadow-sm"
												>
													Physical
												</div>
											{/if}

											{#if series.type === 'series'}
												<div class="badge badge-success badge-soft badge-xs sm:badge-sm shadow-sm">
													Series
												</div>
											{:else if series.type === 'book'}
												<div class="badge badge-warning badge-soft badge-xs sm:badge-sm shadow-sm">
													Book
												</div>
											{/if}

											<Tooltip class="z-20" position="top" tip="Open Series Page">
												<a
													tabindex="-1"
													href={series.url}
													class="btn btn-circle btn-neutral btn-xs sm:btn-sm shadow-sm"
													target="_blank"
												>
													<ExternalLink class="size-3 sm:size-4" />
												</a>
											</Tooltip>
										</div>

										<figure class="z-0 size-full">
											<Image
												src={series.thumbnail
													? imageApi.getUrl(series.thumbnail, { width: 168 }).href
													: ''}
												alt="{series.title} series thumbnail"
												class="w-full {series.isMature &&
												matureContentSetting.value === 'blur' &&
												!isSelected
													? 'blur-lg'
													: ''}"
												loading="lazy"
											/>
										</figure>
									</div>

									<div class="card-body items-center p-1 text-center">
										<div class="card-title z-20 line-clamp-2 text-sm">
											<Tooltip position="bottom" tip={series.title}>
												<h3>{series.title}</h3>
											</Tooltip>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="w-full text-center text-lg">No results found from this provider</p>
					{/if}

					<div class="divider"></div>
				</div>
			{/each}
		</div>
	{/if}

	{#if selectedSeriesCount > 0}
		<div class="grow"></div>
		<div class="sticky bottom-4 left-0 flex w-full flex-row items-center justify-center gap-2 pt-4">
			<div class="dropdown dropdown-top">
				<div tabindex="0" role="button" class="btn btn-lg btn-circle btn-soft">
					<EllipsisVertical class="size-6" />
				</div>

				<ul
					tabindex="-1"
					class="dropdown-content menu bg-base-100 rounded-box z-1 w-36 min-w-fit p-2 shadow-sm"
				>
					<li>
						<button onclick={() => copySelectedLinksToClipboard()}>
							<DynamicIcon bind:value={linksCopied} class="size-4" />
							Copy Links
						</button>
					</li>

					{#if userState.session && ALLOWED_EDIT_ROLES.includes(userState.session.role)}
						<li>
							<button onclick={() => saveSeriesMapping()} disabled={selectedSeriesCount < 2}>
								<DynamicIcon icon={Link2} bind:value={mappingStatus} class="size-4" />
								Map Series
							</button>
						</li>
					{/if}
				</ul>
			</div>

			<button onclick={() => (selectedSeries = {})} class="btn btn-lg btn-neutral shadow-lg">
				<X class="text-error size-6" />
				Clear
			</button>

			<div class="indicator">
				{#if selectedSeriesCount > 1}
					<span
						class="indicator-item badge badge-primary badge-soft font-semibold"
						class:!badge-error={selectedSeriesCount >= MAX_SELECTED_SEARCH_RESULTS}
					>
						{selectedSeriesCount}/{MAX_SELECTED_SEARCH_RESULTS}
					</span>
				{/if}
				<div>
					<a class="btn btn-lg btn-primary shadow-lg" href={openLink}>
						<LayoutGrid class="size-6" />
						Open
					</a>
				</div>
			</div>
		</div>
	{/if}
</div>
