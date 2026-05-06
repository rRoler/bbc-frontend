export interface Provider {
	id: string;
	name: string;
	icon: string;
	locale: 'en' | 'en-US' | 'en-GB' | 'ja' | 'de' | 'it' | 'es' | 'es-mx' | 'ko' | 'zh-TW';
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
	priority: 1,
	enabled: true,
};

export const bookWalker: Provider = {
	id: 'bw',
	name: 'BookWalker',
	icon: '/images/providers/bw.svg',
	locale: 'ja',
	colors: { primary: '#009844', secondary: '#009844' },
	priority: 2,
	enabled: true,
};

export const bookWalkerReader: Provider = {
	...bookWalker,
	id: 'bw-r',
	name: 'BookWalker Preview',
	colors: { primary: '#009844', secondary: '#50aa7a' },
	priority: 3,
	ignoreErrors: true,
	supportsBookPages: true,
};

export const bookWalkerGlobal: Provider = {
	id: 'bw-g',
	name: 'BookWalker Global',
	icon: '/images/providers/bwg.svg',
	locale: 'en',
	colors: { primary: '#3498db', secondary: '#3498db' },
	priority: 4,
	enabled: true,
};

export const bookWalkerGlobalReader: Provider = {
	...bookWalkerGlobal,
	id: 'bw-gr',
	name: 'BookWalker Global Preview',
	colors: { primary: '#3498db', secondary: '#6db5e5' },
	priority: 5,
	ignoreErrors: true,
	supportsBookPages: true,
};

export const bookWalkerWayomi: Provider = {
	...bookWalker,
	id: 'bw-wa',
	name: 'BookWalker Wayomi',
	colors: { primary: '#00a4e5', secondary: '#00a4e5' },
	priority: 6,
	enabled: false,
	volumePrefix: 'Chapter',
};

export const bookWalkerWayomiReader: Provider = {
	...bookWalkerWayomi,
	id: 'bw-war',
	name: 'BookWalker Wayomi Preview',
	colors: { primary: '#00a4e5', secondary: '#26bcfb' },
	priority: 7,
	ignoreErrors: true,
	supportsBookPages: true,
};

export const amazon: Provider = {
	id: 'amz',
	name: 'Amazon',
	icon: '/images/providers/amz.svg',
	locale: 'en-US',
	colors: { primary: '#ffa700', secondary: '#ffa700' },
	priority: 8,
	enabled: true,
	ignoreErrors: true,
};

export const amazonUK: Provider = {
	...amazon,
	id: 'amz-uk',
	name: 'Amazon UK',
	locale: 'en-GB',
	priority: 8.5,
	enabled: false,
};

export const amazonJapan: Provider = {
	...amazon,
	id: 'amz-jp',
	name: 'Amazon Japan',
	locale: 'ja',
	colors: { primary: '#ffa700', secondary: '#fec254' },
	priority: 9,
	enabled: true,
};

export const amazonItaly: Provider = {
	...amazonJapan,
	id: 'amz-it',
	name: 'Amazon Italy',
	locale: 'it',
	priority: 10,
	enabled: false,
};

export const amazonSpain: Provider = {
	...amazonJapan,
	id: 'amz-es',
	name: 'Amazon Spain',
	locale: 'es',
	priority: 11,
	enabled: false,
};

export const amazonMexico: Provider = {
	...amazonJapan,
	id: 'amz-mx',
	name: 'Amazon Mexico',
	locale: 'es-mx',
	priority: 12,
	enabled: false,
};

export const amazonGermany: Provider = {
	...amazonJapan,
	id: 'amz-de',
	name: 'Amazon Germany',
	locale: 'de',
	priority: 13,
	enabled: false,
};

export const eBookJapan: Provider = {
	id: 'ebj',
	name: 'eBookJapan',
	icon: '/images/providers/ebj.svg',
	locale: 'ja',
	colors: { primary: '#F8485E', secondary: '#dd3046' },
	priority: 14,
	enabled: false,
};

export const cmoa: Provider = {
	id: 'cmoa',
	name: 'Cmoa',
	icon: '/images/providers/cmoa.svg',
	locale: 'ja',
	colors: { primary: '#dd763f', secondary: '#ea5505' },
	priority: 15,
	enabled: false,
	supportsBookPages: true,
};

export const aladin: Provider = {
	id: 'aladin',
	name: 'Aladin',
	icon: '/images/providers/aladin.ico',
	locale: 'ko',
	colors: { primary: '#fcaf17', secondary: '#ee3897' },
	priority: 16,
	enabled: false,
	supportsBookPages: true,
};

export const ridibooks: Provider = {
	id: 'ridi',
	name: 'Ridibooks',
	icon: '/images/providers/ridi.svg',
	locale: 'ko',
	colors: { primary: '#1E9EFF', secondary: '#1E9EFF' },
	priority: 17,
	enabled: false,
	supportsBookPages: true,
};

export const bookWalkerTaiwan: Provider = {
	id: 'bw-tw',
	name: 'BookWalker Taiwan',
	icon: '/images/providers/bw.svg',
	locale: 'zh-TW',
	colors: { primary: '#b28a3d', secondary: '#b28a3d' },
	priority: 18,
	enabled: false,
};

export const bookWalkerTaiwanReader: Provider = {
	...bookWalkerTaiwan,
	id: 'bw-twr',
	name: 'BookWalker Taiwan Preview',
	locale: 'zh-TW',
	colors: { primary: '#b28a3d', secondary: '#846551' },
	priority: 19,
	ignoreErrors: true,
	supportsBookPages: true,
};

const allProviders: Provider[] = [
	bookLive,
	bookWalker,
	bookWalkerReader,
	bookWalkerGlobal,
	bookWalkerGlobalReader,
	bookWalkerWayomi,
	bookWalkerWayomiReader,
	amazon,
	amazonUK,
	amazonJapan,
	amazonItaly,
	amazonSpain,
	amazonMexico,
	amazonGermany,
	eBookJapan,
	cmoa,
	aladin,
	ridibooks,
	bookWalkerTaiwan,
	bookWalkerTaiwanReader,
];

export default sortProviders(allProviders);

export function sortProviders(providers: Provider[]) {
	return providers.sort((a, b) => a.priority - b.priority);
}

export function getEnabledProviders(providers: Provider[]) {
	return providers.filter((p) => p.enabled);
}

export function mapToStoreEntries(providers: Provider[]): ProviderStorageEntry[] {
	return providers.map(({ id, enabled, priority }) => ({ id, enabled, priority }));
}
