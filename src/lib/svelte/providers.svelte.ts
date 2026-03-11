import allProviders, { sortProviders, getEnabledProviders, type Provider } from '../providers.ts';
import { configuredProvidersSetting } from './settings.svelte.ts';
import { SvelteSet } from 'svelte/reactivity';

export type { Provider };
export { sortProviders, getEnabledProviders };

export class Providers {
	load = () => configuredProvidersSetting.load();

	updated: Provider[] = $derived.by(() => {
		if (!configuredProvidersSetting?.value) return allProviders;

		const storedIds = new SvelteSet(configuredProvidersSetting.value.map((p) => p.id));
		const newProviders = allProviders.filter((p) => !storedIds.has(p.id));

		return [...configuredProvidersSetting.value, ...newProviders];
	});

	sorted: Provider[] = $derived(sortProviders([...this.updated]));

	enabled: Provider[] = $derived(getEnabledProviders([...this.sorted]));
}

export default new Providers();
