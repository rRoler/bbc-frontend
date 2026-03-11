export interface Provider {
	id: string;
	name: string;
	icon: string;
	locale: 'en' | 'ja' | 'de' | 'it' | 'es' | 'es-mx' | 'ko';
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
	id: 'bw-r',
	name: 'BookWalker Preview',
	icon: '/images/providers/bw.svg',
	locale: 'ja',
	colors: { primary: '#009844', secondary: '#50aa7a' },
	priority: 3,
	enabled: true,
	ignoreErrors: true,
	supportsBookPages: true,
};

export const bookWalkerGlobal: Provider = {
	id: 'bw-g',
	name: 'BookWalker Global',
	icon: '/images/providers/bw.svg',
	locale: 'en',
	colors: { primary: '#3498db', secondary: '#3498db' },
	priority: 4,
	enabled: true,
};

export const bookWalkerGlobalReader: Provider = {
	id: 'bw-gr',
	name: 'BookWalker Global Preview',
	icon: '/images/providers/bw.svg',
	locale: 'en',
	colors: { primary: '#3498db', secondary: '#6db5e5' },
	priority: 5,
	enabled: true,
	ignoreErrors: true,
	supportsBookPages: true,
};

export const bookWalkerWayomi: Provider = {
	id: 'bw-wa',
	name: 'BookWalker Wayomi',
	icon: '/images/providers/bw.svg',
	locale: 'ja',
	colors: { primary: '#00a4e5', secondary: '#00a4e5' },
	priority: 6,
	enabled: false,
	volumePrefix: 'Chapter',
};

export const bookWalkerWayomiReader: Provider = {
	id: 'bw-war',
	name: 'BookWalker Wayomi Preview',
	icon: '/images/providers/bw.svg',
	locale: 'ja',
	colors: { primary: '#00a4e5', secondary: '#26bcfb' },
	priority: 7,
	enabled: false,
	ignoreErrors: true,
	supportsBookPages: true,
	volumePrefix: 'Chapter',
};

export const amazon: Provider = {
	id: 'amz',
	name: 'Amazon',
	icon: '/images/providers/amz.svg',
	locale: 'en',
	colors: { primary: '#ffa700', secondary: '#ffa700' },
	priority: 8,
	enabled: true,
	ignoreErrors: true,
};

export const amazonJapan: Provider = {
	id: 'amz-jp',
	name: 'Amazon Japan',
	icon: '/images/providers/amz.svg',
	locale: 'ja',
	colors: { primary: '#ffa700', secondary: '#fec254' },
	priority: 9,
	enabled: true,
	ignoreErrors: true,
};

export const amazonItaly: Provider = {
	id: 'amz-it',
	name: 'Amazon Italy',
	icon: '/images/providers/amz.svg',
	locale: 'it',
	colors: { primary: '#ffa700', secondary: '#fec254' },
	priority: 10,
	enabled: false,
	ignoreErrors: true,
};

export const amazonSpain: Provider = {
	id: 'amz-es',
	name: 'Amazon Spain',
	icon: '/images/providers/amz.svg',
	locale: 'es',
	colors: { primary: '#ffa700', secondary: '#fec254' },
	priority: 11,
	enabled: false,
	ignoreErrors: true,
};

export const amazonMexico: Provider = {
	id: 'amz-mx',
	name: 'Amazon Mexico',
	icon: '/images/providers/amz.svg',
	locale: 'es-mx',
	colors: { primary: '#ffa700', secondary: '#fec254' },
	priority: 12,
	enabled: false,
	ignoreErrors: true,
};

export const amazonGermany: Provider = {
	id: 'amz-de',
	name: 'Amazon Germany',
	icon: '/images/providers/amz.svg',
	locale: 'de',
	colors: { primary: '#ffa700', secondary: '#fec254' },
	priority: 13,
	enabled: false,
	ignoreErrors: true,
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

const allProviders: Provider[] = [
	bookLive,
	bookWalker,
	bookWalkerReader,
	bookWalkerGlobal,
	bookWalkerGlobalReader,
	bookWalkerWayomi,
	bookWalkerWayomiReader,
	amazon,
	amazonJapan,
	amazonItaly,
	amazonSpain,
	amazonMexico,
	amazonGermany,
	eBookJapan,
	cmoa,
	aladin,
];

export default allProviders.sort((a, b) => a.priority - b.priority);
