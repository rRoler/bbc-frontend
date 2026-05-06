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

	expandStoreEntries = (entries: ProviderStorageEntry[]): Provider[] => {
		const providerDataMap = new SvelteMap(allProviders.map((p) => [p.id, p]));
		const mapped = entries
			.map((entry) => {
				const p = providerDataMap.get(entry.id);
				if (!p) return null;
				return { ...p, enabled: entry.enabled, priority: entry.priority };
			})
			.filter((p) => !!p) as Provider[];
		const mappedIds = new SvelteSet(mapped.map((p) => p.id));
		const rest = allProviders.filter((p) => !mappedIds.has(p.id));
		return [...mapped, ...rest];
	};

	updated: Provider[] = $derived(
		configuredProvidersSetting?.value
			? this.expandStoreEntries(configuredProvidersSetting.value)
			: allProviders
	);

	sorted: Provider[] = $derived(sortProviders([...this.updated]));

	enabled: Provider[] = $derived(getEnabledProviders([...this.sorted]));

	byLocale: SvelteMap<Provider['locale'], Provider[]> = $derived.by(() => {
		const map = new SvelteMap<Provider['locale'], Provider[]>();
		for (const provider of this.sorted) {
			const localeProviders = map.get(provider.locale) || [];
			localeProviders.push(provider);
			map.set(provider.locale, localeProviders);
		}
		return map;
	});

	locales: SvelteSet<Provider['locale']> = $derived(new SvelteSet(this.byLocale.keys()));
}

export default new Providers();
