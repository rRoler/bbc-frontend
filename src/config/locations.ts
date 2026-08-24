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

export interface DockLocation {
	path: string;
	Icon: typeof Icon;
	label: string;
	storageKey?: string;
	onclick?: () => void;
}

export const homeLocation: DockLocation = {
	path: '/',
	Icon: House,
	label: 'Home',
};

export const searchLocation: DockLocation = {
	path: '/search',
	Icon: Search,
	label: 'Search',
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
	storageKey: 'last_download_page',
};

export const settingsLocation: DockLocation = {
	path: '/settings',
	Icon: Settings,
	label: 'Settings',
};

export const aboutLocation: DockLocation = {
	path: '/about',
	Icon: Info,
	label: 'About',
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
};

export const discoveryLocation: DockLocation = {
	path: '/discovery',
	Icon: Compass,
	label: 'Discovery',
};

export const discoverySearchLocation: DockLocation = {
	path: `${discoveryLocation.path}/search`,
	Icon: Search,
	label: 'Discovery Search',
};

export const discoverySeriesMergedLocation: DockLocation = {
	path: `${discoveryLocation.path}/series/merged`,
	Icon: Library,
	label: 'Newly Merged Series',
};

export const discoverySeriesNewLocation: DockLocation = {
	path: `${discoveryLocation.path}/series/new`,
	Icon: Library,
	label: 'Recently Added Series',
};

export const discoveryBooksNewLocation: DockLocation = {
	path: `${discoveryLocation.path}/books/new`,
	Icon: BookOpen,
	label: 'Recently Added Books',
};

export const discoveryBooksReleasedLocation: DockLocation = {
	path: `${discoveryLocation.path}/books/released`,
	Icon: BookOpen,
	label: 'Recently Released Books',
};

export const seriesLocation: DockLocation = {
	path: '/series',
	Icon: Library,
	label: 'Series',
};

export const dockLocations: DockLocation[] = [
	searchLocation,
	discoveryLocation,
	downloadLocation,
	aboutLocation,
	settingsLocation,
];
