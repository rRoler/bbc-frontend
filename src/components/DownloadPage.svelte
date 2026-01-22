<script lang="ts">
	import { appState } from '../lib/svelte/app.svelte.ts';
	import {
		ChevronDown,
		ChevronUp,
		Crop,
		Download,
		EllipsisVertical,
		Expand,
		Shrink,
		SquareCheckBig,
		SquareDashed,
		SquareSplitHorizontal,
		SquareSplitVertical,
		Star,
	} from 'lucide-svelte';
	import {
		addKeyboardShortcut,
		getSvelteSearchParam,
		setSvelteSearchParam,
		unfocusAndExecute,
	} from '../lib/utils.ts';
	import { ImageViewer } from 'svelte-image-viewer';
	import ProviderLabel from './ProviderLabel.svelte';
	import ProviderSelector from './ProviderSelector.svelte';
	import {
		automaticQualityPickerSetting,
		bookSortOrderSetting,
		downloadSettings,
	} from '../lib/svelte/settings.svelte.ts';
	import CopyIcon from './CopyIcon.svelte';
	import { onMount } from 'svelte';
	import Downloader from '../lib/svelte/downloader.svelte.ts';
	import { downloadLocation } from '../lib/locations.ts';

	const downloader = new Downloader();

	let scrollPosition = $state<number>(0);

	function updateLocationStorage() {
		if (downloadLocation.storageKey)
			localStorage.setItem(downloadLocation.storageKey, window.location.href);
	}

	function setErrorImage(event: Event) {
		const target = event.target as HTMLImageElement;
		target.src = '/images/error.svg';
	}

	onMount(async () => {
		appState.loading = true;

		downloadSettings.load();

		const automaticQualityParam = getSvelteSearchParam('automatic');
		if (automaticQualityParam)
			downloader.automaticCoverQualityEnabled = automaticQualityParam === 'true';
		else downloader.automaticCoverQualityEnabled = automaticQualityPickerSetting.value;

		const sortOrderParam = getSvelteSearchParam('sort');
		if (sortOrderParam) downloader.sortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc';
		else downloader.sortOrder = bookSortOrderSetting.value;

		downloader.page = parseInt(getSvelteSearchParam('page') || '1');
		downloader.incrementPages = getSvelteSearchParam('increment') === 'true';
		downloader.selectedBookPage = parseInt(getSvelteSearchParam('bookPage') || '0');

		await downloader.initialize();

		appState.loading = false;
	});

	$effect(() => {
		const removeShortcuts = [
			addKeyboardShortcut(['ShiftLeft', 'KeyA'], downloader.toggleAllBooks),
			addKeyboardShortcut(['ShiftRight', 'KeyA'], downloader.toggleAllBooks),
		];

		return () => {
			removeShortcuts.forEach((remove) => remove());
		};
	});

	$effect(() => {
		const handleScroll = () => {
			if (appState.loading || downloader.isDownloading) return;
			scrollPosition = window.scrollY;
		};

		window.addEventListener('scroll', handleScroll);

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});

	$effect(() => {
		if (!appState.loading && !downloader.isDownloading && scrollPosition > 0) {
			requestAnimationFrame(() => {
				window.scrollTo(0, scrollPosition);
			});
		}
	});

	$effect(() => {
		setSvelteSearchParam('automatic', downloader.automaticCoverQualityEnabled.toString());
		setSvelteSearchParam('sort', downloader.sortOrder);
		setSvelteSearchParam('page', downloader.page.toString());
		setSvelteSearchParam('increment', downloader.incrementPages.toString());
		setSvelteSearchParam('bookPage', downloader.selectedBookPage.toString());
		updateLocationStorage();
	});
</script>

{#if downloader.openedImages.length > 0}
	<div>
		<button
			onclick={() => downloader.closeOpenedImages()}
			class="btn btn-circle btn-neutral fixed top-4 right-4 z-30"
		>
			<Shrink class="size-6" />
		</button>

		{#each downloader.openedImages as image, index (index)}
			{@const imagePercentageSum =
				index === 0
					? 0
					: downloader.openedImages.slice(0, index).reduce((acc, img) => acc + img.percentage, 0)}
			{@const leftOffset = imagePercentageSum}
			{@const topOffset = imagePercentageSum}

			<div
				class="bg-base-100 opened-image-panel fixed z-20 h-full select-none"
				style="
          --img-percentage: {image.percentage}%;
          --left-offset: {leftOffset}%;
          --top-offset: {topOffset}%;
          width: var(--img-percentage);
          height: 100%;
          left: var(--left-offset);
          top: 0;
        "
			>
				<ImageViewer
					alt="Cover image for {image.provider.name} - {image.name}"
					src={image.url}
					smoothing={downloader.openedImageData.smoothing}
					bind:targetOffsetX={downloader.openedImageData.targetOffsetX}
					bind:targetOffsetY={downloader.openedImageData.targetOffsetY}
					bind:targetScale={downloader.openedImageData.targetScale}
					bind:minScale={downloader.openedImageData.minScale}
					bind:maxScale={downloader.openedImageData.maxScale}
				/>

				<div class="absolute bottom-2 left-2 lg:bottom-4 lg:left-4">
					<ProviderLabel
						provider={image.provider}
						class="bg-neutral/80 line-clamp-1 w-fit rounded-md p-0.5 text-xs lg:p-1 lg:text-sm"
					/>
				</div>
			</div>
		{/each}
	</div>
{/if}

{#if downloader.isDownloading}
	<div class="flex size-full items-center justify-center">
		<div
			class="radial-progress text-primary-content border-primary from-accent via-primary to-secondary border-4 bg-linear-to-br text-center text-xl font-bold"
			style="--value:{downloader.downloadProgressPercentage}; --size:12rem; --thickness: 1rem;"
			aria-valuenow={downloader.downloadProgressPercentage}
			role="progressbar"
		>
			<p class="text-xl">Downloading</p>
			<p class="text-2xl">{downloader.downloadProgressPercentage}%</p>
		</div>
	</div>
{:else}
	<div class="relative flex size-full flex-col items-center">
		<div
			class="bg-base-200 flex w-full max-w-full flex-col items-center justify-start gap-4 p-4 sm:flex-row"
		>
			{#if downloader.providers.length > 1}
				<ProviderSelector
					providers={downloader.providers}
					bind:selected={downloader.selectedProviders}
					onchange={async () => {
						await downloader.resetAll();
						updateLocationStorage();
					}}
				/>
			{/if}

			{#if downloader.canChangeBookPage}
				<select
					bind:value={downloader.selectedBookPage}
					onchange={() => downloader.resetAll()}
					class="select select-primary w-fit min-w-32"
				>
					{#each downloader.maxBookPageArray as p (p)}
						<option value={p}>Preview Page {p}</option>
					{/each}
				</select>
			{/if}

			{#if downloader.sortedFilteredBooks.length > 0}
				<label class="label text-base-content">
					<input
						bind:checked={downloader.automaticCoverQualityEnabled}
						onchange={() => (downloader.selectedBooks = [])}
						type="checkbox"
						class="checkbox checkbox-primary"
					/>
					Automatically choose best quality
				</label>
			{/if}
		</div>

		{#if downloader.sortedFilteredBooks.length > 0}
			<div class="flex flex-row flex-wrap justify-center gap-4">
				{#each downloader.sortedFilteredBooks as book, index (index)}
					{@const isSelected = downloader.selectedBooks.some(
						(b) => b.id === book.id && b.provider.id === book.provider.id
					)}

					<div
						class="card bg-base-100 group relative w-36 shrink-0 shadow-sm sm:w-42"
						class:bg-primary={isSelected}
						class:text-primary-content={isSelected}
						class:outline-primary={isSelected}
						class:outline-1={isSelected}
						class:hover:bg-base-300={!isSelected}
						title={book.displayText}
					>
						<button
							onclick={(e) => downloader.shiftSelect(e, book)}
							class="absolute top-0 left-0 size-full cursor-pointer"
							aria-label="Select {book.title} book"
						></button>

						<div
							class="absolute top-7 right-0 flex flex-row gap-1 p-1 opacity-80 group-hover:opacity-100 group-focus:opacity-100 sm:opacity-0"
						>
							<button
								onclick={() => downloader.openCoverImages([book])}
								class="btn btn-circle btn-neutral btn-sm shadow-sm"
							>
								<Expand class="size-3" />
							</button>

							<button
								onclick={() => downloader.copyCoverLink(book)}
								class="btn btn-circle btn-neutral btn-sm shadow-sm"
							>
								<CopyIcon
									bind:value={
										() => downloader.copyValues.get(`book-${book.provider.id}-${book.id}`) || null,
										(v) =>
											downloader.copyValues.set(`book-${book.provider.id}-${book.id}`, v || null)
									}
									class="size-3"
								/>
							</button>
						</div>

						<div class="flex flex-row justify-between px-2 py-1">
							<div class="tooltip tooltip-top" data-tip="Quality Score">
								<div class="flex flex-row items-center gap-0.5 text-sm font-semibold">
									{#if book.coverQualityScore}
										{book.coverQualityScore}
										<Star class="size-3 fill-current" />
									{/if}
								</div>
							</div>

							<div
								class="tooltip tooltip-top"
								data-tip={book.coverIsCropped ? 'Cropped Dimensions' : 'Dimensions'}
							>
								<div class="flex flex-row items-center gap-0.5 text-sm font-semibold">
									{#if book.coverIsCropped}
										<Crop class="size-3.5" />
									{/if}

									{#if book.coverHeight && book.coverWidth}
										{book.coverWidth}x{book.coverHeight}
									{/if}
								</div>
							</div>
						</div>

						<figure class="h-50 overflow-hidden sm:h-58">
							<img
								src={book.thumbnail}
								alt="{book.title} book cover"
								class="w-full"
								loading="lazy"
								onerror={setErrorImage}
							/>
						</figure>

						<div class="card-body items-center justify-between gap-1 p-1 text-center">
							<div class="card-title line-clamp-2 grow text-sm">
								<h2>{book.displayText}</h2>
							</div>

							<ProviderLabel
								provider={book.provider}
								class="grow-0"
								textClass={isSelected ? 'text-primary-content!' : ''}
							/>
						</div>
					</div>
				{/each}
			</div>

			{#if downloader.isFetching}
				<div class="p-4">
					<span class="loading loading-dots loading-xl w-12"></span>
				</div>
			{:else if downloader.isNextPage}
				<button
					onclick={() => downloader.incrementPage()}
					class="btn btn-secondary btn-dash btn-lg mt-4"
				>
					Load More
				</button>
			{/if}

			{#if downloader.maxPage > 1}
				<div class="join p-4">
					{#each downloader.allPages as p, i (i)}
						<button
							onclick={() => downloader.changePage(p)}
							class="join-item btn {p === downloader.page ? 'btn-primary' : 'btn-soft'}"
						>
							{p}
						</button>
					{/each}
				</div>
			{/if}

			<div class="grow"></div>
			<div
				class="sticky bottom-4 left-0 flex w-full flex-row items-center justify-center gap-2 pt-4 sm:gap-4"
			>
				<div class="dropdown dropdown-top xl:hidden">
					<div tabindex="0" role="button" class="btn btn-lg btn-circle btn-soft xl:hidden">
						<EllipsisVertical class="size-6" />
					</div>

					<ul
						tabindex="-1"
						class="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm"
					>
						<li>
							<button
								onclick={() => unfocusAndExecute(() => downloader.toggleSortOrder())}
								class="disabled:opacity-50 xl:hidden"
							>
								{#if downloader.sortOrder === 'asc'}
									<ChevronUp class="size-4" />
									Ascending
								{:else}
									<ChevronDown class="size-4" />
									Descending
								{/if}
							</button>
						</li>

						<li>
							<button
								onclick={() => unfocusAndExecute(() => downloader.toggleAllBooks())}
								class="disabled:opacity-50 lg:hidden"
							>
								{#if downloader.isAllSelected}
									<SquareCheckBig class="size-4" />
									Deselect All
								{:else}
									<SquareDashed class="size-4" />
									Select All
								{/if}
							</button>
						</li>

						{#if downloader.croppingAvailable}
							<li>
								<button
									onclick={() =>
										unfocusAndExecute(() =>
											downloader.toggleCropCovers(downloader.selectedBooks, downloader.shouldCrop)
										)}
									class="disabled:opacity-50 md:hidden"
									disabled={!downloader.isSomeSelected}
								>
									<Crop class="size-4" />
									{#if downloader.shouldCrop}
										Crop
									{:else}
										Uncrop
									{/if}
								</button>
							</li>
						{/if}

						<li>
							<button
								onclick={() => unfocusAndExecute(() => downloader.openSelectedCovers())}
								class="disabled:opacity-50 sm:hidden"
								disabled={!downloader.isSomeSelected}
							>
								{#if downloader.selectedBooksToCompare.length > 1}
									<SquareSplitVertical class="size-4" />
									Compare ({downloader.selectedBooksToCompare.length}/{downloader.maxCompareBooks})
								{:else}
									<Expand class="size-4" />
									Open
								{/if}
							</button>
						</li>

						<li>
							<button
								onclick={() => unfocusAndExecute(() => downloader.copySelectedLinks())}
								class="disabled:opacity-50 sm:hidden"
								disabled={!downloader.isSomeSelected}
							>
								<CopyIcon
									bind:value={
										() => downloader.copyValues.get('selected-links') || null,
										(v) => downloader.copyValues.set('selected-links', v || null)
									}
									class="size-4"
								/>
								Copy Links
							</button>
						</li>
					</ul>
				</div>

				<button
					onclick={() => downloader.toggleSortOrder()}
					class="btn btn-lg btn-soft hidden w-44 shadow-lg xl:inline-flex"
				>
					{#if downloader.sortOrder === 'asc'}
						<ChevronUp class="size-6" />
						<span class="w-full">Ascending</span>
					{:else}
						<ChevronDown class="size-6" />
						<span class="w-full">Descending</span>
					{/if}
				</button>

				<button
					onclick={() => downloader.toggleAllBooks()}
					class="btn btn-lg btn-soft hidden w-44 shadow-lg lg:inline-flex"
				>
					{#if downloader.isAllSelected}
						<SquareCheckBig class="text-primary size-6" />
						<span class="w-full">Deselect All</span>
					{:else}
						<SquareDashed class="size-6" />
						<span class="w-full">Select All</span>
					{/if}
				</button>

				{#if downloader.croppingAvailable}
					<button
						onclick={() =>
							downloader.toggleCropCovers(downloader.selectedBooks, downloader.shouldCrop)}
						class="btn btn-lg btn-soft hidden w-36 shadow-lg md:inline-flex"
						disabled={!downloader.selectedCanBeCropped}
					>
						<Crop class="size-6" />
						{#if downloader.shouldCrop}
							<span class="w-full">Crop</span>
						{:else}
							<span class="w-full">Uncrop</span>
						{/if}
					</button>
				{/if}

				<div class="indicator hidden sm:inline-flex">
					{#if downloader.selectedBooksToCompare.length > 1}
						<span
							class="indicator-item badge badge-soft badge-sm font-semibold"
							class:badge-warning={downloader.selectedBooksToCompare.length >=
								downloader.maxCompareBooks}
						>
							{downloader.selectedBooksToCompare.length}/{downloader.maxCompareBooks}
						</span>
					{/if}
					<div>
						<button
							onclick={() => downloader.openSelectedCovers()}
							class="btn btn-lg btn-soft w-36 shadow-lg"
							disabled={!downloader.isSomeSelected}
						>
							{#if downloader.selectedBooksToCompare.length > 1}
								<SquareSplitHorizontal class="size-6" />
								Compare
							{:else}
								<Expand class="size-6" />
								Open
							{/if}
						</button>
					</div>
				</div>

				<button
					onclick={() => downloader.copySelectedLinks()}
					class="btn btn-lg btn-soft hidden shadow-lg sm:inline-flex"
					disabled={!downloader.isSomeSelected}
				>
					<CopyIcon
						bind:value={
							() => downloader.copyValues.get('selected-links') || null,
							(v) => downloader.copyValues.set('selected-links', v || null)
						}
						class="size-6"
					/>
					Copy Links
				</button>

				<div class="indicator">
					{#if downloader.selectedBooks.length > 1}
						<span class="indicator-item badge badge-primary badge-soft font-semibold">
							{downloader.selectedBooks.length}
						</span>
					{/if}
					<div>
						<button
							onclick={() => downloader.downloadSelectedCovers()}
							class="btn btn-lg btn-primary shadow-lg"
							disabled={!downloader.isSomeSelected}
						>
							<Download class="size-6" />
							Download
						</button>
					</div>
				</div>
			</div>
		{:else if !downloader.isFetching}
			<p class="w-full text-center text-lg font-semibold">No covers found</p>
		{/if}
	</div>
{/if}

<style>
	@media (width <= 64rem) {
		.opened-image-panel {
			width: 100% !important;
			height: var(--img-percentage) !important;
			left: 0 !important;
			top: var(--top-offset) !important;
		}
	}
</style>
