import { Download, Info, Search, Settings, FolderGit2, Heart, type Icon } from 'lucide-svelte';

interface DockLocation {
	path: string;
	Icon: typeof Icon;
	label: string;
	storageKey?: string;
}

export const searchLocation: DockLocation = {
	path: '/search',
	Icon: Search,
	label: 'Search',
	storageKey: 'last_search_page',
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

export const dockLocations: DockLocation[] = [
	searchLocation,
	downloadLocation,
	settingsLocation,
	aboutLocation,
];
