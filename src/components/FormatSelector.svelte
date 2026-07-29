<script lang="ts">
	import { Braces, X } from 'lucide-svelte';
	import { textVariables } from '../lib/svelte/settings.svelte.ts';
	import { getTextVariableName } from '../lib/utils.ts';

	let {
		value = $bindable(''),
		class: className = '',
		tabs = ['book', 'series', 'provider', 'cover', 'file', 'datetime'] as readonly string[],
	}: {
		value?: string;
		class?: string;
		tabs?: readonly string[];
	} = $props();

	const tabLabels: Record<string, string> = {
		all: 'All',
		book: 'Book',
		series: 'Series',
		provider: 'Provider',
		cover: 'Cover',
		file: 'File',
		datetime: 'Date/Time',
	};

	let dialogEl = $state<HTMLDialogElement>();
	let activeTab = $state<string>('');

	$effect(() => {
		if (!activeTab || !tabs.includes(activeTab)) {
			activeTab = tabs[0] ?? 'book';
		}
	});

	let searchTerm = $state('');

	let cursorStart = 0;
	let cursorEnd = 0;

	function captureCursor() {
		const el = document.activeElement;
		if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
			cursorStart = el.selectionStart ?? 0;
			cursorEnd = el.selectionEnd ?? 0;
		} else {
			cursorStart = value.length;
			cursorEnd = value.length;
		}
	}

	const categories: Record<string, string[]> = {
		book: [
			textVariables.bookTitle,
			textVariables.bookUrl,
			textVariables.bookId,
			textVariables.volumeName,
			textVariables.volumeNumber,
			textVariables.bookPageName,
			textVariables.bookPageNumber,
			textVariables.bookPrice,
			textVariables.bookCurrency,
			textVariables.bookOriginalPrice,
			textVariables.bookIsbn,
			textVariables.bookReleaseDate,
			textVariables.bookPageCount,
			textVariables.bookDescription,
			textVariables.bookAuthors,
			textVariables.bookArtists,
			textVariables.bookPublisher,
			textVariables.bookTags,
			textVariables.bookRating,
			textVariables.bookRatingCount,
			textVariables.bookLanguageCode,
			textVariables.bookLanguageName,
			textVariables.bookTranslator,
			textVariables.bookFormat,
			textVariables.bookFileSize,
		],
		series: [
			textVariables.seriesTitle,
			textVariables.seriesUrl,
			textVariables.seriesId,
			textVariables.seriesThumbnailUrl,
			textVariables.seriesPublicationType,
			textVariables.seriesBookType,
			textVariables.seriesType,
			textVariables.seriesDescription,
			textVariables.seriesAuthors,
			textVariables.seriesArtists,
			textVariables.seriesPublisher,
			textVariables.seriesTags,
			textVariables.seriesStatus,
			textVariables.seriesRating,
			textVariables.seriesRatingCount,
			textVariables.seriesLanguageCode,
			textVariables.seriesLanguageName,
			textVariables.seriesTranslator,
			textVariables.seriesFormat,
			textVariables.seriesReadingDirection,
			textVariables.seriesBookCount,
			textVariables.seriesChapterCount,
			textVariables.seriesMagazine,
			textVariables.seriesGenre,
			textVariables.seriesTitleKana,
			textVariables.seriesAlId,
			textVariables.seriesApId,
			textVariables.seriesMuId,
			textVariables.seriesNuId,
			textVariables.seriesKtId,
			textVariables.seriesMalId,
			textVariables.seriesMbId,
			textVariables.seriesShikiId,
			textVariables.seriesLastUpdated,
		],
		provider: [
			textVariables.providerName,
			textVariables.providerId,
			textVariables.providerLanguageName,
			textVariables.providerLanguageCode,
		],
		cover: [
			textVariables.coverUrl,
			textVariables.coverQualityScore,
			textVariables.coverWidth,
			textVariables.coverHeight,
			textVariables.coverCropStatus,
		],
		file: [textVariables.fileExtension],
		datetime: [textVariables.date, textVariables.time, textVariables.datetime],
	};

	const allVars = $derived.by(() => tabs.flatMap((t) => categories[t] ?? []));

	function filterList(names: string[]): string[] {
		if (!searchTerm) return names;
		return names.filter((name) => name.toLowerCase().includes(searchTerm.toLowerCase()));
	}

	const currentList = $derived(
		activeTab === 'all' ? filterList(allVars) : filterList(categories[activeTab] ?? [])
	);

	function insertVariable(name: string) {
		const varName = getTextVariableName(name);
		const start = Math.min(cursorStart, cursorEnd);
		const end = Math.max(cursorStart, cursorEnd);
		value = value.slice(0, start) + varName + value.slice(end);
		dialogEl?.close();
	}

	function showTab(tab: string) {
		activeTab = tab;
		searchTerm = '';
	}
</script>

<button
	class="btn btn-ghost btn-square btn-xs mt-0.5 shrink-0 {className}"
	onmousedown={captureCursor}
	onclick={() => dialogEl?.showModal()}
	aria-label="Insert template variable"
>
	<Braces class="size-4" />
</button>

<dialog bind:this={dialogEl} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box max-w-lg">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute top-6 right-6"
				onclick={() => dialogEl?.close()}
			>
				<X class="size-5" />
			</button>
		</form>

		<h3 class="mb-3 text-lg font-bold">Insert Variable</h3>

		<label class="input input-bordered mb-3 flex items-center gap-2">
			<input type="text" class="grow" placeholder="Filter variables..." bind:value={searchTerm} />
		</label>

		<div class="tabs tabs-bordered mb-3">
			{#each tabs as tab (tab)}
				<button
					class="tab tab-sm capitalize"
					class:tab-active={activeTab === tab}
					onclick={() => showTab(tab)}
				>
					{tabLabels[tab] ?? tab}
				</button>
			{/each}
		</div>

		<div class="flex max-h-64 flex-col gap-1 overflow-y-auto">
			{#each currentList as name (name)}
				<button
					class="btn btn-sm btn-ghost h-auto w-full justify-start py-2 normal-case"
					onclick={() => insertVariable(name)}
				>
					<kbd class="kbd kbd-sm">{getTextVariableName(name)}</kbd>
				</button>
			{/each}
		</div>
	</div>

	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
