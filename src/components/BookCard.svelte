<script lang="ts">
	import type { BBCBook, BBCBookDetail } from '../lib/apis/bbc.ts';
	import WsrvApi from '../lib/apis/wsrv.ts';
	import allProviders from '../lib/svelte/providers.svelte.ts';
	import Image from './Image.svelte';
	import ProviderLabel from './ProviderLabel.svelte';
	import Tooltip from './Tooltip.svelte';
	import { ExternalLink, Library } from 'lucide-svelte';
	import { downloadLocation, seriesLocation } from '../lib/locations.ts';
	import { getDisplayPrice } from '../lib/utils.ts';
	import { matureContentSetting } from '../lib/svelte/settings.svelte.ts';

	let {
		book,
		showProvider = true,
		showSeriesLink = false,
	}: {
		book: BBCBook | BBCBookDetail;
		showProvider?: boolean;
		showSeriesLink?: boolean;
	} = $props();

	const imageApi = new WsrvApi();

	const displayProvider = $derived(allProviders.providers.find((p) => p.id === book.providerId));
</script>

<div
	class="card bg-base-200 group hover:ring-primary relative h-full w-full overflow-hidden shadow-md transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-2"
>
	<a
		href={`${downloadLocation.path}?book(${displayProvider?.id || book.providerId})=${book.id}`}
		class="absolute inset-0 z-10"
	>
		<span class="sr-only">Download {book.title}</span>
	</a>

	<figure class="relative aspect-[2.1/3] w-full overflow-hidden">
		<Image
			src={imageApi.getUrl(book.cover, { width: 320, output: 'webp' }).href}
			alt="{book.title} cover"
			class="size-full object-cover transition-transform duration-300 group-hover:scale-105 {book.isMature &&
			matureContentSetting.value === 'blur'
				? 'blur-lg'
				: ''}"
		/>
		<div
			class="pointer-events-none absolute inset-x-0 top-2 z-20 flex items-start justify-between px-2"
		>
			<div class="flex flex-col items-start gap-1">
				{#if book.volume?.number}
					<div class="badge badge-accent badge-sm font-bold shadow-sm">
						{book.volume.type === 'chapter' ? 'Ch.' : 'Vol.'}
						{book.volume.number}
					</div>
				{/if}
				{#if book.price !== null && book.currency}
					{#if book.price === 0}
						<div
							class="badge badge-success badge-sm text-success-content border-none font-bold shadow-sm"
						>
							Free
						</div>
					{:else}
						<div class="badge badge-neutral badge-sm border-none font-bold opacity-90 shadow-sm">
							{getDisplayPrice(book.currency, book.price)}
						</div>
					{/if}
				{/if}
			</div>

			<div class="pointer-events-auto flex flex-row items-start gap-1">
				{#if showSeriesLink && book.seriesId}
					<Tooltip position="left" tip="Open Series">
						<a
							href={`${seriesLocation.path}?id=${book.providerId}/${book.seriesId}`}
							class="btn btn-circle btn-neutral btn-sm shadow-sm"
						>
							<Library class="size-4" />
						</a>
					</Tooltip>
				{/if}
				{#if book.url}
					<Tooltip position="left" tip="Open Webpage">
						<a
							href={book.url}
							target="_blank"
							rel="noreferrer"
							class="btn btn-circle btn-neutral btn-sm shadow-sm"
						>
							<ExternalLink class="size-4" />
						</a>
					</Tooltip>
				{/if}
			</div>
		</div>
	</figure>

	<div class="card-body items-center p-4">
		<h3 class="line-clamp-2 text-center text-sm leading-tight font-bold sm:text-base">
			{book.title}
		</h3>

		<div class="mt-auto flex flex-col items-center gap-2 pt-2">
			{#if showProvider && displayProvider}
				<ProviderLabel
					provider={displayProvider}
					iconClass="size-4"
					textClass="text-xs sm:text-sm"
				/>
			{/if}
		</div>
	</div>
</div>
