import { SvelteURLSearchParams } from 'svelte/reactivity';
import type { Component } from 'svelte';
import { fileTypeFromBuffer } from 'file-type';
import WsrvApi from './apis/wsrv.ts';
import { Us, Jp, De, It, Es, Mx, Kr, Tw, Gb, Nl, Fr } from 'svelte-flags';

export interface ImageInfo {
	format: string;
	width: number;
	height: number;
	chromaSubsampling: string | undefined;
}

export const wsrvApi = new WsrvApi();

export function natsort(a: string, b: string) {
	return a.localeCompare(b, undefined, {
		numeric: true,
		sensitivity: 'base',
	});
}

export function unfocusAndExecute(callback: () => void) {
	(document.activeElement as HTMLElement | undefined)?.blur();
	callback();
}

export function getSvelteSearchParam(param: string): string | null {
	const searchParams = new SvelteURLSearchParams(window.location.search);
	return searchParams.get(param);
}

export function getAllSvelteSearchParams(param: string): string[] {
	const searchParams = new SvelteURLSearchParams(window.location.search);
	return searchParams.getAll(param);
}

export function setSvelteSearchParam(param: string, value: string): void {
	const searchParams = new SvelteURLSearchParams(window.location.search);
	searchParams.set(param, value);
	window.history.replaceState(null, '', `${window.location.pathname}?${searchParams}`);
}

export function appendSvelteSearchParam(param: string, value: string, check: boolean = true): void {
	const searchParams = new SvelteURLSearchParams(window.location.search);
	if (check && searchParams.has(param, value)) return;
	searchParams.append(param, value);
	window.history.replaceState(null, '', `${window.location.pathname}?${searchParams}`);
}

export function removeSvelteSearchParam(param: string, value?: string): void {
	const searchParams = new SvelteURLSearchParams(window.location.search);
	searchParams.delete(param, value);
	window.history.replaceState(null, '', `${window.location.pathname}?${searchParams}`);
}

export function hasSvelteSearchParam(param: string, value?: string): boolean {
	const searchParams = new SvelteURLSearchParams(window.location.search);
	return searchParams.has(param, value);
}

export function filterFilename(
	name: string,
	options?: {
		replaceString?: string;
		isPath?: boolean;
	}
): string {
	const replaceString = options?.replaceString || '_';
	const isPath = !!options?.isPath;

	const extensionRegex = /\.[a-z0-9]+$/i;
	const extension = name.trim().match(extensionRegex)?.pop() || '';

	const filter = (str: string, removeExtension = true) =>
		str
			.trim()
			.replace(removeExtension ? extensionRegex : '', '')
			.normalize('NFKC')
			.replace(/[\\/:"*?<>|]/g, replaceString)
			.trim()
			.slice(0, 255 - extension.length)
			.trim();

	const pathParts = name.split(/[\\/]/g);
	const filename = isPath
		? pathParts.map((p, i) => filter(p, i === pathParts.length - 1)).join('/')
		: filter(name);

	return filename + extension;
}

export function addKeyboardShortcut(keyCodes: string[], callback: () => void): () => void {
	const pressedKeys = new Set<string>();
	const sortedKeyCodes = [...keyCodes].sort().join(',');

	const keyDown = (event: KeyboardEvent) => {
		pressedKeys.add(event.code);
		if ([...pressedKeys].sort().join(',') === sortedKeyCodes) {
			event.preventDefault();
			callback();
		}
	};

	const keyUp = (event: KeyboardEvent) => pressedKeys.delete(event.code);

	window.addEventListener('keydown', keyDown);
	window.addEventListener('keyup', keyUp);

	return () => {
		window.removeEventListener('keydown', keyDown);
		window.removeEventListener('keyup', keyUp);
	};
}

export function addKeyHold(
	keyCodes: string[],
	{
		onStart,
		onEnd,
		interval = 100,
	}: { onStart: () => void; onEnd?: () => void; interval?: number | 'once' }
): () => void {
	const pressedKeys = new Set<string>();
	const sortedKeyCodes = [...keyCodes].sort().join(',');
	let intervalId: number | null = null;
	let active = false;

	const isComboActive = () => [...pressedKeys].sort().join(',') === sortedKeyCodes;

	const start = () => {
		if (active) return;
		active = true;
		onStart();
		if (interval !== 'once') intervalId = window.setInterval(onStart, interval);
	};

	const stop = () => {
		if (!active) return;
		active = false;
		if (intervalId !== null) {
			window.clearInterval(intervalId);
			intervalId = null;
		}
		onEnd?.();
	};

	const keyDown = (event: KeyboardEvent) => {
		pressedKeys.add(event.code);
		if (isComboActive()) start();
	};

	const keyUp = (event: KeyboardEvent) => {
		pressedKeys.delete(event.code);
		if (!isComboActive()) stop();
	};

	window.addEventListener('keydown', keyDown);
	window.addEventListener('keyup', keyUp);

	return () => {
		stop();
		window.removeEventListener('keydown', keyDown);
		window.removeEventListener('keyup', keyUp);
	};
}

export function getTextVariableName(name: string): string {
	return `%${name}%`;
}

export function replaceTextVariables(text: string, variables: [string, string][]) {
	return variables.reduce(
		(acc, [key, value]) => acc.replaceAll(getTextVariableName(key), value),
		text
	);
}

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getLocaleName(locale: string): string {
	const langDisplayNames = new Intl.DisplayNames(['en'], { type: 'language' });
	return langDisplayNames.of(locale) || locale;
}

export function langToFlag(lang: string): Component | undefined {
	switch (lang) {
		case 'en':
		case 'en-US':
			return Us;
		case 'en-GB':
			return Gb;
		case 'ja':
			return Jp;
		case 'de':
			return De;
		case 'it':
			return It;
		case 'es':
			return Es;
		case 'es-MX':
			return Mx;
		case 'ko':
			return Kr;
		case 'zh-TW':
			return Tw;
		case 'nl':
			return Nl;
		case 'fr':
			return Fr;
		default:
			return undefined;
	}
}

function parseJpegChromaSubsampling(bytes: Uint8Array): string | undefined {
	if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return undefined; // not JPEG

	let i = 2;
	while (i + 3 < bytes.length) {
		if (bytes[i] !== 0xff) break;

		const marker = bytes[i + 1];
		const segLen = (bytes[i + 2] << 8) | bytes[i + 3];

		// SOF0, SOF1, SOF2
		if (marker >= 0xc0 && marker <= 0xc2) {
			// SOF layout: FF Cx [len 2] [precision 1] [height 2] [width 2] [nComponents 1]
			//             then per component: [id 1] [samplingFactors 1] [qtable 1]
			const nComponents = bytes[i + 9];
			if (nComponents < 3) return undefined;

			const comp: Array<{ h: number; v: number }> = [];
			for (let c = 0; c < nComponents; c++) {
				const sf = bytes[i + 10 + c * 3 + 1];
				comp.push({ h: (sf >> 4) & 0xf, v: sf & 0xf });
			}

			const yH = comp[0].h,
				yV = comp[0].v;
			const cbH = comp[1].h,
				cbV = comp[1].v;

			if (cbH === yH && cbV === yV) return '4:4:4';
			if (cbH === yH / 2 && cbV === yV) return '4:2:2';
			if (cbH === yH / 2 && cbV === yV / 2) return '4:2:0';
			return undefined;
		}

		i += 2 + segLen;
	}

	return undefined;
}

async function getImageInfoLocally(url: string): Promise<ImageInfo> {
	const res = await fetch(url);
	const buffer = await res.arrayBuffer();
	const bytes = new Uint8Array(buffer);

	const fileType = await fileTypeFromBuffer(bytes);
	if (!fileType || !fileType.mime.startsWith('image/')) {
		throw new Error(`Not a valid image: ${fileType?.mime ?? 'unknown'}`);
	}

	const bitmap = await createImageBitmap(new Blob([buffer], { type: fileType.mime }));
	const { width, height } = bitmap;
	bitmap.close();

	const format = fileType.ext === 'jpg' ? 'jpeg' : fileType.ext;
	const chromaSubsampling = format === 'jpeg' ? parseJpegChromaSubsampling(bytes) : undefined;

	return { format, width, height, chromaSubsampling };
}

export async function getImageInfo(url: string): Promise<ImageInfo> {
	try {
		const res = await wsrvApi.getInfo(url);
		return {
			format: res.format,
			width: res.width,
			height: res.height,
			chromaSubsampling: res.chromaSubsampling || undefined,
		};
	} catch {
		return getImageInfoLocally(url);
	}
}
