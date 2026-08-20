<script lang="ts">
	import { onMount } from 'svelte';
	import BBC_API, {
		type BBCBookDetail,
		type BBCSeriesDetail,
		type BBCSeriesMerged,
		type BBCListResponse,
	} from '../../lib/apis/bbc.ts';
	import SeriesCard from '../domain/SeriesCard.svelte';
	import BookCard from '../domain/BookCard.svelte';
	import GlobalSearchBox from '../domain/GlobalSearchBox.svelte';
	import { ChevronRight } from 'lucide-svelte';
	import { addAppError } from '../../lib/svelte/app.svelte.ts';
	import {
		discoveryBooksNewLocation,
		discoveryBooksReleasedLocation,
		discoverySearchLocation,
		discoverySeriesMergedLocation,
		discoverySeriesNewLocation,
	} from '../../lib/locations.ts';

	const api = new BBC_API();

	type SectionItem = BBCBookDetail | BBCSeriesDetail | BBCSeriesMerged;

	type DiscoverySection = {
		title: string;
		gradient: string;
		linkHref: string;
		linkColor: string;
		type: 'book' | 'series';
		loading: boolean;
		items: SectionItem[];
		fetch: () => Promise<BBCListResponse<SectionItem>>;
	};

	const sections = $state<DiscoverySection[]>([
		{
			title: discoveryBooksReleasedLocation.label,
			gradient: 'from-error to-primary',
			linkHref: discoveryBooksReleasedLocation.path,
			linkColor: 'link-error',
			type: 'book',
			loading: true,
			items: [],
			fetch: () => api.getDiscoveryBooksReleased(),
		},
		{
			title: discoverySeriesMergedLocation.label,
			gradient: 'from-accent to-info',
			linkHref: discoverySeriesMergedLocation.path,
			linkColor: 'link-accent',
			type: 'series',
			loading: true,
			items: [],
			fetch: () => api.getDiscoverySeriesMerged(),
		},
		{
			title: discoverySeriesNewLocation.label,
			gradient: 'from-secondary to-accent',
			linkHref: discoverySeriesNewLocation.path,
			linkColor: 'link-secondary',
			type: 'series',
			loading: true,
			items: [],
			fetch: () => api.getDiscoverySeriesNew(),
		},
		{
			title: discoveryBooksNewLocation.label,
			gradient: 'from-warning to-error',
			linkHref: discoveryBooksNewLocation.path,
			linkColor: 'link-warning',
			type: 'book',
			loading: true,
			items: [],
			fetch: () => api.getDiscoveryBooksNew(),
		},
	]);

	let searchQuery = $state('');

	onMount(() => {
		Promise.all(
			sections.map(async (section) => {
				try {
					section.items = (await section.fetch()).data;
				} catch (e: unknown) {
					addAppError(e);
				} finally {
					section.loading = false;
				}
			})
		);
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
		{#each sections as section (section.title)}
			{#if section.loading || section.items.length > 0}
				<section>
					<div class="relative mb-6 flex items-center justify-between gap-4">
						<a
							href={section.linkHref}
							class="absolute inset-0 sm:hidden"
							aria-hidden="true"
							tabindex="-1"
						></a>
						<h2
							class="{section.gradient} bg-linear-to-r bg-clip-text text-2xl font-bold text-transparent sm:text-3xl"
						>
							{section.title}
						</h2>
						<a
							href={section.linkHref}
							class="link {section.linkColor} link-hover relative font-semibold"
							aria-label="View all {section.title}"
						>
							<span class="hidden sm:inline">View all</span>
							<ChevronRight class="size-6 sm:hidden" />
						</a>
					</div>

					{#if section.loading}
						<div
							class="flex w-full snap-x snap-mandatory space-x-4 overflow-x-auto p-4 pb-6"
							aria-hidden="true"
						>
							{#each Array.from({ length: 6 }, () => 0) as _, skeletonIndex (skeletonIndex)}
								<div class="w-32 shrink-0 snap-start md:w-48 lg:w-56">
									<div class="flex flex-col gap-3">
										<div class="skeleton aspect-[2.1/3] w-full rounded-2xl"></div>
										<div class="skeleton h-4 w-4/5 rounded"></div>
										<div class="skeleton h-3 w-1/2 rounded"></div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="flex w-full snap-x snap-mandatory space-x-4 overflow-x-auto p-4 pb-6">
							{#each section.items as item (('providerId' in item ? item.providerId : 'merged') + '-' + item.id)}
								<div class="w-32 shrink-0 snap-start md:w-48 lg:w-56">
									{#if section.type === 'series'}
										<SeriesCard series={item as BBCSeriesDetail} />
									{:else}
										<BookCard book={item as BBCBookDetail} />
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</section>
			{/if}
		{/each}
	</div>
</div>
