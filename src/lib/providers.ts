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
	supportsBookPages?: boolean;
	volumePrefix?: string;
}

export interface ProviderStorageEntry {
	id: Provider['id'];
	enabled: Provider['enabled'];
	priority: Provider['priority'];
}

export const bookLive: Provider = {
	id: 'bl',
	name: 'BookLive',
	icon: '/images/providers/bl.svg',
	locale: 'ja',
	colors: { primary: '#F9A74A', secondary: '#F87313' },
	priority: 0,
	enabled: true,
};

export const bookLiveReader: Provider = {
	...bookLive,
	id: 'bl-r',
	name: 'BookLive Preview',
	colors: { primary: '#F87313', secondary: '#F9A74A' },
	priority: 0,
	enabled: false,
	supportsBookPages: true,
	ignoreErrors: true,
};

export const bookWalker: Provider = {
	id: 'bw',
	name: 'BookWalker',
	icon: '/images/providers/bw.svg',
	locale: 'ja',
	colors: { primary: '#009844', secondary: '#009844' },
	priority: 0,
	enabled: true,
};

export const bookWalkerReader: Provider = {
	...bookWalker,
	id: 'bw-r',
	name: 'BookWalker Preview',
	colors: { primary: '#009844', secondary: '#50aa7a' },
	priority: 0,
	ignoreErrors: true,
	supportsBookPages: true,
};

export const bookWalkerGlobal: Provider = {
	id: 'bw-g',
	name: 'BookWalker Global',
	icon: '/images/providers/bwg.svg',
	locale: 'en-US',
	colors: { primary: '#3498db', secondary: '#3498db' },
	priority: 0,
	enabled: true,
};

export const bookWalkerGlobalReader: Provider = {
	...bookWalkerGlobal,
	id: 'bw-gr',
	name: 'BookWalker Global Preview',
	colors: { primary: '#3498db', secondary: '#6db5e5' },
	priority: 0,
	ignoreErrors: true,
	supportsBookPages: true,
};

export const bookWalkerWayomi: Provider = {
	...bookWalker,
	id: 'bw-wa',
	name: 'BookWalker Wayomi',
	colors: { primary: '#00a4e5', secondary: '#00a4e5' },
	priority: 0,
	enabled: false,
	volumePrefix: 'Chapter',
};

export const bookWalkerWayomiReader: Provider = {
	...bookWalkerWayomi,
	id: 'bw-war',
	name: 'BookWalker Wayomi Preview',
	colors: { primary: '#00a4e5', secondary: '#26bcfb' },
	priority: 0,
	ignoreErrors: true,
	supportsBookPages: true,
};

export const bookWalkerTaiwan: Provider = {
	id: 'bw-tw',
	name: 'BookWalker Taiwan',
	icon: '/images/providers/bw.svg',
	locale: 'zh-TW',
	colors: { primary: '#b28a3d', secondary: '#b28a3d' },
	priority: 0,
	enabled: false,
};

export const bookWalkerTaiwanReader: Provider = {
	...bookWalkerTaiwan,
	id: 'bw-twr',
	name: 'BookWalker Taiwan Preview',
	locale: 'zh-TW',
	colors: { primary: '#b28a3d', secondary: '#846551' },
	priority: 0,
	ignoreErrors: true,
	supportsBookPages: true,
};

export const amazon: Provider = {
	id: 'amz',
	name: 'Amazon',
	icon: '/images/providers/amz.svg',
	locale: 'en-US',
	colors: { primary: '#ffa700', secondary: '#ffa700' },
	priority: 0,
	enabled: true,
	ignoreErrors: true,
	// disabled because Amazon blocks this feature
	supportsBookPages: false,
};

export const amazonUK: Provider = {
	...amazon,
	id: 'amz-uk',
	name: 'Amazon UK',
	locale: 'en-GB',
	priority: 0,
	enabled: false,
};

export const amazonJapan: Provider = {
	...amazon,
	id: 'amz-jp',
	name: 'Amazon Japan',
	locale: 'ja',
	colors: { primary: '#ffa700', secondary: '#fec254' },
	priority: 0,
	enabled: true,
};

export const amazonItaly: Provider = {
	...amazonJapan,
	id: 'amz-it',
	name: 'Amazon Italy',
	locale: 'it',
	priority: 0,
	enabled: false,
};

export const amazonSpain: Provider = {
	...amazonJapan,
	id: 'amz-es',
	name: 'Amazon Spain',
	locale: 'es',
	priority: 0,
	enabled: false,
};

export const amazonMexico: Provider = {
	...amazonJapan,
	id: 'amz-mx',
	name: 'Amazon Mexico',
	locale: 'es-MX',
	priority: 0,
	enabled: false,
};

export const amazonGermany: Provider = {
	...amazonJapan,
	id: 'amz-de',
	name: 'Amazon Germany',
	locale: 'de',
	priority: 0,
	enabled: false,
};

export const amazonNetherlands: Provider = {
	...amazonJapan,
	id: 'amz-nl',
	name: 'Amazon Netherlands',
	locale: 'nl',
	priority: 0,
	enabled: false,
};

export const amazonFrance: Provider = {
	...amazonJapan,
	id: 'amz-fr',
	name: 'Amazon France',
	locale: 'fr',
	priority: 0,
	enabled: false,
};

export const eBookJapan: Provider = {
	id: 'ebj',
	name: 'eBookJapan',
	icon: '/images/providers/ebj.svg',
	locale: 'ja',
	colors: { primary: '#F8485E', secondary: '#dd3046' },
	priority: 0,
	enabled: false,
};

export const cmoa: Provider = {
	id: 'cmoa',
	name: 'Cmoa',
	icon: '/images/providers/cmoa.svg',
	locale: 'ja',
	colors: { primary: '#dd763f', secondary: '#ea5505' },
	priority: 0,
	enabled: false,
	supportsBookPages: true,
};

export const aladin: Provider = {
	id: 'aladin',
	name: 'Aladin',
	icon: '/images/providers/aladin.ico',
	locale: 'ko',
	colors: { primary: '#fcaf17', secondary: '#ee3897' },
	priority: 0,
	enabled: false,
	supportsBookPages: true,
};

export const ridibooks: Provider = {
	id: 'ridi',
	name: 'Ridibooks',
	icon: '/images/providers/ridi.svg',
	locale: 'ko',
	colors: { primary: '#1E9EFF', secondary: '#1E9EFF' },
	priority: 0,
	enabled: false,
	supportsBookPages: true,
};

const allProviders: Provider[] = [
	bookLive,
	bookLiveReader,
	bookWalker,
	bookWalkerReader,
	bookWalkerGlobal,
	bookWalkerGlobalReader,
	bookWalkerWayomi,
	bookWalkerWayomiReader,
	bookWalkerTaiwan,
	bookWalkerTaiwanReader,
	amazon,
	amazonUK,
	amazonJapan,
	amazonItaly,
	amazonSpain,
	amazonMexico,
	amazonGermany,
	amazonNetherlands,
	amazonFrance,
	eBookJapan,
	cmoa,
	aladin,
	ridibooks,
];

export default sortProviders(allProviders.map((p, i) => ({ ...p, priority: i + 1 })));

export function sortProviders(providers: Provider[]) {
	return providers.sort((a, b) => a.priority - b.priority);
}

export function getEnabledProviders(providers: Provider[]) {
	return providers.filter((p) => p.enabled);
}

export function mapToStoreEntries(providers: Provider[]): ProviderStorageEntry[] {
	return providers.map(({ id, enabled, priority }) => ({ id, enabled, priority }));
}
