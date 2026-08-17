<script lang="ts">
	import { onMount } from 'svelte';
	import BBC_API, {
		type BBCSeriesDetail,
		type BBCSeriesMerged,
		type BBCListResponse,
	} from '../../lib/apis/bbc.ts';
	import SeriesCard from '../domain/SeriesCard.svelte';
	import { Search } from 'lucide-svelte';
	import { matureContentSetting } from '../../lib/svelte/settings.svelte.ts';
	import { getSvelteSearchParam, setSvelteSearchParam } from '../../lib/utils.ts';
	import { addAppError } from '../../lib/svelte/app.svelte.ts';
	import MainSearchBox from '../domain/MainSearchBox.svelte';

	const api = new BBC_API();

	let data = $state<BBCListResponse<BBCSeriesDetail | BBCSeriesMerged> | null>(null);
	let searchQuery = $state('');
	let searching = $state(false);

	const emptyMessages = [
		"Truck-kun couldn't find your series.",
		'Error 404: Waifu not found.',
		'The gacha gods have abandoned you. No results.',
		'Senpai did not notice your search terms.',
		"Even the Sage of Six Paths doesn't know what you're searching for.",
		'It seems your search power level is under 9000.',
		"You've reached the end of the internet. Turn back.",
		"I scoured the dark web and still couldn't find this series.",
		'Domain Expansion: Infinite Emptiness.',
		'Skill Issue: Could not find results.',
	];
	let currentEmptyMessage = $state('Try adjusting your search terms.');

	onMount(async () => {
		const q = getSvelteSearchParam('q');
		if (q !== null) {
			searchQuery = q;
			await performSearch();
		}
	});

	async function performSearch() {
		if (!searchQuery.trim()) {
			data = null;
			return;
		}

		searching = true;
		setSvelteSearchParam('q', searchQuery);

		try {
			data = await api.searchMergedSeries(searchQuery, matureContentSetting.value !== 'hide');
			if (data && data.data.length === 0) {
				currentEmptyMessage = emptyMessages[Math.floor(Math.random() * emptyMessages.length)];
			}
		} catch (e: unknown) {
			addAppError(e);
		} finally {
			searching = false;
		}
	}

	function handleSearch() {
		performSearch();
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 flex flex-col gap-6 md:flex-row md:items-center">
		<MainSearchBox
			bind:value={searchQuery}
			onsubmit={handleSearch}
			placeholder="Search series in database..."
		/>
	</div>

	{#if searching}
		<div class="text-primary flex size-full flex-col items-center justify-center gap-4 p-4 py-20">
			<span class="loading loading-spinner size-24"></span>
			<p class="text-base-content text-xl font-semibold">Searching...</p>
		</div>
	{:else if data && data.data.length > 0}
		<div class="mb-4 text-sm opacity-70">
			Found {data.count} result{data.count === 1 ? '' : 's'}
			{data.count === 100 ? '(Limit reached)' : ''}
		</div>
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
			{#each data.data as series (('providerId' in series ? series.providerId : 'merged') + '-' + series.id)}
				<SeriesCard {series} />
			{/each}
		</div>
	{:else if searchQuery && !searching}
		<div class="flex flex-col items-center justify-center py-20 text-center opacity-70">
			<Search class="mb-4 size-16 opacity-30" />
			<h3 class="text-2xl font-bold">No results found</h3>
			<p class="mt-2">{currentEmptyMessage}</p>
		</div>
	{/if}
</div>
