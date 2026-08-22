<script lang="ts">
	import type { BBCBook, BBCBookDetail } from '../../lib/apis/bbc.ts';
	import WsrvApi from '../../lib/apis/wsrv.ts';
	import allProviders from '../../lib/svelte/providers.svelte.ts';
	import Image from '../ui/Image.svelte';
	import ProviderLabel from './ProviderLabel.svelte';
	import Tooltip from '../ui/Tooltip.svelte';
	import { ExternalLink, Library } from 'lucide-svelte';
	import { downloadLocation, seriesLocation } from '../../lib/locations.ts';
	import { getDisplayPrice, formatDate } from '../../lib/utils.ts';
	import { matureContentSetting } from '../../lib/svelte/settings.svelte.ts';

	let {
		book,
		showProvider = true,
		selected = false,
		blurMature = true,
	}: {
		book: BBCBook | BBCBookDetail;
		showProvider?: boolean;
		selected?: boolean;
		blurMature?: boolean;
	} = $props();

	const imageApi = new WsrvApi();

	const displayProvider = $derived(allProviders.providers.find((p) => p.id === book.providerId));
</script>

<div
	class="card group content-visibility-auto @container relative h-full w-full overflow-hidden shadow-md transition-all hover:-translate-y-1 hover:shadow-xl"
	class:bg-base-200={!selected}
	class:hover:ring-primary={!selected}
	class:hover:ring-2={!selected}
	class:bg-primary={selected}
	class:text-primary-content={selected}
	class:ring-2={selected}
	class:ring-primary={selected}
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
			matureContentSetting.value === 'blur' &&
			blurMature
				? 'blur-lg'
				: ''}"
		/>
		<div
			class="pointer-events-none absolute inset-x-0 top-2 z-20 flex items-start justify-between px-2"
		>
			<div class="flex flex-col items-start gap-1">
				{#if book.isMature}
					<div class="badge badge-error badge-xs @card:badge-sm font-bold shadow-sm">18+</div>
				{/if}
				{#if book.bookType === 'manga'}
					<div class="badge badge-primary badge-xs @card:badge-sm shadow-sm">Manga</div>
				{:else if book.bookType === 'novel'}
					<div class="badge badge-secondary badge-xs @card:badge-sm shadow-sm">Novel</div>
				{:else if book.bookType === 'webtoon'}
					<div class="badge badge-accent badge-xs @card:badge-sm shadow-sm">Webtoon</div>
				{:else if book.bookType === 'audiobook'}
					<div class="badge badge-neutral badge-xs @card:badge-sm shadow-sm">Audiobook</div>
				{:else if book.bookType}
					<div class="badge badge-secondary badge-xs @card:badge-sm capitalize shadow-sm">
						{book.bookType}
					</div>
				{/if}

				{#if book.publicationType === 'digital'}
					<div class="badge badge-soft badge-primary badge-xs @card:badge-sm shadow-sm">
						Digital
					</div>
				{:else if book.publicationType === 'physical'}
					<div class="badge badge-soft badge-secondary badge-xs @card:badge-sm shadow-sm">
						Physical
					</div>
				{/if}
			</div>

			<div class="pointer-events-auto flex flex-row items-start gap-1">
				{#if book.seriesId}
					<Tooltip position="left" tip="Open Series">
						<a
							href={`${seriesLocation.path}?id=${book.providerId}/${book.seriesId}`}
							class="btn btn-circle btn-neutral btn-xs @card:btn-sm shadow-sm"
						>
							<Library class="@card:size-4 size-3" />
						</a>
					</Tooltip>
				{/if}
				{#if book.url}
					<Tooltip position="left" tip="Open Webpage">
						<a
							href={book.url}
							target="_blank"
							rel="noreferrer"
							class="btn btn-circle btn-neutral btn-xs @card:btn-sm shadow-sm"
						>
							<ExternalLink class="@card:size-4 size-3" />
						</a>
					</Tooltip>
				{/if}
			</div>
		</div>

		<div
			class="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex items-end justify-between px-2"
		>
			<div class="flex flex-col items-start gap-1">
				{#if book.volume?.number}
					<div class="badge badge-accent badge-xs @card:badge-sm font-bold shadow-sm">
						{book.volume.type === 'chapter' ? 'Ch.' : 'Vol.'}
						{book.volume.number}
					</div>
				{/if}
			</div>

			<div class="flex flex-col items-end gap-1">
				{#if book.price !== null && book.currency}
					{#if book.price === 0}
						<div
							class="badge badge-success badge-xs text-success-content @card:badge-sm border-none font-bold shadow-sm"
						>
							Free
						</div>
					{:else}
						<div
							class="badge badge-neutral badge-xs @card:badge-sm border-none font-bold opacity-90 shadow-sm"
						>
							{getDisplayPrice(book.currency, book.price)}
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</figure>

	<div class="card-body items-center p-4">
		<h3 class="line-clamp-2 text-center text-sm leading-tight font-bold sm:text-base">
			{book.title}
		</h3>

		{#if book.releaseDate}
			<p class="text-base-content/70 text-xs font-semibold">{formatDate(book.releaseDate)}</p>
		{/if}

		<div class="mt-auto flex flex-col items-center gap-2 pt-2">
			{#if showProvider && displayProvider}
				<ProviderLabel
					provider={displayProvider}
					iconClass="size-4 @card:size-5"
					textClass="text-xs sm:text-sm"
				/>
			{/if}
		</div>
	</div>
</div>
