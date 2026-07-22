import { unzipSync } from 'fflate';
import allProviders, { type Provider } from '../svelte/providers.svelte.ts';
import userState from '../svelte/user.svelte.ts';
import { BBC_API_URL } from '../constants.ts';

export class BBC_API_Error extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BBC_API_Error';
	}
}

export interface BBCResponse<T> {
	data: Record<string, T[]>;
	count: number;
	pages?: number;
	error?: string;
}

export interface BBCResult<T> {
	data: Record<string, T[]>;
	count: number;
	pages: number;
	errors: Error[];
}

export interface BBCSeries {
	id: string;
	url: string;
	type: 'series' | 'book';
	title: string;
	thumbnail: string;
	bookType?: 'manga' | 'novel' | 'webtoon' | 'audiobook';
	publicationType?: 'physical' | 'digital';
	isMature: boolean;
	description?: string;
	authors?: string[];
	artists?: string[];
	publisher?: string;
	status?: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
	tags?: string[];
	lastUpdated?: string;
	rating?: number;
	ratingCount?: number;
	language?: string;
	translator?: string[];
	format?: 'epub' | 'fixed-layout' | 'webtoon' | 'pdf' | 'audiobook';
	readingDirection?: 'rtl' | 'ltr';
	bookCount?: number;
	chapterCount?: number;
	magazine?: string;
	genre?: string;
	titleKana?: string;
}

export interface BBCBook {
	id: string;
	url: string;
	title: string;
	cover: string;
	coverFallbacks?: string[];
	volume: { type: 'volume' | 'chapter'; number: string | null };
	seriesId: string | null;
	description?: string;
	authors?: string[];
	artists?: string[];
	publisher?: string;
	releaseDate?: string;
	isbn?: string;
	price?: number;
	currency?: string;
	pageCount?: number;
	tags?: string[];
	rating?: number;
	ratingCount?: number;
	language?: string;
	translator?: string[];
	format?: 'epub' | 'fixed-layout' | 'webtoon' | 'pdf' | 'audiobook';
	originalPrice?: number;
	fileSize?: string;
}

export interface BBCBookPage {
	number: number;
	url: string;
	type: string | null;
	height: number | null;
	width: number | null;
	bookId: string;
}

export interface StatusEndpointResult {
	endpoint: string;
	ok: boolean;
	latencyMs: number;
	empty?: boolean;
	error?: string;
}

export type BBCSort = 'asc' | 'desc';

export const endpointKeys = [
	'search',
	'series',
	'series-books',
	'book',
	'book-pages',
	'zip',
] as const;
export type ProviderEndpoint = (typeof endpointKeys)[number];

export interface ProviderStatus {
	providerEndpoint: string;
	status: boolean;
	statusText: string;
	latencyMs: number;
	clientError?: boolean;
}

export const endpointLabels: Record<ProviderEndpoint, string> = {
	search: 'Search',
	series: 'Series',
	'series-books': 'Series Books',
	book: 'Book',
	'book-pages': 'Book Pages',
	zip: 'Cover Zip',
};

export default class BBC_API {
	readonly apiUrl = BBC_API_URL.origin;
	readonly bookPagesMaxCount = 12;
	readonly zipMaxCount = 6;

	chopArray<T>(array: T[], chunkSize: number): T[][] {
		const result: T[][] = [];

		for (let i = 0; i < array.length; i += chunkSize) {
			result.push(array.slice(i, i + chunkSize));
		}

		return result;
	}

	async search(
		query: string,
		providers: Provider[] = allProviders.updated,
		options?: {
			include_mature?: boolean;
			callback?: (result: BBCResult<BBCSeries>) => void;
			abortSignal?: AbortController['signal'];
		}
	): Promise<BBCResult<BBCSeries>> {
		const allData: BBCResult<BBCSeries> = { data: {}, count: 0, pages: 0, errors: [] };

		await Promise.all(
			providers.map(async (provider) => {
				const searchUrl = new URL(`${this.apiUrl}/search`);

				searchUrl.searchParams.set('q', query);
				searchUrl.searchParams.append('provider', provider.id);
				searchUrl.searchParams.append('include_mature', options?.include_mature ? 'true' : 'false');

				try {
					const res = await fetch(searchUrl, { signal: options?.abortSignal });
					const data: BBCResponse<BBCSeries> = await res.json();

					if (!allData.data[provider.id]) allData.data[provider.id] = [];

					if (data.error) {
						allData.errors.push(new BBC_API_Error(`${provider.name}: ${data.error}`));
					} else {
						allData.data[provider.id].push(...(data.data[provider.id] || []));
						allData.count += data.count;
					}
				} catch (e) {
					allData.errors.push(new BBC_API_Error(`${provider.name}: ${e}`));
				} finally {
					if (!allData.data[provider.id]) allData.data[provider.id] = [];
					if (!options?.abortSignal?.aborted && options?.callback) options.callback(allData);
				}
			})
		);

		if (!options?.abortSignal?.aborted && options?.callback) options.callback(allData);

		return allData;
	}

	async getSeries(
		seriesIds: Record<string, string[]>,
		bookIds?: Record<string, string[]>
	): Promise<BBCResult<BBCSeries>> {
		const allData: BBCResult<BBCSeries> = { data: {}, count: 0, pages: 0, errors: [] };

		try {
			const url = new URL(`${this.apiUrl}/series`);

			const appendSeriesIds = (seriesType: BBCSeries['type'], ids: Record<string, string[]>) =>
				Object.entries(ids).forEach(([providerId, sIds]) =>
					sIds.forEach((seriesId) =>
						url.searchParams.append(`${seriesType}(${providerId})`, seriesId)
					)
				);

			appendSeriesIds('series', seriesIds);
			if (bookIds) appendSeriesIds('book', bookIds);

			const res = await fetch(url);
			const data: BBCResponse<BBCSeries> = await res.json();

			if (data.error) {
				allData.errors.push(new BBC_API_Error(`${data.error}`));
			} else {
				allData.data = data.data;
				allData.count = data.count;
			}
		} catch (e) {
			allData.errors.push(new BBC_API_Error(`${e}`));
		}

		return allData;
	}

	async getBooks(
		seriesIds: Record<string, string[]>,
		bookIds: Record<string, string[]>,
		sort: BBCSort = 'desc',
		page: number = 1
	): Promise<BBCResult<BBCBook>> {
		const allData: BBCResult<BBCBook> = { data: {}, count: 0, pages: 0, errors: [] };

		const fetchAll = async (seriesType: BBCSeries['type'], ids: Record<string, string[]>) =>
			await Promise.all(
				Object.entries(ids).map(async ([providerId, sIds]) => {
					await Promise.all(
						sIds.map(async (seriesId) => {
							if (!allData.data[providerId]) allData.data[providerId] = [];

							const booksUrl = new URL(`${this.apiUrl}/books`);

							booksUrl.searchParams.set('sort', sort);
							booksUrl.searchParams.set('page', page.toString());
							booksUrl.searchParams.append(`${seriesType}(${providerId})`, seriesId);

							try {
								const res = await fetch(booksUrl);
								const data: BBCResponse<BBCBook> = await res.json();

								if (data.error) {
									allData.errors.push(new BBC_API_Error(`${providerId}: ${data.error}`));
								} else {
									allData.data[providerId].push(...(data.data[providerId] || []));
									allData.count += data.count;
									allData.pages = Math.max(allData.pages, data.pages || 1);
								}
							} catch (e) {
								allData.errors.push(new BBC_API_Error(`${providerId}: ${e}`));
							}
						})
					);
				})
			);

		await fetchAll('series', seriesIds);
		await fetchAll('book', bookIds);

		return allData;
	}

	async getBookPages(booksIds: Record<string, string[]>): Promise<BBCResult<BBCBookPage>> {
		const allData: BBCResult<BBCBookPage> = { data: {}, count: 0, pages: 0, errors: [] };

		await Promise.all(
			Object.entries(booksIds).map(async ([providerId, bIds]) => {
				const choppedIds = this.chopArray(bIds, this.bookPagesMaxCount);

				await Promise.all(
					choppedIds.map(async (chunk) => {
						if (!allData.data[providerId]) allData.data[providerId] = [];

						const pagesUrl = new URL(`${this.apiUrl}/pages`);

						for (const bookId of chunk) pagesUrl.searchParams.append(`book(${providerId})`, bookId);

						try {
							const res = await fetch(pagesUrl);
							const data: BBCResponse<BBCBookPage> = await res.json();

							if (data.error) {
								allData.errors.push(new BBC_API_Error(`${providerId}: ${data.error}`));
							} else {
								allData.data[providerId].push(...(data.data[providerId] || []));
								allData.count += data.count;
							}
						} catch (e) {
							allData.errors.push(new BBC_API_Error(`${providerId}: ${e}`));
						}
					})
				);
			})
		);

		return allData;
	}

	async getEndpointStatus(providerId: string, endpoint: ProviderEndpoint): Promise<ProviderStatus> {
		const res = await fetch(
			`${this.apiUrl}/status/${encodeURIComponent(providerId)}/${encodeURIComponent(endpoint)}`
		);
		if (!res.ok) {
			throw new BBC_API_Error(
				`Status check failed for "${providerId}/${endpoint}": ${res.statusText}`
			);
		}
		const data: StatusEndpointResult = await res.json();
		return {
			providerEndpoint: endpointLabels[endpoint] ?? `GET ${data.endpoint}`,
			status: data.ok,
			statusText: data.error || (data.empty ? 'No results' : 'Online'),
			latencyMs: data.latencyMs,
		};
	}

	async fetchProviders(bustCache?: boolean): Promise<Provider[]> {
		const url = `${this.apiUrl}/providers${bustCache ? `?t=${Date.now()}` : ''}`;
		const res = await fetch(url);
		if (!res.ok) {
			throw new BBC_API_Error(`Failed to fetch providers: HTTP ${res.status} ${res.statusText}`);
		}
		const { data } = (await res.json()) as {
			data: Array<Record<string, unknown> & { defaultPriority: number; enabledByDefault: boolean }>;
		};
		return data.map((p) => ({
			...p,
			priority: p.defaultPriority,
			enabled: p.enabledByDefault,
		})) as unknown as Provider[];
	}

	async getCovers(
		urls: string[],
		callback?: (progress: number) => void
	): Promise<(Uint8Array<ArrayBufferLike> | undefined)[]> {
		const allImages: (Uint8Array<ArrayBufferLike> | undefined)[] = new Array(urls.length);
		const choppedUrls = this.chopArray(urls, this.zipMaxCount);

		let progress = 0;

		await Promise.all(
			choppedUrls.map(async (chunk, chunkIndex) => {
				const zipUrl = new URL(`${this.apiUrl}/zip`);

				for (const url of chunk) zipUrl.searchParams.append('url', url);

				const response = await fetch(zipUrl);
				const zipBuffer = await response.arrayBuffer();
				const zip = new Uint8Array(zipBuffer);
				const unzipped = unzipSync(zip);

				const urlRootIndex = chunkIndex * this.zipMaxCount;

				for (const filename in unzipped) {
					const image = unzipped[filename];
					const originalIndex = urlRootIndex + (parseInt(filename.split('.')[0]) - 1);

					allImages[originalIndex] = image;
				}

				progress += chunk.length;

				callback?.(progress);
			})
		);

		return allImages;
	}

	async editBooks(books: { providerId: string; book: BBCBook }[]): Promise<BBCResult<BBCBook>> {
		const allData: BBCResult<BBCBook> = { data: {}, count: 0, pages: 0, errors: [] };
		const chunks = this.chopArray(books, 40);

		await Promise.all(
			chunks.map(async (chunk) => {
				try {
					const res = await fetch(`${this.apiUrl}/edit/books`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json', ...userState.headers },
						body: JSON.stringify({
							books: chunk.map(({ providerId, book }) => ({
								providerId,
								id: book.id,
								seriesId: book.seriesId,
								volume: { number: book.volume.number },
							})),
						}),
					});

					const { data } = await res.json();

					for (const f of data.failed) {
						allData.errors.push(new BBC_API_Error(`${f.providerId}/${f.id}: ${f.message}`));
					}
				} catch (e) {
					allData.errors.push(new BBC_API_Error(`${e}`));
				}
			})
		);

		return allData;
	}
}
