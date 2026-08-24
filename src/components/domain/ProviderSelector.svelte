<script lang="ts">
	import { PROVIDER_PARAM_KEY, PROVIDER_LOCALE_PARAM_KEY } from '../../config/constants.ts';
	import allProviders, {
		sortProviders,
		toBaseLangSet,
		type Provider,
	} from '../../stores/providers.svelte.ts';
	import ProviderLabel from './ProviderLabel.svelte';
	import ProviderIcons from './ProviderIcons.svelte';
	import {
		getAllSvelteSearchParams,
		getLocaleName,
		langToFlag,
		removeSvelteSearchParam,
		setSvelteSearchParamsArray,
	} from '../../utils';
	import { onMount } from 'svelte';
	import { Search } from 'lucide-svelte';
	import Tooltip from '../ui/Tooltip.svelte';
	import { SvelteSet } from 'svelte/reactivity';

	let {
		class: className = '',
		providers = allProviders.sorted,
		selected = $bindable([]),
		selectedLocales = $bindable(new SvelteSet<string>()),
		languages = Array.from(allProviders.locales),
		onchange,
		paramsEnabled = true,
		delayMs = 500,
		dropdownPosition = 'sm:dropdown-start dropdown-center',
	}: {
		class?: string;
		providers?: Provider[];
		selected?: Provider[];
		selectedLocales?: SvelteSet<string>;
		languages?: string[];
		onchange?: (providers: Provider[]) => void | Promise<void>;
		paramsEnabled?: boolean;
		delayMs?: number;
		dropdownPosition?: string;
	} = $props();

	let pendingSelection = $derived<Provider[]>([...selected]);
	let debounceTimer = $state<number>();
	let search = $state<string>('');
	let searchInput = $state<HTMLInputElement>();
	let dropdownEl = $state<HTMLElement>();
	let selectedBeforeLocale = $state<Provider[]>([]);
	let flagContainer = $state<HTMLDivElement>();

	let sortedProviders = $derived(sortProviders([...providers]));

	let filteredProviders = $derived.by(() => {
		let filtered = sortedProviders;

		const formatedSearch = search.toLowerCase().trim();
		if (formatedSearch.length > 0) {
			filtered = filtered.filter((p) => p.name.toLowerCase().trim().includes(formatedSearch));
		}

		if (selectedLocales.size > 0) {
			const baseSet = toBaseLangSet(selectedLocales);
			filtered = filtered.filter(
				(p) =>
					selectedLocales.has(p.locale) ||
					baseSet.has(p.locale.split('-')[0].toLowerCase()) ||
					p.locale === 'multi'
			);
		}

		return filtered;
	});
	let isAllFilteredSelected = $derived(
		filteredProviders.length > 0 &&
			filteredProviders.every((fp) => (pendingSelection || selected).some((s) => s.id === fp.id))
	);
	let isSomeFilteredSelected = $derived(
		filteredProviders.some((fp) => (pendingSelection || selected).some((s) => s.id === fp.id))
	);
	let isFilteredIndeterminate = $derived(isSomeFilteredSelected && !isAllFilteredSelected);

	onMount(() => {
		if (!paramsEnabled) return;

		const providerIds = getAllSvelteSearchParams(PROVIDER_PARAM_KEY);
		if (providerIds.length > 0) {
			const paramProviders = providers.filter((p) => providerIds.includes(p.id));
			if (paramProviders.length > 0) {
				selected = sortProviders([...paramProviders]);
			}
		}

		const localeIds = getAllSvelteSearchParams(PROVIDER_LOCALE_PARAM_KEY);
		const enLocaleIndex = localeIds.indexOf('en');
		if (enLocaleIndex > -1) {
			if (!localeIds.includes('en-US')) localeIds.push('en-US');
			if (!localeIds.includes('en-GB')) localeIds.push('en-GB');
			localeIds.splice(enLocaleIndex, 1);
			removeSvelteSearchParam(PROVIDER_LOCALE_PARAM_KEY, 'en');
		}
		const zhLocaleIndex = localeIds.indexOf('zh');
		if (zhLocaleIndex > -1) {
			if (!localeIds.includes('zh-TW')) localeIds.push('zh-TW');
			localeIds.splice(zhLocaleIndex, 1);
			removeSvelteSearchParam(PROVIDER_LOCALE_PARAM_KEY, 'zh');
		}

		selectedLocales = new SvelteSet(localeIds);
		if (selected.length === 0) {
			selected = allProviders.sorted.filter((p) => selectedLocales.has(p.locale));
		} else {
			selectedBeforeLocale = [...selected];
		}

		if (selected.length === 0) {
			selectedLocales = new SvelteSet([]);
		}

		dropdownEl?.addEventListener('keydown', handleKeydown);
	});

	$effect(() => {
		if (!paramsEnabled) return;
		setSvelteSearchParamsArray(
			PROVIDER_PARAM_KEY,
			selected.map((p) => p.id)
		);
	});

	$effect(() => {
		if (!paramsEnabled) return;

		setSvelteSearchParamsArray(PROVIDER_LOCALE_PARAM_KEY, [...selectedLocales]);
	});

	function isProviderSelected(providerId: string): boolean {
		return pendingSelection.some((p) => p.id === providerId);
	}

	function changeProvider(e: Event, provider: Provider) {
		const checkbox = e.target as HTMLInputElement;
		const providerIndex = pendingSelection.findIndex((p) => p.id === provider.id);

		let newSelection: Provider[];
		if (checkbox.checked && providerIndex === -1) {
			newSelection = [...pendingSelection, provider];
		} else if (!checkbox.checked && providerIndex !== -1) {
			newSelection = pendingSelection.filter((p) => p.id !== provider.id);
		} else {
			return;
		}

		updateSelection(newSelection);
	}

	function updateSelection(newSelection: Provider[]) {
		sortProviders(newSelection);

		pendingSelection = newSelection;

		if (debounceTimer !== undefined) {
			clearTimeout(debounceTimer);
		}

		debounceTimer = setTimeout(() => {
			selected = sortProviders([...pendingSelection]);
			onchange?.(selected);
			debounceTimer = undefined;
		}, delayMs) as unknown as number;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			(document.activeElement as HTMLElement | null)?.blur();
			dropdownEl?.blur();
			return;
		}

		if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
			const flagButtons = Array.from(flagContainer?.querySelectorAll<HTMLElement>('button') ?? []);
			const currentIndex = flagButtons.indexOf(document.activeElement as HTMLElement);

			const nextIndex =
				e.key === 'ArrowRight'
					? currentIndex === -1
						? 0
						: (currentIndex + 1) % flagButtons.length
					: currentIndex === -1
						? flagButtons.length - 1
						: (currentIndex - 1 + flagButtons.length) % flagButtons.length;
			flagButtons[nextIndex]?.focus();
			return;
		}

		if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') {
			if (e.key === ' ' || e.key === 'Enter') {
				const focused = document.activeElement;
				if (focused && focused !== searchInput) {
					const checkbox = focused.querySelector<HTMLInputElement>('input[type="checkbox"]');
					if (checkbox) {
						e.preventDefault();
						checkbox.click();
						return;
					}
				}
			}
			if (
				e.key.length === 1 &&
				!e.ctrlKey &&
				!e.metaKey &&
				document.activeElement !== searchInput
			) {
				searchInput?.focus();
			}
			return;
		}

		e.preventDefault();

		const items = Array.from(
			dropdownEl?.querySelectorAll<HTMLElement>('ul li:not(.menu-title) label') ?? []
		);

		if (items.length === 0) return;

		const current = document.activeElement;
		const currentIndex = items.indexOf(current as HTMLElement);

		let nextIndex: number;
		if (e.key === 'ArrowDown') {
			nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % items.length;
		} else {
			nextIndex =
				currentIndex === -1 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
		}

		items[nextIndex]?.focus();
	}

	function toggleLocale(locale: string) {
		if (selectedLocales.has(locale)) {
			selectedLocales.delete(locale);
			if (selectedLocales.size === 0) updateSelection(selectedBeforeLocale);
			else updateSelection(filteredProviders);
		} else {
			if (selectedLocales.size === 0) selectedBeforeLocale = [...(pendingSelection || selected)];
			selectedLocales.add(locale);
			updateSelection(filteredProviders);
		}
	}

	function toggleAll() {
		updateSelection(isAllFilteredSelected ? [...filteredProviders] : []);
	}
</script>

<div bind:this={dropdownEl} class="dropdown {dropdownPosition} {className}">
	<div
		tabindex="0"
		role="button"
		class="btn btn-primary btn-outline h-fit max-w-full flex-wrap px-4 py-1"
	>
		{#if selected.length > 0}
			<span>Providers:</span>
			<ProviderIcons providers={selected} size="size-4" class="max-w-48" />
		{:else}
			Select Providers
		{/if}
	</div>

	<div class="dropdown-content bg-base-100 rounded-box z-50 w-fit max-w-96 min-w-69 shadow-sm">
		<div class="w-full p-2">
			<label class="input input-bordered flex w-full items-center gap-2 font-normal">
				<Search class="size-5 shrink-0 opacity-80" />
				<input
					bind:this={searchInput}
					bind:value={search}
					onkeydown={(e) => {
						if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Escape')
							e.stopPropagation();
					}}
					type="search"
					placeholder="Search providers…"
					class="grow"
					autocomplete="off"
				/>
			</label>
		</div>

		{#if languages.length > 1}
			<div
				class="flex w-full max-w-80 flex-row flex-nowrap gap-2 overflow-x-auto p-2"
				bind:this={flagContainer}
			>
				{#each languages as locale (locale)}
					{@const Flag = langToFlag(locale)}
					{@const isSelected = selectedLocales.has(locale)}

					<Tooltip position="top" tip={getLocaleName(locale)}>
						<button
							class="btn btn-outline btn-accent btn-sm"
							onclick={() => toggleLocale(locale)}
							class:btn-active={isSelected}
						>
							<Flag class="size-4" />
						</button>
					</Tooltip>
				{/each}
			</div>
		{/if}

		<ul tabindex="-1" class="menu h-fit max-h-96 w-full flex-nowrap overflow-y-auto">
			<li>
				<label class="label" tabindex="-1">
					<input
						type="checkbox"
						class="checkbox checkbox-xs"
						tabindex="-1"
						bind:indeterminate={isFilteredIndeterminate}
						bind:checked={isAllFilteredSelected}
						onchange={() => toggleAll()}
					/>
					{#if isAllFilteredSelected}
						Deselect All
					{:else}
						Select All
					{/if}
				</label>
			</li>

			{#each filteredProviders as provider (provider.id)}
				<li>
					<label class="label" tabindex="-1">
						<input
							onchange={(e) => changeProvider(e, provider)}
							type="checkbox"
							checked={isProviderSelected(provider.id)}
							class="checkbox checkbox-xs"
							tabindex="-1"
						/>
						<ProviderLabel {provider} />
					</label>
				</li>
			{:else}
				<li class="menu-title text-center">No providers found</li>
			{/each}
		</ul>
	</div>
</div>
