<script lang="ts">
	import allProviders from '../lib/apis/providers.ts';
	import type { Provider } from '../lib/apis/providers.ts';
	import ProviderLabel from './ProviderLabel.svelte';
	import {
		appendSvelteSearchParam,
		getAllSvelteSearchParams,
		removeSvelteSearchParam,
	} from '../lib/utils.ts';
	import { onMount } from 'svelte';
	import { Search } from 'lucide-svelte';

	let {
		class: className = '',
		providers = [...allProviders],
		selected = $bindable([]),
		onchange,
		paramsEnabled = true,
		delayMs = 500,
	}: {
		class?: string;
		providers?: Provider[];
		selected?: Provider[];
		onchange?: (providers: Provider[]) => void | Promise<void>;
		paramsEnabled?: boolean;
		delayMs?: number;
	} = $props();

	let pendingSelection = $derived<Provider[]>([...selected]);
	let debounceTimer = $state<number>();
	let search = $state<string>('');
	let searchInput = $state<HTMLInputElement>();
	let dropdownEl = $state<HTMLElement>();

	let filteredProviders = $derived(
		search.trim() === ''
			? providers
			: providers.filter((p) => p.name.toLowerCase().trim().includes(search.toLowerCase().trim()))
	);

	onMount(() => {
		if (paramsEnabled) {
			const providerIds = getAllSvelteSearchParams('provider');
			if (providerIds.length > 0) {
				const paramProviders = providers.filter((p) => providerIds.includes(p.id));
				if (paramProviders.length > 0) {
					selected = paramProviders;
				}
			}
		}
	});

	$effect(() => {
		if (!paramsEnabled) return;

		const selectedIds = selected.map((p) => p.id);

		for (const provider of providers) {
			const isSelected = selectedIds.includes(provider.id);
			if (isSelected) {
				appendSvelteSearchParam('provider', provider.id);
			} else {
				removeSvelteSearchParam('provider', provider.id);
			}
		}
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

		newSelection.sort((a, b) => {
			const aIndex = providers.findIndex((p) => p.id === a.id);
			const bIndex = providers.findIndex((p) => p.id === b.id);
			return aIndex - bIndex;
		});

		pendingSelection = newSelection;

		if (debounceTimer !== undefined) {
			clearTimeout(debounceTimer);
		}

		debounceTimer = setTimeout(() => {
			selected = [...pendingSelection];
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
</script>

<div
	bind:this={dropdownEl}
	class="dropdown sm:dropdown-start dropdown-center {className}"
	onkeydown={handleKeydown}
>
	<div tabindex="0" role="button" class="btn btn-primary btn-outline h-fit flex-wrap px-4 py-1">
		{#if selected.length > 0}
			<span>Providers:</span>
			{#each selected as provider (provider.id)}
				<img src={provider.icon} class="size-4" alt="{provider.name} Logo" />
			{/each}
		{:else}
			Select Providers
		{/if}
	</div>

	<ul
		tabindex="-1"
		class="dropdown-content menu bg-base-100 rounded-box z-1 w-full min-w-69 p-2 shadow-sm"
	>
		<li class="menu-title p-1">
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
