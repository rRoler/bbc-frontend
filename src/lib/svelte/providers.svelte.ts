import BBC_API, { type ProviderEndpoint } from '../apis/bbc';
import { configuredProvidersSetting } from './settings.svelte.ts';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';

export interface Provider {
	id: string;
	name: string;
	icon: string;
	locale: 'en-US' | 'en-GB' | 'ja' | 'de' | 'it' | 'es' | 'es-MX' | 'ko' | 'zh-TW' | 'fr' | 'nl';
	colors: {
		primary: string;
		secondary: string;
	};
	priority: number;
	enabled: boolean;
	ignoreErrors?: boolean;
	supportedEndpoints: ProviderEndpoint[];
	volumePrefix?: string;
}

export interface ProviderStorageEntry {
	id: Provider['id'];
	enabled: Provider['enabled'];
	priority: Provider['priority'];
}

export function sortProviders(providers: Provider[]) {
	return providers.sort((a, b) => a.priority - b.priority);
}

export function getEnabledProviders(providers: Provider[]) {
	return providers.filter((p) => p.enabled);
}

export function mapToStoreEntries(providers: Provider[]): ProviderStorageEntry[] {
	return providers.map(({ id, enabled, priority }) => ({
		id,
		enabled,
		priority,
	}));
}

async function fetchAndMapProviders(): Promise<Provider[]> {
	const api = new BBC_API();
	const providers = await api.fetchProviders();
	return sortProviders([...providers]);
}

const initialProviders: Provider[] | null = (() => {
	if (typeof document === 'undefined') return null;
	const el = document.getElementById('provider-data');
	if (!el) return null;
	return JSON.parse(el.textContent || '[]') as Provider[];
})();

export class Providers {
	providers = $state<Provider[]>([]);
	private loaded = false;

	private async init(initialData?: Provider[]): Promise<void> {
		if (this.loaded && !initialData) return;

		if (initialData) {
			this.providers = initialData;
		} else if (initialProviders) {
			this.providers = initialProviders;
		} else {
			this.providers = await fetchAndMapProviders();
		}

		this.loaded = true;
	}

	load = () => this.init().then(() => configuredProvidersSetting.load());

	expandStoreEntries = (entries: ProviderStorageEntry[]): Provider[] => {
		const providerDataMap = new SvelteMap(this.providers.map((p) => [p.id, p]));
		const mapped = entries
			.map((entry) => {
				const p = providerDataMap.get(entry.id);
				if (!p) return null;
				return { ...p, enabled: entry.enabled, priority: entry.priority };
			})
			.filter((p) => !!p) as Provider[];
		const mappedIds = new SvelteSet(mapped.map((p) => p.id));
		const rest = this.providers.filter((p) => !mappedIds.has(p.id));
		return [...mapped, ...rest];
	};

	updated: Provider[] = $derived(
		configuredProvidersSetting?.value
			? this.expandStoreEntries(configuredProvidersSetting.value)
			: this.providers
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
