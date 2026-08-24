import { type ProviderEndpoint } from '../api/bbc';
import { configuredProvidersSetting } from './settings.svelte.ts';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';

export interface Provider {
	id: string;
	name: string;
	icon: string;
	locale:
		| 'en-US'
		| 'en-GB'
		| 'ja'
		| 'de'
		| 'it'
		| 'es'
		| 'es-MX'
		| 'ko'
		| 'zh-TW'
		| 'fr'
		| 'nl'
		| 'multi';
	colors: {
		primary: string;
		secondary: string;
	};
	priority: number;
	enabled: boolean;
	ignoreErrors: boolean;
	supportedEndpoints: ProviderEndpoint[];
	volumePrefix: string | null;
	groupId?: string | null;
}

export interface ProviderStorageEntry {
	id: Provider['id'];
	enabled: Provider['enabled'];
	priority: Provider['priority'];
}

export function sortProviders(providers: Provider[]) {
	return providers.sort((a, b) => a.priority - b.priority);
}

export function toBaseLangSet(locales: SvelteSet<string>): SvelteSet<string> {
	const result = new SvelteSet<string>();
	for (const locale of locales) {
		if (locale === 'none') continue;
		result.add(locale.split('-')[0].toLowerCase());
	}
	return result;
}

export function deriveAvailableLanguages(
	providers: Provider[],
	getMultiLanguages: (provider: Provider) => string[]
): string[] {
	const langs = new SvelteSet<string>();
	const claimedBase = new SvelteSet<string>();
	for (const provider of providers) {
		if (provider.locale === 'multi') continue;
		const base = provider.locale.split('-')[0].toLowerCase();
		claimedBase.add(base);
		langs.add(provider.locale);
	}
	for (const provider of providers) {
		if (provider.locale !== 'multi') continue;
		for (const lang of getMultiLanguages(provider)) {
			if (lang && !claimedBase.has(lang)) langs.add(lang);
		}
	}
	return Array.from(langs);
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

export class Providers {
	providers = $state<Provider[]>([]);

	load = () => {
		const el = document.getElementById('provider-data');
		if (el) {
			this.providers = JSON.parse(el.textContent || '[]') as Provider[];
		}
		configuredProvidersSetting.load();
	};

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
