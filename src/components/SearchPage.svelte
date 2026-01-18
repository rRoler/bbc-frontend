<script lang="ts">
	import { Search, LayoutGrid, X } from 'lucide-svelte';
	import BBC_API, { type BBCSeries } from '../lib/apis/bbc.ts';
	import WsrvApi from '../lib/apis/wsrv.ts';
	import { addAppError, appState } from '../lib/svelte/app.svelte.ts';
	import { type Provider } from '../lib/apis/providers.ts';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		getSvelteSearchParam,
		hasSvelteSearchParam,
		setSvelteSearchParam,
	} from '../lib/utils.ts';
	import ProviderLabel from './ProviderLabel.svelte';
	import ProviderSelector from './ProviderSelector.svelte';
	import {
		defaultSearchProvidersSetting,
		searchSettings,
		autoMatchResultsSetting,
	} from '../lib/svelte/settings.svelte.ts';
	import { onMount } from 'svelte';
	import { downloadLocation, searchLocation } from '../lib/locations.ts';

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

		searchSettings.load();

		if (!hasSvelteSearchParam('provider'))
			selectedProviders = [...defaultSearchProvidersSetting.value];

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
		if (searchLocation.storageKey)
			localStorage.setItem(searchLocation.storageKey, window.location.href);
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
		<ProviderSelector bind:selected={selectedProviders} onchange={handleSubmit} />

		<label class="label text-base-content">
			<input
				bind:checked={resultAutoMatchEnabled}
				type="checkbox"
				class="checkbox checkbox-primary"
			/>
			Automatically match results
		</label>
	</div>

	{#if searching}
		<div class="flex size-full items-center justify-center">
			<span class="loading loading-spinner loading-xl size-24"></span>
		</div>
	{:else if Object.keys(searchResults).length > 0}
		<div class="flex size-full flex-col items-baseline pt-8">
			{#each selectedProviders as provider (provider.id)}
				{@const allSeries = searchResults[provider.id] ?? []}

				<div class="w-full text-left">
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

								<div
									class="card bg-base-100 relative w-24 shrink-0 shadow-sm sm:w-42"
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
															s.title.toLowerCase().trim() === series.title.toLowerCase().trim()
													);
													matchingSeries.forEach((s) => toggleSeries(pId, s, !isSelectedTemp));
												});

												return;
											}

											toggleSeries(provider.id, series);
										}}
										aria-label="Select {series.title} series"
									></button>

									{#if series.bookType === 'manga'}
										<div
											class="badge badge-primary badge-xs sm:badge-sm absolute top-1 right-1 shadow-sm"
										>
											Manga
										</div>
									{:else if series.bookType === 'novel'}
										<div
											class="badge badge-secondary badge-xs sm:badge-sm absolute top-1 right-1 shadow-sm"
										>
											Novel
										</div>
									{/if}

									<figure class="h-32 overflow-hidden sm:h-56">
										<img
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
												<h2>{series.title}</h2>
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
