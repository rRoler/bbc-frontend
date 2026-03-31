<script lang="ts">
	import { Search, LayoutGrid, X, ExternalLink } from 'lucide-svelte';
	import BBC_API, { type BBCSeries } from '../lib/apis/bbc.ts';
	import WsrvApi from '../lib/apis/wsrv.ts';
	import { addAppError, appState } from '../lib/svelte/app.svelte.ts';
	import allProviders, { type Provider } from '../lib/svelte/providers.svelte.ts';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		addKeyHold,
		getSvelteSearchParam,
		hasSvelteSearchParam,
		setSvelteSearchParam,
	} from '../lib/utils.ts';
	import Image from './Image.svelte';
	import ProviderLabel from './ProviderLabel.svelte';
	import ProviderSelector, { PROVIDER_PARAM_KEY } from './ProviderSelector.svelte';
	import { searchSettings, autoMatchResultsSetting } from '../lib/svelte/settings.svelte.ts';
	import { onMount } from 'svelte';
	import { downloadLocation, searchLocation } from '../lib/locations.ts';
	import { areAdsDisabled, getRandomAd } from '../lib/ads.ts';

	let adsDisabled = $state(false);
	const bannerAd = getRandomAd('banner');

	const maxSelectedSeries = 10;
	const api = new BBC_API();
	const imageApi = new WsrvApi();

	let selectedProviders = $state<Provider[]>([]);
	let searching = $state<boolean>(false);
	let searchQuery = $state<string>('');
	let searchResults = $state<Record<string, BBCSeries[]>>({});
	let selectedSeries = $state<Record<string, BBCSeries[]>>({});
	let selectedSeriesCount = $derived(Object.values(selectedSeries).flat().length);
	let openLink = $derived.by(() => {
		const basePath = downloadLocation.path;
		const params = new SvelteURLSearchParams();

		Object.entries(selectedSeries).forEach(([providerId, series]) => {
			series.forEach((s) => params.append(`${s.type}(${providerId})`, s.id));
		});

		return `${basePath}?${params.toString()}`;
	});
	let resultAutoMatchEnabled = $state<boolean>(true);

	function updateLocationStorage() {
		if (searchLocation.storageKey)
			localStorage.setItem(searchLocation.storageKey, window.location.href);
	}

	async function toggleSeries(providerId: string, series: BBCSeries, force?: boolean) {
		selectedSeries[providerId] = selectedSeries[providerId] ?? [];
		const seriesIndex = selectedSeries[providerId].indexOf(series);

		if (seriesIndex === -1 && force !== false) {
			if (selectedSeriesCount < maxSelectedSeries) selectedSeries[providerId].push(series);
		} else if (force !== true) {
			selectedSeries[providerId].splice(seriesIndex, 1);
		}
	}

	async function handleSubmit() {
		if (searching) return;

		searching = true;

		try {
			const response = await api.search(searchQuery, selectedProviders);
			searchResults = response.data;
			updateLocationStorage();
		} catch (e) {
			addAppError(e);
		}

		searching = false;
	}

	function handleKeys(event: KeyboardEvent) {
		if (event.key === 'Enter') handleSubmit();
	}

	onMount(() => {
		appState.loading = true;

		adsDisabled = areAdsDisabled();

		if (!hasSvelteSearchParam(PROVIDER_PARAM_KEY)) {
			allProviders.load();
			selectedProviders = allProviders.enabled;
		}

		searchSettings.load();
		resultAutoMatchEnabled = autoMatchResultsSetting.value;

		const query = getSvelteSearchParam('q');
		if (query !== null) {
			searchQuery = query;
			handleSubmit();
		}

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
			<kbd class="kbd hidden sm:inline-flex">ctrl</kbd>
		</label>
	</div>

	{#if !adsDisabled}
		<div
			class="flex h-30 w-full items-center justify-center overflow-hidden py-4 sm:h-38 md:h-48 lg:h-58"
		>
			<a
				href={bannerAd.url}
				title="Click Me"
				target="_blank"
				class="relative h-full w-fit overflow-hidden rounded-sm"
			>
				<div class="badge badge-neutral badge-xs sm:badge-sm absolute top-2 right-2 shadow-sm">
					Ad
				</div>

				<Image src={bannerAd.image} alt="Advertisement" class="h-full w-fit" loading="lazy" />
			</a>
		</div>
	{/if}

	{#if searching}
		<div class="flex size-full items-center justify-center">
			<span class="loading loading-spinner loading-xl size-24"></span>
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

					{#if allSeries.length > 0}
						<div class="flex flex-row gap-2 overflow-x-auto p-1">
							{#each allSeries as series, index (index)}
								{@const isSelected = selectedSeries[provider.id]?.some((s) => s.id === series.id)}

								{#if !adsDisabled}
									{#if index === Math.floor(Math.random() * 3)}
										{@const coverAd = getRandomAd('cover')}

										<div
											class="card bg-base-100 content-visibility-auto focus-within:outline-primary relative w-26 shrink-0 shadow-sm focus-within:outline-1 sm:w-42"
										>
											<a
												href={coverAd.url}
												class="absolute top-0 left-0 size-full cursor-pointer"
												title="Click Me"
												target="_blank"
											></a>

											<div
												class="badge badge-neutral badge-xs sm:badge-sm absolute top-2 right-2 shadow-sm"
											>
												Ad
											</div>

											<figure class="h-full w-full">
												<Image
													src={coverAd.image}
													alt="Advertisement"
													class="h-fit w-fit"
													loading="lazy"
												/>
											</figure>
										</div>
									{/if}
								{/if}

								<div
									class="card bg-base-100 content-visibility-auto focus-within:outline-primary relative w-26 shrink-0 shadow-sm focus-within:outline-1 sm:w-42"
									class:bg-primary={isSelected}
									class:text-primary-content={isSelected}
									class:outline-primary={isSelected}
									class:outline-1={isSelected}
									class:hover:bg-base-300={!isSelected}
								>
									<button
										class="absolute top-0 left-0 size-full cursor-pointer"
										onclick={() => {
											if (resultAutoMatchEnabled) {
												const isSelectedTemp = isSelected;

												Object.entries(searchResults).forEach(([pId, seriesList]) => {
													const matchingSeries = seriesList.filter(
														(s) =>
															s.title.toLowerCase().trim() === series.title.toLowerCase().trim() &&
															s.type === series.type &&
															(s.bookType && series.bookType
																? s.bookType === series.bookType
																: true) &&
															(s.publicationType && series.publicationType
																? s.publicationType === series.publicationType
																: true)
													);
													matchingSeries.forEach((s) => toggleSeries(pId, s, !isSelectedTemp));
												});

												return;
											}

											toggleSeries(provider.id, series);
										}}
										aria-label="Select {series.title} series"
									></button>

									<div
										class="absolute top-0 right-0 flex w-fit max-w-full flex-row flex-wrap justify-end gap-0.5 p-0.5 sm:gap-1 sm:p-1"
									>
										{#if series.bookType === 'manga'}
											<div class="badge badge-primary badge-xs sm:badge-sm shadow-sm">Manga</div>
										{:else if series.bookType === 'novel'}
											<div class="badge badge-secondary badge-xs sm:badge-sm shadow-sm">Novel</div>
										{/if}

										{#if series.publicationType === 'digital'}
											<div class="badge badge-soft badge-primary badge-xs sm:badge-sm shadow-sm">
												Digital
											</div>
										{:else if series.publicationType === 'physical'}
											<div class="badge badge-soft badge-secondary badge-xs sm:badge-sm shadow-sm">
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

										<a
											tabindex="-1"
											href={series.url}
											class="btn btn-circle btn-neutral btn-xs sm:btn-sm shadow-sm"
											target="_blank"
										>
											<ExternalLink class="size-3 sm:size-4" />
										</a>
									</div>

									<figure class="h-36 overflow-hidden sm:h-58">
										<Image
											src={imageApi.getUrl(series.thumbnail, { width: 168 }).href}
											alt="{series.title} series thumbnail"
											class="w-full"
											loading="lazy"
										/>
									</figure>

									<div class="card-body items-center p-1 text-center">
										<div class="tooltip tooltip-top">
											<div class="tooltip-content max-w-full text-sm">
												{series.title}
											</div>
											<div class="card-title line-clamp-2 text-sm">
												<h3>{series.title}</h3>
											</div>
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
			<button onclick={() => (selectedSeries = {})} class="btn btn-lg btn-neutral shadow-lg">
				<X class="text-error size-6" />
				Clear
			</button>

			<div class="indicator">
				{#if selectedSeriesCount > 1}
					<span
						class="indicator-item badge badge-primary badge-soft font-semibold"
						class:!badge-error={selectedSeriesCount >= maxSelectedSeries}
					>
						{selectedSeriesCount}/{maxSelectedSeries}
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
