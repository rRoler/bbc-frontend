<script lang="ts">
	import BBC_API, {
		type BBCSeriesDetail,
		type BBCSeriesMerged,
		type BBCBookDetail,
		type BBCListResponse,
	} from '../../lib/apis/bbc.ts';
	import SeriesCard from '../domain/SeriesCard.svelte';
	import BookCard from '../domain/BookCard.svelte';
	import Pagination from '../ui/Pagination.svelte';
	import { addAppError } from '../../lib/svelte/app.svelte.ts';

	let {
		type,
		title,
		gradient,
	}: {
		type: 'series-merged' | 'series-new' | 'books-new' | 'books-released';
		title: string;
		gradient: string;
	} = $props();

	const api = new BBC_API();
	let currentPage = $state<number>(1);
	let data = $state<BBCListResponse<BBCSeriesDetail | BBCSeriesMerged | BBCBookDetail> | null>(
		null
	);
	let loading = $state<boolean>(true);

	const books = $derived(
		(type === 'books-new' || type === 'books-released') && data
			? (data.data as BBCBookDetail[])
			: []
	);
	const seriesList = $derived(
		type !== 'books-new' && type !== 'books-released' && data
			? (data.data as (BBCSeriesDetail | BBCSeriesMerged)[])
			: []
	);

	async function fetchData(pageNum: number) {
		loading = true;
		try {
			switch (type) {
				case 'series-merged':
					data = await api.getDiscoverySeriesMerged(pageNum);
					break;
				case 'series-new':
					data = await api.getDiscoverySeriesNew(pageNum);
					break;
				case 'books-new':
					data = await api.getDiscoveryBooksNew(pageNum);
					break;
				case 'books-released':
					data = await api.getDiscoveryBooksReleased(pageNum);
					break;
			}
		} catch (e: unknown) {
			addAppError(e);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		const pageParam = new URL(window.location.href).searchParams.get('page');
		const newPage = pageParam ? parseInt(pageParam, 10) : 1;
		if (newPage !== currentPage || !data) {
			currentPage = newPage;
			fetchData(currentPage);
		}
	});

	function handlePageChange(newPage: number) {
		const url = new URL(window.location.href);
		url.searchParams.set('page', newPage.toString());
		window.history.pushState({}, '', url);
		currentPage = newPage;
		fetchData(currentPage);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<div class="flex w-full grow flex-col">
	<div class="hero bg-base-200 px-4 py-12">
		<div class="hero-content text-center">
			<h1
				class="bg-linear-to-r text-4xl font-bold md:text-5xl {gradient} bg-clip-text pb-2 text-transparent"
			>
				{title}
			</h1>
		</div>
	</div>

	<div class="container mx-auto flex flex-col gap-8 px-4 py-12">
		{#if loading}
			<div class="flex justify-center p-12">
				<span class="loading loading-spinner loading-lg text-primary"></span>
			</div>
		{:else if data && data.data.length > 0}
			<div class="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
				{#if type === 'books-new' || type === 'books-released'}
					{#each books as item (item.providerId + '-' + item.id)}
						<BookCard book={item} />
					{/each}
				{:else}
					{#each seriesList as item (('providerId' in item ? item.providerId : 'merged') + '-' + item.id)}
						<SeriesCard series={item} />
					{/each}
				{/if}
			</div>

			<div class="mt-8 flex justify-center">
				<Pagination page={currentPage} maxPage={data.pages || 1} onchange={handlePageChange} />
			</div>
		{:else}
			<div class="py-12 text-center opacity-50">No results found.</div>
		{/if}
	</div>
</div>
