<script lang="ts">
	import type { BBCSeries, BBCSeriesDetail, BBCSeriesSearchResult } from '../../lib/apis/bbc.ts';
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
	}: {
		series: BBCSeries | BBCSeriesDetail | BBCSeriesSearchResult;
		href?: string;
		showProvider?: boolean;
	} = $props();

	const imageApi = new WsrvApi();
	const mergedProviderIds = $derived(
		'mergedProviders' in series ? series.mergedProviders || [] : []
	);
	const isSingleMerged = $derived(mergedProviderIds.length === 1);

	const linkHref = $derived(
		href
			? href
			: 'mappedId' in series && series.mappedId
				? `${seriesLocation.path}?id=${series.mappedId}`
				: `${seriesLocation.path}?id=${series.providerId || 'unknown'}/${series.id}`
	);
</script>

<div
	class="card bg-base-200 group hover:ring-primary relative h-full w-full overflow-hidden shadow-md transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-2"
>
	<a href={linkHref} class="absolute inset-0 z-10">
		<span class="sr-only">View {series.title}</span>
	</a>

	<figure class="relative aspect-[2.1/3] w-full overflow-hidden">
		{#if series.thumbnail}
			<Image
				src={imageApi.getUrl(series.thumbnail, { width: 320, output: 'webp' }).href}
				alt="{series.title} cover"
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
					<div class="badge badge-error badge-sm font-bold shadow-sm">18+</div>
				{/if}
				{#if series.bookType}
					<div class="badge badge-secondary badge-sm capitalize shadow-sm">{series.bookType}</div>
				{/if}
			</div>

			<div class="pointer-events-auto flex flex-col items-end gap-1">
				{#if series.url}
					<Tooltip position="left" tip="Open Webpage">
						<a
							href={series.url}
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
		<h3
			class="line-clamp-2 text-center text-sm leading-tight font-bold sm:text-base"
			title={series.title}
		>
			{series.title}
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
			{:else if showProvider && series.providerId}
				{@const p = allProviders.providers.find((p) => p.id === series.providerId)}
				{#if p}
					<ProviderLabel provider={p} iconClass="size-4" textClass="text-xs sm:text-sm" />
				{/if}
			{/if}
		</div>
	</div>
</div>
