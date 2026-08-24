export interface WsrvOptions {
	default?: string | false;
	output?: 'jpg' | 'png' | 'gif' | 'tiff' | 'webp' | 'json';
	quality?: number;
	width?: number;
	height?: number;
	cx?: number;
	cy?: number;
	cw?: number;
	ch?: number;
}

interface WsrvJsonResult {
	format: string;
	width: number;
	height: number;
	space: string;
	channels: number;
	depth: string;
	density: number;
	chromaSubsampling: string;
	isProgressive: boolean;
	isPalette: boolean;
	hasProfile: boolean;
	hasAlpha: boolean;
	orientation: number;
}

export default class WsrvApi {
	apiUrl = 'https://wsrv.nl';

	getUrl(url: string | URL, options?: WsrvOptions): URL {
		const apiUrl = new URL(this.apiUrl);

		apiUrl.searchParams.append('url', url.toString());
		if (options?.default) apiUrl.searchParams.append('default', options.default);
		else if (options?.default === undefined) apiUrl.searchParams.append('default', url.toString());
		if (options?.output) apiUrl.searchParams.append('output', options.output);
		if (options?.quality && ['jpg', 'tiff', 'webp'].includes(options.output || 'jpg')) {
			if (options.quality < 1) options.quality = 1;
			if (options.quality > 100) options.quality = 100;
			apiUrl.searchParams.append('q', options.quality.toString());
		}
		if (options?.width) apiUrl.searchParams.append('width', options.width.toString());
		if (options?.height) apiUrl.searchParams.append('height', options.height.toString());
		if (options?.cx) apiUrl.searchParams.append('cx', options.cx.toString());
		if (options?.cy) apiUrl.searchParams.append('cy', options.cy.toString());
		if (options?.cw) apiUrl.searchParams.append('cw', options.cw.toString());
		if (options?.ch) apiUrl.searchParams.append('ch', options.ch.toString());

		return apiUrl;
	}

	async getInfo(url: string | URL): Promise<WsrvJsonResult> {
		const res = await fetch(this.getUrl(url, { output: 'json' }));
		return res.json();
	}
}
