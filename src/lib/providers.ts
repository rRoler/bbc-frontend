import BBC_API, { type ProviderEndpoint } from './apis/bbc';

export interface Provider {
	id: string;
	name: string;
	icon: string;
	locale: 'en-US' | 'en-GB' | 'ja' | 'de' | 'it' | 'es' | 'es-MX' | 'ko' | 'zh-TW' | 'fr' | 'nl';
	colors: {
		primary: string;
		secondary: string;
	};
	enabledByDefault: boolean;
	ignoreErrors?: boolean;
	supportedEndpoints: ProviderEndpoint[];
	volumePrefix?: string;
}

export type ProviderWithPriority = Provider & { priority: number };

export interface ProviderStorageEntry {
	id: Provider['id'];
	enabled: Provider['enabledByDefault'];
	priority: number;
}

export async function fetchAndMapProviders(): Promise<ProviderWithPriority[]> {
	const api = new BBC_API();
	const providers = await api.fetchProviders();
	return sortProviders(providers.map((p, i) => ({ ...p, priority: i + 1 })));
}

export function sortProviders(providers: ProviderWithPriority[]) {
	return providers.sort((a, b) => a.priority - b.priority);
}

export function getEnabledProviders(providers: ProviderWithPriority[]) {
	return providers.filter((p) => p.enabledByDefault);
}

export function mapToStoreEntries(providers: ProviderWithPriority[]): ProviderStorageEntry[] {
	return providers.map(({ id, enabledByDefault, priority }) => ({
		id,
		enabled: enabledByDefault,
		priority,
	}));
}