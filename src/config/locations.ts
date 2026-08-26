import {
	Download,
	Info,
	Search,
	Settings,
	FolderGit2,
	Heart,
	SquareActivity,
	Compass,
	House,
	Library,
	BookOpen,
	type Icon,
} from 'lucide-svelte';
import { SITE_NAME } from '../utils/meta';

export interface DockLocation {
	path: string;
	Icon: typeof Icon;
	label: string;
	description?: string;
	storageKey?: string;
	onclick?: () => void;
}

export const homeLocation: DockLocation = {
	path: '/',
	Icon: House,
	label: 'Home',
	description: `${SITE_NAME} is a searchable database of high-resolution manga, light novel and book covers you can preview and download for your collections, trackers and reading apps.`,
};

export const searchLocation: DockLocation = {
	path: '/search',
	Icon: Search,
	label: 'Search',
	description:
		'Search thousands of high-resolution manga, light novel and book covers by title, author or series, then download them instantly.',
	storageKey: 'last_search_page',
	onclick: () => {
		const searchInput = document.querySelector<HTMLInputElement>(
			'#mobile-app-content input[type="search"]'
		);
		if (searchInput) searchInput.focus();
	},
};

export const downloadLocation: DockLocation = {
	path: '/download',
	Icon: Download,
	label: 'Download',
	description:
		'Download high-resolution manga, light novel and book covers in your preferred format and size for use in trackers and reading apps.',
	storageKey: 'last_download_page',
};

export const settingsLocation: DockLocation = {
	path: '/settings',
	Icon: Settings,
	label: 'Settings',
	description: `Manage your ${SITE_NAME} preferences, including theme, providers and how covers are downloaded.`,
};

export const aboutLocation: DockLocation = {
	path: '/about',
	Icon: Info,
	label: 'About',
	description: `Learn what ${SITE_NAME} is, why it exists and how it helps you organize high-resolution book covers.`,
};

export const sourceCodeLocation: DockLocation = {
	path: 'https://github.com/rRoler/bbc-frontend',
	Icon: FolderGit2,
	label: 'Source Code',
};

export const donationLocation: DockLocation = {
	path: 'https://roler.dev/support',
	Icon: Heart,
	label: 'Support Me',
};

export const statusLocation: DockLocation = {
	path: '/status',
	Icon: SquareActivity,
	label: 'Status Page',
	description: `Check the current status and uptime of ${SITE_NAME} services.`,
};

export const discoveryLocation: DockLocation = {
	path: '/discovery',
	Icon: Compass,
	label: 'Discovery',
	description: `Discover newly added and recently released manga, light novels and book series across providers on ${SITE_NAME}.`,
};

export const discoverySearchLocation: DockLocation = {
	path: `${discoveryLocation.path}/search`,
	Icon: Search,
	label: 'Discovery Search',
	description: `Search across providers to discover manga, light novels and books along with their cover art on ${SITE_NAME}.`,
};

export const discoverySeriesMergedLocation: DockLocation = {
	path: `${discoveryLocation.path}/series/merged`,
	Icon: Library,
	label: 'Newly Merged Series',
	description: `Browse book series that were recently merged across providers on ${SITE_NAME}.`,
};

export const discoverySeriesNewLocation: DockLocation = {
	path: `${discoveryLocation.path}/series/new`,
	Icon: Library,
	label: 'Recently Added Series',
	description: `Browse manga, light novel and book series that were recently added across providers on ${SITE_NAME}.`,
};

export const discoveryBooksNewLocation: DockLocation = {
	path: `${discoveryLocation.path}/books/new`,
	Icon: BookOpen,
	label: 'Recently Added Books',
	description: `Browse books that were recently added across providers on ${SITE_NAME}.`,
};

export const discoveryBooksReleasedLocation: DockLocation = {
	path: `${discoveryLocation.path}/books/released`,
	Icon: BookOpen,
	label: 'Recently Released Books',
	description: `Browse books that were recently released across providers on ${SITE_NAME}.`,
};

export const seriesLocation: DockLocation = {
	path: '/series',
	Icon: Library,
	label: 'Series',
	description: `View high-resolution covers, metadata and provider links for a book series on ${SITE_NAME}.`,
};

export const dockLocations: DockLocation[] = [
	searchLocation,
	discoveryLocation,
	downloadLocation,
	aboutLocation,
	settingsLocation,
];
