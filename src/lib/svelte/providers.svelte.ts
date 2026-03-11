import allProviders, { type Provider } from '../providers.ts';
import { defaultSearchProvidersSetting } from './settings.svelte.ts';
import { SvelteSet } from 'svelte/reactivity';

export type { Provider };

export class Providers {
	updated: Provider[] = $derived.by(() => {
		if (!defaultSearchProvidersSetting?.value) return allProviders;

		const storedIds = new SvelteSet(defaultSearchProvidersSetting.value.map((p) => p.id));
		const newProviders = allProviders.filter((p) => !storedIds.has(p.id));

		return [...defaultSearchProvidersSetting.value, ...newProviders];
	});

	sorted: Provider[] = $derived([...this.updated].sort((a, b) => a.priority - b.priority));

	enabled: Provider[] = $derived([...this.sorted].filter((p) => p.enabled));
}

export default new Providers();
