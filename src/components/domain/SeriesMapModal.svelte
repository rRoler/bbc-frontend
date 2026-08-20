<script lang="ts">
	import { X } from 'lucide-svelte';
	import MainSearchBox from './MainSearchBox.svelte';
	import SeriesCard from './SeriesCard.svelte';
	import ProviderSelector from './ProviderSelector.svelte';
	import BBC_API, { type BBCSeriesSearchResult } from '../../lib/apis/bbc.ts';
	import allProviders, { type Provider } from '../../lib/svelte/providers.svelte.ts';
	import { matureContentSetting } from '../../lib/svelte/settings.svelte.ts';
	import { addAppError } from '../../lib/svelte/app.svelte.ts';
	import { SvelteSet } from 'svelte/reactivity';

	let {
		onAdd,
		excludeIds = new SvelteSet<string>(),
	}: {
		onAdd: (seriesList: BBCSeriesSearchResult[]) => void;
		excludeIds?: SvelteSet<string>;
	} = $props();

	let dialogEl = $state<HTMLDialogElement>();
	let searchQuery = $state('');
	let searching = $state(false);

	let selectedProviders = $state<Provider[]>([]);
	let searchResults = $state<Record<string, BBCSeriesSearchResult[]>>({});
	// eslint-disable-next-line svelte/no-unnecessary-state-wrap
	let loadingProviders = $state<SvelteSet<string>>(new SvelteSet());
	let abortController = $state<AbortController>();

	// Tracking multi-selection
	// eslint-disable-next-line svelte/no-unnecessary-state-wrap
	let selectedSeries = $state<SvelteSet<string>>(new SvelteSet());

	function seriesKey(series: BBCSeriesSearchResult) {
		return series.providerId + '::' + series.id;
	}

	const api = new BBC_API();
	const MAX_SEARCH_TIME = 10000;

	export function showModal(initialQuery = '') {
		searchQuery = initialQuery;
		searchResults = {};
		selectedSeries.clear();
		if (selectedProviders.length === 0) {
			selectedProviders = allProviders.enabled;
		}
		dialogEl?.showModal();

		if (searchQuery) {
			performSearch();
		}
	}

	export function close() {
		if (abortController) abortController.abort();
		dialogEl?.close();
	}

	function toggleSelection(series: BBCSeriesSearchResult) {
		const key = seriesKey(series);
		if (selectedSeries.has(key)) {
			selectedSeries.delete(key);
		} else {
			selectedSeries.add(key);
		}
	}

	let selectedResults = $derived.by(() =>
		flattenedResults.filter((s) => selectedSeries.has(seriesKey(s)))
	);

	function handleAdd() {
		onAdd(selectedResults);
		close();
	}

	async function performSearch() {
		if (!searchQuery.trim()) return;
		searching = true;
		searchResults = {};

		if (abortController) abortController.abort();
		const currentAbortController = new AbortController();
		abortController = currentAbortController;

		try {
			loadingProviders = new SvelteSet(selectedProviders.map((p) => p.id));

			setTimeout(() => {
				if (!currentAbortController.signal.aborted) searching = false;
			}, MAX_SEARCH_TIME);

			await api.search(searchQuery, selectedProviders, {
				include_mature: matureContentSetting.value !== 'hide',
				abortSignal: currentAbortController.signal,
				callback: (response) => {
					response.errors.forEach((e) => addAppError(e));
					searchResults = response.data;
					for (const key in searchResults) {
						loadingProviders?.delete(key);
					}
				},
			});
		} catch (e) {
			if ((e as Error | undefined)?.name !== 'AbortError') addAppError(e);
		} finally {
			if (!currentAbortController.signal.aborted) searching = false;
		}
	}

	let flattenedResults = $derived.by(() => {
		const results: BBCSeriesSearchResult[] = [];
		const providerQueues = selectedProviders
			.map((p) => searchResults[p.id]?.filter((s) => !excludeIds.has(s.providerId + '::' + s.id)))
			.filter((arr) => arr && arr.length > 0);

		if (providerQueues.length === 0) return results;

		const maxLength = Math.max(...providerQueues.map((arr) => arr.length));
		for (let i = 0; i < maxLength; i++) {
			for (const queue of providerQueues) {
				if (i < queue.length) {
					results.push(queue[i]);
				}
			}
		}
		return results;
	});
</script>

<dialog bind:this={dialogEl} class="modal modal-bottom sm:modal-middle">
	<div
		class="modal-box flex h-full max-h-full w-full max-w-5xl flex-col sm:h-[80vh] sm:max-h-[90vh]"
	>
		<form method="dialog">
			<button class="btn btn-sm btn-circle btn-ghost absolute top-6 right-6" onclick={close}>
				<X class="size-5" />
			</button>
		</form>

		<h3 class="mb-4 text-lg font-bold">Add Series to Mapping</h3>

		<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
			<MainSearchBox
				bind:value={searchQuery}
				onsubmit={performSearch}
				placeholder="Search providers..."
				class="flex-1"
			/>
			<ProviderSelector
				providers={allProviders.sorted}
				bind:selected={selectedProviders}
				paramsEnabled={false}
				class="mx-auto max-w-full sm:mx-0 sm:max-w-64 md:max-w-xs"
				onchange={() => {
					if (searchQuery) performSearch();
				}}
			/>
		</div>

		<div class="mt-4 flex-1 overflow-y-auto">
			{#if searching && flattenedResults.length === 0}
				<div class="flex h-full items-center justify-center">
					<span class="loading loading-spinner loading-lg text-primary"></span>
				</div>
			{:else if flattenedResults.length > 0 || searching}
				<div class="px-1 pt-4 pb-8">
					{#if flattenedResults.length > 0}
						<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
							{#each flattenedResults as series (series.providerId + '-' + series.id)}
								<button
									class="relative h-full w-full text-left"
									onclick={() => toggleSelection(series)}
								>
									<SeriesCard
										{series}
										disableLink={true}
										showProvider={true}
										selected={selectedSeries.has(seriesKey(series))}
									/>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{:else if searchQuery && !searching && flattenedResults.length === 0}
				<div class="flex h-full items-center justify-center opacity-70">No results found.</div>
			{/if}
		</div>

		<div
			class="border-base-200 mt-4 flex flex-col justify-between gap-4 border-t pt-4 sm:flex-row sm:items-center"
		>
			<div
				class="flex min-h-6 w-full items-center justify-center gap-2 opacity-70 sm:w-auto sm:justify-start"
			>
				{#if loadingProviders.size > 0}
					<span class="loading loading-spinner loading-sm"></span>
					<span class="text-sm">Searching remaining providers...</span>
				{/if}
			</div>

			<div class="flex w-full items-center justify-end gap-2 sm:w-auto">
				<button class="btn btn-ghost" onclick={close}>Cancel</button>
				<button class="btn btn-primary" disabled={selectedSeries.size === 0} onclick={handleAdd}>
					Add {selectedSeries.size > 0 ? selectedSeries.size : ''} Series
				</button>
			</div>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={close}>close</button>
	</form>
</dialog>
