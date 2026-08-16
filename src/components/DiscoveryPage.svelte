<script lang="ts">
	import { onMount } from 'svelte';
	import BBC_API, { type BBCSeriesDetail, type BBCBookDetail } from '../lib/apis/bbc.ts';
	import SeriesCard from './SeriesCard.svelte';
	import BookCard from './BookCard.svelte';
	import GlobalSearchBox from './GlobalSearchBox.svelte';
	import { appState, addAppError } from '../lib/svelte/app.svelte.ts';
	import {
		discoveryBooksNewLocation,
		discoveryBooksReleasedLocation,
		discoverySearchLocation,
		discoverySeriesMergedLocation,
		discoverySeriesNewLocation,
	} from '../lib/locations.ts';

	const api = new BBC_API();

	let data = $state<{
		newlyAddedBooks: BBCBookDetail[];
		newlyAddedSeries: BBCSeriesDetail[];
		newlyMergedSeries: BBCSeriesDetail[];
		recentlyReleasedBooks: BBCBookDetail[];
	} | null>(null);

	const sections = $derived(
		data
			? [
					{
						title: discoveryBooksReleasedLocation.label,
						gradient: 'from-error to-primary',
						linkHref: discoveryBooksReleasedLocation.path,
						linkColor: 'link-error',
						items: data.recentlyReleasedBooks,
						type: 'book',
					},
					{
						title: discoverySeriesMergedLocation.label,
						gradient: 'from-accent to-info',
						linkHref: discoverySeriesMergedLocation.path,
						linkColor: 'link-accent',
						items: data.newlyMergedSeries,
						type: 'series',
					},
					{
						title: discoverySeriesNewLocation.label,
						gradient: 'from-secondary to-accent',
						linkHref: discoverySeriesNewLocation.path,
						linkColor: 'link-secondary',
						items: data.newlyAddedSeries,
						type: 'series',
					},
					{
						title: discoveryBooksNewLocation.label,
						gradient: 'from-warning to-error',
						linkHref: discoveryBooksNewLocation.path,
						linkColor: 'link-warning',
						items: data.newlyAddedBooks,
						type: 'book',
					},
				].filter((s) => s.items.length > 0)
			: []
	);

	let searchQuery = $state('');

	onMount(async () => {
		appState.loading = true;
		try {
			data = await api.getDiscovery();
		} catch (e: unknown) {
			addAppError(e);
		} finally {
			appState.loading = false;
		}
	});
</script>

<div class="flex w-full grow flex-col">
	<!-- Hero Section with Search -->
	<div class="hero bg-base-200 px-4 py-16">
		<div class="hero-content w-full max-w-3xl flex-col text-center">
			<h1
				class="from-primary to-secondary mb-4 bg-linear-to-r bg-clip-text text-5xl font-bold text-transparent"
			>
				Discover New Content
			</h1>
			<p class="mb-4 py-4 text-lg opacity-80">
				Explore recently added books, series, and curated collections across all supported
				providers.
			</p>
			<GlobalSearchBox
				class="mx-auto w-full max-w-2xl"
				size="xl"
				bind:value={searchQuery}
				searchPath={discoverySearchLocation.path}
				placeholder="Search series in database..."
			/>
		</div>
	</div>

	<!-- Content Sections -->
	<div class="container mx-auto flex flex-col gap-12 px-4 py-12">
		{#if data}
			{#if sections.length > 0}
				{#each sections as section (section.title)}
					<section>
						<div class="mb-6 flex items-end justify-between">
							<h2
								class="{section.gradient} bg-linear-to-r bg-clip-text text-3xl font-bold text-transparent"
							>
								{section.title}
							</h2>
							<a href={section.linkHref} class="link {section.linkColor} link-hover font-semibold"
								>View all</a
							>
						</div>
						<div class="flex w-full snap-x snap-mandatory space-x-4 overflow-x-auto p-4 pb-6">
							{#each section.items as item (item.providerId + '-' + item.id)}
								<div class="w-32 shrink-0 snap-start md:w-48 lg:w-56">
									{#if section.type === 'series'}
										<SeriesCard series={item as import('../lib/apis/bbc.ts').BBCSeriesDetail} />
									{:else}
										<BookCard
											book={item as import('../lib/apis/bbc.ts').BBCBookDetail}
											showSeriesLink={true}
										/>
									{/if}
								</div>
							{/each}
						</div>
					</section>
				{/each}
			{/if}
		{/if}
	</div>
</div>
