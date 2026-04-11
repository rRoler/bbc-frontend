import allProviders, {
	sortProviders,
	getEnabledProviders,
	type Provider,
	type ProviderStorageEntry,
} from '../providers.ts';
import { configuredProvidersSetting } from './settings.svelte.ts';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';

export type { Provider, ProviderStorageEntry };
export { sortProviders, getEnabledProviders };

export class Providers {
	load = () => configuredProvidersSetting.load();

	updated: Provider[] = $derived.by(() => {
		if (!configuredProvidersSetting?.value) return allProviders;

		const providerDataMap = new SvelteMap(allProviders.map((p) => [p.id, p]));
		const allStoredProviders = configuredProvidersSetting.value
			.map((p) => providerDataMap.get(p.id))
			.filter((p) => !!p);
		const storedIds = new SvelteSet(allStoredProviders.map((p) => p.id));
		const newProviders = allProviders.filter((p) => !storedIds.has(p.id));

		return [...allStoredProviders, ...newProviders];
	});

	sorted: Provider[] = $derived(sortProviders([...this.updated]));

	enabled: Provider[] = $derived(getEnabledProviders([...this.sorted]));
}

export default new Providers();
