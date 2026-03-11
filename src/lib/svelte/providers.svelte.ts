import allProviders, { type Provider } from '../providers.ts';
import { configuredProvidersSetting } from './settings.svelte.ts';
import { SvelteSet } from 'svelte/reactivity';

export type { Provider };

export class Providers {
	load = () => configuredProvidersSetting.load();

	updated: Provider[] = $derived.by(() => {
		if (!configuredProvidersSetting?.value) return allProviders;

		const storedIds = new SvelteSet(configuredProvidersSetting.value.map((p) => p.id));
		const newProviders = allProviders.filter((p) => !storedIds.has(p.id));

		return [...configuredProvidersSetting.value, ...newProviders];
	});

	sorted: Provider[] = $derived([...this.updated].sort((a, b) => a.priority - b.priority));

	enabled: Provider[] = $derived([...this.sorted].filter((p) => p.enabled));
}

export default new Providers();
