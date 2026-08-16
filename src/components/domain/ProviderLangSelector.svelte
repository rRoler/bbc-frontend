<script module lang="ts">
	export const PROVIDER_LANG_PARAM_KEY = 'providerLang';
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import {
		getAllSvelteSearchParams,
		getLocaleName,
		langToFlag,
		setSvelteSearchParamsArray,
	} from '../../lib/utils.ts';
	import { Globe } from 'lucide-svelte';
	import Tooltip from '../ui/Tooltip.svelte';

	let {
		languages = [] as string[],
		selected = $bindable(new SvelteSet<string>()),
		onchange,
		paramsEnabled = true,
	}: {
		languages?: string[];
		selected?: SvelteSet<string>;
		onchange?: (langs: string[]) => void | Promise<void>;
		paramsEnabled?: boolean;
	} = $props();

	onMount(() => {
		if (!paramsEnabled || languages.length <= 1) return;

		const langIds = getAllSvelteSearchParams(PROVIDER_LANG_PARAM_KEY);
		if (langIds.length > 0) {
			const valid = langIds.filter((l) => languages.includes(l));
			if (valid.length > 0) {
				selected = new SvelteSet(valid);
			}
		}
	});

	$effect(() => {
		if (!paramsEnabled || languages.length <= 1) return;

		setSvelteSearchParamsArray(PROVIDER_LANG_PARAM_KEY, [...selected]);
	});

	function toggleLang(lang: string) {
		if (selected.has(lang)) {
			selected.delete(lang);
		} else {
			selected.add(lang);
		}
		onchange?.([...selected]);
	}

	const selectedArray = $derived([...selected]);
</script>

<div class="dropdown sm:dropdown-start dropdown-center">
	<div tabindex="0" role="button" class="btn btn-primary btn-outline h-fit px-4 py-1">
		<span class="me-1">Language:</span>
		{#if selectedArray.length > 0}
			{#each selectedArray as lang (lang)}
				{@const Flag = langToFlag(lang) ?? Globe}
				<Tooltip tip={getLocaleName(lang)}>
					<Flag class="size-4" />
				</Tooltip>
			{/each}
		{:else}
			<span>All</span>
		{/if}
	</div>

	<ul
		tabindex="-1"
		class="menu dropdown-content bg-base-100 rounded-box z-50 w-fit min-w-44 shadow-sm [&_label]:justify-start"
	>
		{#each languages as lang (lang)}
			{@const isSelected = selected.has(lang)}
			{@const Flag = langToFlag(lang) ?? Globe}
			<li>
				<label>
					<input
						type="checkbox"
						checked={isSelected}
						onchange={() => toggleLang(lang)}
						class="checkbox checkbox-xs"
					/>
					<Flag class="size-4" />
					{getLocaleName(lang)}
				</label>
			</li>
		{/each}
	</ul>
</div>
