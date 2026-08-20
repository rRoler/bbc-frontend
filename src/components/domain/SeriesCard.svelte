<script lang="ts">
	import type {
		BBCSeries,
		BBCSeriesDetail,
		BBCSeriesMerged,
		BBCSeriesSearchResult,
	} from '../../lib/apis/bbc.ts';
	import { seriesLocation } from '../../lib/locations.ts';
	import allProviders from '../../lib/svelte/providers.svelte.ts';
	import WsrvApi from '../../lib/apis/wsrv.ts';
	import Image from '../ui/Image.svelte';
	import ProviderLabel from './ProviderLabel.svelte';
	import Tooltip from '../ui/Tooltip.svelte';
	import { ExternalLink } from 'lucide-svelte';
	import { matureContentSetting } from '../../lib/svelte/settings.svelte.ts';

	let {
		series,
		href,
		showProvider = true,
		disableLink = false,
		selected = false,
	}: {
		series: BBCSeries | BBCSeriesDetail | BBCSeriesMerged | BBCSeriesSearchResult;
		href?: string;
		showProvider?: boolean;
		disableLink?: boolean;
		selected?: boolean;
	} = $props();

	const imageApi = new WsrvApi();
	const mergedProviderIds = $derived('providers' in series ? series.providers || [] : []);
	const isSingleMerged = $derived(mergedProviderIds.length === 1);

	const linkHref = $derived(
		href
			? href
			: 'mappedId' in series && series.mappedId
				? `${seriesLocation.path}?id=${series.mappedId}`
				: `${seriesLocation.path}?id=${'providerId' in series ? series.providerId : 'merged'}/${series.id}`
	);

	const cardTitle = $derived.by(() => {
		if ('titles' in series && series.titles && series.titles.length > 0) {
			const cjkRegex = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\uFAFF]/;
			const cjkTitle = series.titles.find((t) => cjkRegex.test(t.title));
			if (cjkTitle) return cjkTitle.title;
			return series.titles[0].title;
		}
		if ('title' in series) {
			return series.title;
		}
		return 'Unknown Title';
	});
</script>

<div
	class="card group content-visibility-auto relative h-full w-full overflow-hidden shadow-md transition-all hover:-translate-y-1 hover:shadow-xl"
	class:bg-base-200={!selected}
	class:hover:ring-primary={!selected}
	class:hover:ring-2={!selected}
	class:bg-primary={selected}
	class:text-primary-content={selected}
	class:ring-2={selected}
	class:ring-primary={selected}
>
	{#if !disableLink}
		<a href={linkHref} class="absolute inset-0 z-10">
			<span class="sr-only">View {cardTitle}</span>
		</a>
	{/if}

	<figure class="relative aspect-[2.1/3] w-full overflow-hidden">
		{#if series.thumbnail}
			<Image
				src={imageApi.getUrl(series.thumbnail, { width: 320, output: 'webp' }).href}
				alt="{cardTitle} cover"
				class="size-full object-cover transition-transform duration-300 group-hover:scale-105 {series.isMature &&
				matureContentSetting.value === 'blur'
					? 'blur-lg'
					: ''}"
			/>
		{:else}
			<div class="bg-base-300 flex h-full w-full items-center justify-center">
				<span class="text-base-content/50">No Cover</span>
			</div>
		{/if}

		<div
			class="pointer-events-none absolute inset-x-0 top-2 z-20 flex items-start justify-between px-2"
		>
			<div class="flex flex-col items-start gap-1">
				{#if series.isMature}
					<div class="badge badge-error badge-xs sm:badge-sm font-bold shadow-sm">18+</div>
				{/if}
				{#if series.bookType === 'manga'}
					<div class="badge badge-primary badge-xs sm:badge-sm shadow-sm">Manga</div>
				{:else if series.bookType === 'novel'}
					<div class="badge badge-secondary badge-xs sm:badge-sm shadow-sm">Novel</div>
				{:else if series.bookType === 'webtoon'}
					<div class="badge badge-accent badge-xs sm:badge-sm shadow-sm">Webtoon</div>
				{:else if series.bookType === 'audiobook'}
					<div class="badge badge-neutral badge-xs sm:badge-sm shadow-sm">Audiobook</div>
				{:else if series.bookType}
					<div class="badge badge-secondary badge-xs sm:badge-sm capitalize shadow-sm">
						{series.bookType}
					</div>
				{/if}

				{#if 'publicationType' in series}
					{#if series.publicationType === 'digital'}
						<div class="badge badge-soft badge-primary badge-xs sm:badge-sm shadow-sm">Digital</div>
					{:else if series.publicationType === 'physical'}
						<div class="badge badge-soft badge-secondary badge-xs sm:badge-sm shadow-sm">
							Physical
						</div>
					{/if}
				{/if}

				{#if 'type' in series}
					{#if series.type === 'series'}
						<div class="badge badge-success badge-soft badge-xs sm:badge-sm shadow-sm">Series</div>
					{:else if series.type === 'book'}
						<div class="badge badge-warning badge-soft badge-xs sm:badge-sm shadow-sm">Book</div>
					{/if}
				{/if}
			</div>

			<div class="pointer-events-auto flex flex-col items-end gap-1">
				{#if series.url}
					<Tooltip position="left" tip="Open Webpage">
						<a
							href={series.url}
							target="_blank"
							rel="noreferrer"
							class="btn btn-circle btn-neutral btn-xs sm:btn-sm shadow-sm"
						>
							<ExternalLink class="size-3 sm:size-4" />
						</a>
					</Tooltip>
				{/if}
			</div>
		</div>
	</figure>

	<div class="card-body items-center p-4">
		<h3
			class="line-clamp-2 text-center text-sm leading-tight font-bold sm:text-base"
			title={cardTitle}
		>
			{cardTitle}
		</h3>

		<div class="mt-auto flex flex-col items-center gap-2 pt-2">
			{#if mergedProviderIds.length > 0}
				<div class="flex flex-wrap items-center justify-center gap-4">
					{#each mergedProviderIds as pId (pId)}
						{@const mp = allProviders.providers.find((p) => p.id === pId)}
						{#if mp}
							<ProviderLabel
								provider={mp}
								iconClass={isSingleMerged ? 'size-4' : 'size-5'}
								textClass={isSingleMerged ? 'text-xs sm:text-sm' : undefined}
								showText={isSingleMerged}
							/>
						{/if}
					{/each}
				</div>
			{:else if showProvider && 'providerId' in series && series.providerId}
				{@const p = allProviders.providers.find((p) => p.id === series.providerId)}
				{#if p}
					<ProviderLabel provider={p} iconClass="size-4" textClass="text-xs sm:text-sm" />
				{/if}
			{/if}
		</div>
	</div>
</div>
