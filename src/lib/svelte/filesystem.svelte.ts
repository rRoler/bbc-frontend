import { get, set, del } from 'idb-keyval';

export type Platform = 'desktop-browser' | 'twa' | 'mobile-browser' | 'ssr';

export function detectPlatform(): Platform {
	if (typeof window === 'undefined') return 'ssr';

	const ua = navigator.userAgent;
	const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

	if (!isMobile) return 'desktop-browser';

	const isTWA = document.referrer.startsWith('android-app://') || 'AndroidFS' in window;

	return isTWA ? 'twa' : 'mobile-browser';
}

export type BrowserSupport = {
	supported: boolean;
	platform: Platform;
	missing: 'showDirectoryPicker' | 'indexedDB' | 'androidBridge' | null;
	reason: string | null;
};

export function checkBrowserSupport(): BrowserSupport {
	const platform = detectPlatform();

	if (platform === 'ssr') {
		return {
			supported: false,
			platform,
			missing: null,
			reason: 'Running in a non-browser environment (SSR).',
		};
	}

	if (platform === 'mobile-browser') {
		return {
			supported: false,
			platform,
			missing: null,
			reason: 'File system access is not available in mobile browsers. Use the native app.',
		};
	}

	if (platform === 'twa') {
		if (!window.AndroidFS) {
			return {
				supported: false,
				platform,
				missing: 'androidBridge',
				reason: 'Android file bridge (window.AndroidFS) was not injected by the TWA host.',
			};
		}
		return { supported: true, platform, missing: null, reason: null };
	}

	if (!('indexedDB' in window)) {
		return {
			supported: false,
			platform,
			missing: 'indexedDB',
			reason: 'IndexedDB is not available in this browser.',
		};
	}
	if (!('showDirectoryPicker' in window)) {
		return {
			supported: false,
			platform,
			missing: 'showDirectoryPicker',
			reason: 'File System Access API is not supported. Use Chrome or Edge on desktop.',
		};
	}

	return { supported: true, platform, missing: null, reason: null };
}

declare global {
	interface Window {
		AndroidFS?: {
			pickFolder(): string;
			writeFile(
				folderUri: string,
				relativePath: string,
				base64Data: string,
				mimeType: string
			): string;
			requestPermission(folderUri: string): string;
			clearFolder(folderUri: string): void;
		};

		showDirectoryPicker(options?: {
			id?: string;
			mode?: 'read' | 'readwrite';
			startIn?:
				| 'desktop'
				| 'documents'
				| 'downloads'
				| 'music'
				| 'pictures'
				| 'videos'
				| FileSystemDirectoryHandle;
		}): Promise<FileSystemDirectoryHandle>;
	}
}

export class FileSystem {
	get support(): BrowserSupport {
		return checkBrowserSupport();
	}
	get supported(): boolean {
		return this.support.supported;
	}
	get platform(): Platform {
		return this.support.platform;
	}

	#desktopHandle = $state<FileSystemDirectoryHandle | null>(null);

	#twaUri = $state<string | null>(null);
	#twaName = $state<string | null>(null);

	get folderName(): string | null {
		return this.platform === 'twa' ? this.#twaName : (this.#desktopHandle?.name ?? null);
	}

	get hasFolder(): boolean {
		return this.platform === 'twa' ? this.#twaUri !== null : this.#desktopHandle !== null;
	}

	async restore(): Promise<void> {
		if (!this.supported) return;

		if (this.platform === 'twa') {
			const saved = await get<{ uri: string; name: string }>('twaDownloadDir');
			if (!saved) return;
			this.#twaUri = saved.uri;
			this.#twaName = saved.name;
		} else {
			const saved = await get<FileSystemDirectoryHandle>('downloadDir');
			if (!saved) return;
			this.#desktopHandle = saved;
		}
	}

	async pickFolder(): Promise<void> {
		if (!this.supported) throw new Error(this.support.reason ?? 'File system not supported.');

		if (this.platform === 'twa') {
			const raw = window.AndroidFS!.pickFolder();
			const result = JSON.parse(raw) as { uri: string; name: string } | null;
			if (!result) throw new Error('Folder selection was cancelled.');
			await set('twaDownloadDir', result);
			this.#twaUri = result.uri;
			this.#twaName = result.name;
		} else {
			const h = await window.showDirectoryPicker({ mode: 'readwrite' });
			await set('downloadDir', h);
			this.#desktopHandle = h;
		}
	}

	async clearFolder(): Promise<void> {
		if (this.platform === 'twa') {
			if (this.#twaUri) window.AndroidFS?.clearFolder(this.#twaUri);
			await del('twaDownloadDir');
			this.#twaUri = null;
			this.#twaName = null;
		} else {
			await del('downloadDir');
			this.#desktopHandle = null;
		}
	}

	async requestPermission(): Promise<boolean> {
		if (this.platform === 'twa') {
			if (!this.#twaUri) return false;
			const { granted } = JSON.parse(window.AndroidFS!.requestPermission(this.#twaUri)) as {
				granted: boolean;
			};
			return granted;
		}

		if (!this.#desktopHandle) return false;
		const perm = await this.#desktopHandle.queryPermission({ mode: 'readwrite' });
		if (perm === 'granted') return true;
		return (await this.#desktopHandle.requestPermission({ mode: 'readwrite' })) === 'granted';
	}

	async writeFile(path: string, data: Blob | ArrayBuffer | string): Promise<void> {
		if (!this.supported) throw new Error(this.support.reason ?? 'File system not supported.');
		if (!(await this.requestPermission())) throw new Error('Permission denied.');

		if (this.platform === 'twa') {
			if (!this.#twaUri) throw new Error('No folder selected.');

			const mimeType =
				data instanceof Blob ? data.type || 'application/octet-stream' : 'application/octet-stream';
			const base64 = await toBase64(data);

			const result = JSON.parse(
				window.AndroidFS!.writeFile(this.#twaUri, path, base64, mimeType)
			) as { success: boolean; error?: string };

			if (!result.success) throw new Error(result.error ?? 'Write failed on the Android side.');
			return;
		}

		if (!this.#desktopHandle) throw new Error('No folder selected.');

		const segments = path.split('/').filter(Boolean);
		const filename = segments.pop()!;
		const dir = segments.length ? await this.#getSubdir(segments.join('/')) : this.#desktopHandle;

		const fileH = await dir.getFileHandle(filename, { create: true });
		const writable = await fileH.createWritable();
		await writable.write(data);
		await writable.close();
	}

	async #getSubdir(path: string): Promise<FileSystemDirectoryHandle> {
		if (!this.#desktopHandle) throw new Error('No folder selected.');
		const segments = path.split('/').filter(Boolean);
		let dir: FileSystemDirectoryHandle = this.#desktopHandle;
		for (const segment of segments) {
			dir = await dir.getDirectoryHandle(segment, { create: true });
		}
		return dir;
	}
}

async function toBase64(data: Blob | ArrayBuffer | string): Promise<string> {
	const blob =
		data instanceof Blob
			? data
			: new Blob([typeof data === 'string' ? new TextEncoder().encode(data) : data]);

	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve((reader.result as string).split(',')[1]);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}
