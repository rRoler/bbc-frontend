import { get, set, del } from 'idb-keyval';

export type BrowserSupport = {
	supported: boolean;
	missing: 'showDirectoryPicker' | 'indexedDB' | null;
	reason: string | null;
};

export function checkBrowserSupport(): BrowserSupport {
	if (typeof window === 'undefined') {
		return {
			supported: false,
			missing: null,
			reason: 'Running in a non-browser environment (SSR).',
		};
	}
	if (/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)) {
		return {
			supported: false,
			missing: 'showDirectoryPicker',
			reason:
				'Mobile browsers are not supported due to file system permission limitations. Use Chrome or Edge on desktop.',
		};
	}
	if (!('indexedDB' in window)) {
		return {
			supported: false,
			missing: 'indexedDB',
			reason: 'IndexedDB is not available in this browser.',
		};
	}
	if (!('showDirectoryPicker' in window)) {
		return {
			supported: false,
			missing: 'showDirectoryPicker',
			reason: 'File System Access API is not supported. Use Chrome or Edge on desktop.',
		};
	}
	return { supported: true, missing: null, reason: null };
}

export class FileSystem {
	readonly support = checkBrowserSupport();
	readonly supported = this.support.supported;

	handle = $state<FileSystemDirectoryHandle | null>(null);

	get folderName() {
		return this.handle?.name ?? null;
	}
	get hasFolder() {
		return this.handle !== null;
	}

	async restore(): Promise<void> {
		if (!this.supported) return;
		const saved = await get<FileSystemDirectoryHandle>('downloadDir');
		if (!saved) return;
		this.handle = saved;
	}

	async pickFolder(): Promise<FileSystemDirectoryHandle> {
		const h = await window.showDirectoryPicker({ mode: 'readwrite' });
		await set('downloadDir', h);
		this.handle = h;
		return h;
	}

	async clearFolder(): Promise<void> {
		await del('downloadDir');
		this.handle = null;
	}

	async requestPermission(): Promise<boolean> {
		if (!this.handle) return false;
		const perm = await this.handle.queryPermission({ mode: 'readwrite' });
		if (perm === 'granted') return true;
		return (await this.handle.requestPermission({ mode: 'readwrite' })) === 'granted';
	}

	async writeFile(path: string, data: Blob | ArrayBuffer | string): Promise<void> {
		const segments = path.split('/').filter(Boolean);
		const filename = segments.pop()!;
		const dir = segments.length ? await this.#getSubdir(segments.join('/')) : this.handle!;
		if (!this.handle) throw new Error('No folder selected.');
		if (!(await this.requestPermission())) throw new Error('Permission denied.');
		const fileH = await dir.getFileHandle(filename, { create: true });
		const writable = await fileH.createWritable();
		await writable.write(data);
		await writable.close();
	}

	async #getSubdir(path: string): Promise<FileSystemDirectoryHandle> {
		if (!this.handle) throw new Error('No folder selected.');
		if (!(await this.requestPermission())) throw new Error('Permission denied.');
		const segments = path.split('/').filter(Boolean);
		let dir: FileSystemDirectoryHandle = this.handle;
		for (const segment of segments) {
			dir = await dir.getDirectoryHandle(segment, { create: true });
		}
		return dir;
	}
}
