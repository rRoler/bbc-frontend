import type { Icon } from 'lucide-svelte';
import { Download, Info, Search, Settings } from 'lucide-svelte';

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

export const dockLocations: DockLocation[] = [
	searchLocation,
	downloadLocation,
	settingsLocation,
	aboutLocation,
];
