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

export interface BBCByProviderResponse<T> {
	data: Record<string, T[]>;
	count: number;
	pages?: number;
	error?: string;
}

export interface BBCListResponse<T> {
	data: T[];
	count: number;
	pages?: number;
	error?: string;
}

export interface BBCByProviderResult<T> {
	data: Record<string, T[]>;
	count: number;
	pages: number;
	errors: Error[];
}

export interface BBCListResult<T> {
	data: T[];
	count: number;
	pages: number;
	errors: Error[];
}

export interface BBCSeries {
	id: string;
	providerId: string;
	url: string;
	type: 'series' | 'book';
	title: string;
	thumbnail: string | null;
	bookType: 'manga' | 'novel' | 'webtoon' | 'audiobook' | null;
	publicationType: 'physical' | 'digital' | null;
	isMature: boolean;
	description: string | null;
	authors: string[] | null;
	artists: string[] | null;
	publisher: string | null;
	status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled' | null;
	tags: string[] | null;
	lastUpdated: string | null;
	rating: number | null;
	ratingCount: number | null;
	language: string | null;
	translator: string[] | null;
	format: 'epub' | 'fixed-layout' | 'webtoon' | 'pdf' | 'audiobook' | null;
	readingDirection: 'rtl' | 'ltr' | null;
	bookCount: number | null;
	chapterCount: number | null;
	magazine: string | null;
	genre: string | null;
	altTitles: string[] | null;
	alId: string | null;
	apId: string | null;
	muId: string | null;
	nuId: string | null;
	ktId: string | null;
	malId: string | null;
	mbId: string | null;
	shikiId: string | null;
}

export interface BBCSeriesDetail extends BBCSeries {
	mappedId: string | null;
	mappedBy: string | null;
	mappedAt: string | null;
	mergedProviders?: string[] | null;
	lastFetchedAt: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	editedBy: string | null;
	lastEditedAt: string | null;
}

export interface BBCBook {
	id: string;
	providerId: string;
	url: string;
	title: string;
	cover: string;
	coverFallbacks: string[] | null;
	volume: { type: 'volume' | 'chapter'; number: string | null };
	seriesId: string | null;
	description: string | null;
	authors: string[] | null;
	artists: string[] | null;
	publisher: string | null;
	releaseDate: string | null;
	isbn: string | null;
	price: number | null;
	currency: string | null;
	isMature?: boolean;
	pageCount: number | null;
	tags: string[] | null;
	rating: number | null;
	ratingCount: number | null;
	language: string | null;
	translator: string[] | null;
	format: 'epub' | 'fixed-layout' | 'webtoon' | 'pdf' | 'audiobook' | null;
	originalPrice: number | null;
	fileSize: number | null;
	bookType: BBCSeries['bookType'];
	publicationType: BBCSeries['publicationType'];
}

export interface BBCBookDetail extends BBCBook {
	lastFetchedAt: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	editedBy: string | null;
	lastEditedAt: string | null;
}

export interface BBCSeriesSearchResult {
	id: BBCSeries['id'];
	providerId: BBCSeries['providerId'];
	url: BBCSeries['url'];
	type: BBCSeries['type'];
	title: BBCSeries['title'];
	thumbnail: BBCSeries['thumbnail'];
	mappedId?: string | null;
	mergedProviders?: string[];
	bookType: BBCSeries['bookType'];
	publicationType: BBCSeries['publicationType'];
	isMature: BBCSeries['isMature'];
	language: BBCSeries['language'];
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

export interface BBCProvider {
	id: string;
	name: string;
	icon: string;
	locale: string;
	colors: { primary: string; secondary: string };
	supportedEndpoints: ProviderEndpoint[];
	enabledByDefault: boolean;
	defaultPriority: number;
	volumePrefix: string | null;
	ignoreErrors: boolean;
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
	readonly editMaxCount = 40;

	chopArray<T>(array: T[], chunkSize: number): T[][] {
		const result: T[][] = [];

		for (let i = 0; i < array.length; i += chunkSize) {
			result.push(array.slice(i, i + chunkSize));
		}

		return result;
	}

	async search<D extends boolean = false>(
		query: string,
		providers: Provider[] = allProviders.updated,
		options?: {
			detail?: D;
			include_mature?: boolean;
			callback?: (
				result: BBCByProviderResult<D extends true ? BBCSeriesDetail : BBCSeriesSearchResult>
			) => void;
			abortSignal?: AbortController['signal'];
		}
	): Promise<BBCByProviderResult<D extends true ? BBCSeriesDetail : BBCSeriesSearchResult>> {
		type Result = D extends true ? BBCSeriesDetail : BBCSeriesSearchResult;
		const allData: BBCByProviderResult<Result> = {
			data: {},
			count: 0,
			pages: 0,
			errors: [],
		};

		await Promise.all(
			providers.map(async (provider) => {
				const searchUrl = new URL(`${this.apiUrl}/search`);

				searchUrl.searchParams.set('q', query);
				searchUrl.searchParams.append('provider', provider.id);
				if (options?.detail) {
					searchUrl.searchParams.set('detail', 'true');
				}
				searchUrl.searchParams.append('include_mature', options?.include_mature ? 'true' : 'false');

				try {
					const res = await fetch(searchUrl, {
						signal: options?.abortSignal,
					});
					const data: BBCByProviderResponse<Result> = await res.json();

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

	async getSeries<D extends boolean = false>(
		seriesIds: Record<string, string[]>,
		bookIds?: Record<string, string[]>,
		detail?: D
	): Promise<BBCByProviderResult<D extends true ? BBCSeriesDetail : BBCSeries>> {
		type Result = D extends true ? BBCSeriesDetail : BBCSeries;
		const allData: BBCByProviderResult<Result> = { data: {}, count: 0, pages: 0, errors: [] };

		try {
			const url = new URL(`${this.apiUrl}/series`);

			if (detail) url.searchParams.set('detail', 'true');

			const appendSeriesIds = (seriesType: BBCSeries['type'], ids: Record<string, string[]>) =>
				Object.entries(ids).forEach(([providerId, sIds]) =>
					sIds.forEach((seriesId) =>
						url.searchParams.append(`${seriesType}(${providerId})`, seriesId)
					)
				);

			appendSeriesIds('series', seriesIds);
			if (bookIds) appendSeriesIds('book', bookIds);

			const res = await fetch(url);
			const data: BBCByProviderResponse<Result> = await res.json();

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

	async getBooks<D extends boolean = false>(
		seriesIds: Record<string, string[]>,
		bookIds: Record<string, string[]>,
		sort: BBCSort = 'desc',
		page: number = 1,
		langs: Record<string, string[]> = {},
		detail?: D
	): Promise<BBCByProviderResult<D extends true ? BBCBookDetail : BBCBook>> {
		type Result = D extends true ? BBCBookDetail : BBCBook;
		const allData: BBCByProviderResult<Result> = { data: {}, count: 0, pages: 0, errors: [] };

		const fetchAll = async (seriesType: BBCSeries['type'], ids: Record<string, string[]>) =>
			await Promise.all(
				Object.entries(ids).map(async ([providerId, sIds]) => {
					await Promise.all(
						sIds.map(async (seriesId) => {
							if (!allData.data[providerId]) allData.data[providerId] = [];

							const booksUrl = new URL(`${this.apiUrl}/books`);

							if (detail) booksUrl.searchParams.set('detail', 'true');
							booksUrl.searchParams.set('sort', sort);
							booksUrl.searchParams.set('page', page.toString());
							booksUrl.searchParams.append(`${seriesType}(${providerId})`, seriesId);

							for (const lang of langs[providerId] ?? []) {
								booksUrl.searchParams.append(`lang(${providerId})`, lang);
							}

							try {
								const res = await fetch(booksUrl);
								const data: BBCByProviderResponse<Result> = await res.json();

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

	async getBookPages(
		booksIds: Record<string, string[]>
	): Promise<BBCByProviderResult<BBCBookPage>> {
		const allData: BBCByProviderResult<BBCBookPage> = { data: {}, count: 0, pages: 0, errors: [] };

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
							const data: BBCByProviderResponse<BBCBookPage> = await res.json();

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
		const { data } = (await res.json()) as { data: BBCProvider[] };
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

	async editBooks(
		books: { providerId: string; book: BBCBook }[]
	): Promise<BBCByProviderResult<BBCBookDetail>> {
		const allData: BBCByProviderResult<BBCBookDetail> = {
			data: {},
			count: 0,
			pages: 0,
			errors: [],
		};
		const chunks = this.chopArray(books, this.editMaxCount);

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

	async getMappedSeries(
		providerId: string,
		seriesId: string
	): Promise<BBCListResult<BBCSeriesDetail>> {
		const allData: BBCListResult<BBCSeriesDetail> = { data: [], count: 0, pages: 0, errors: [] };

		try {
			const res = await fetch(
				`${this.apiUrl}/map/${encodeURIComponent(providerId)}/${encodeURIComponent(seriesId)}`
			);
			const data: BBCListResponse<BBCSeriesDetail> = await res.json();

			if (data.error) {
				allData.errors.push(new BBC_API_Error(data.error));
			} else {
				allData.data = data.data;
				allData.count = data.count;
				allData.pages = data.pages ?? 1;
			}
		} catch (e) {
			allData.errors.push(new BBC_API_Error(`${e}`));
		}

		return allData;
	}

	async getSeriesByMappedId(mappedId: string): Promise<BBCByProviderResult<BBCSeriesDetail>> {
		const allData: BBCByProviderResult<BBCSeriesDetail> = {
			data: {},
			count: 0,
			pages: 0,
			errors: [],
		};

		try {
			const res = await fetch(`${this.apiUrl}/map/${encodeURIComponent(mappedId)}`);
			const data: BBCByProviderResponse<BBCSeriesDetail> = await res.json();

			if (data.error) {
				allData.errors.push(new BBC_API_Error(data.error));
			} else {
				allData.data = data.data;
				allData.count = data.count;
				allData.pages = data.pages ?? 1;
			}
		} catch (e) {
			allData.errors.push(new BBC_API_Error(`${e}`));
		}

		return allData;
	}

	async mapSeries(
		series: { providerId: string; id: string }[],
		mappedId?: string
	): Promise<BBCByProviderResult<BBCSeriesDetail>> {
		const allData: BBCByProviderResult<BBCSeriesDetail> = {
			data: {},
			count: 0,
			pages: 0,
			errors: [],
		};
		const chunks = this.chopArray(series, this.editMaxCount);

		await Promise.all(
			chunks.map(async (chunk) => {
				try {
					const body: Record<string, unknown> = { series: chunk };
					if (mappedId) {
						body.mappedId = mappedId;
					}
					const res = await fetch(`${this.apiUrl}/map`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json', ...userState.headers },
						body: JSON.stringify(body),
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

	async unmapSeries(providerId: string, seriesId: string): Promise<void> {
		const res = await fetch(
			`${this.apiUrl}/map/${encodeURIComponent(providerId)}/${encodeURIComponent(seriesId)}`,
			{
				method: 'DELETE',
				headers: userState.headers,
			}
		);
		if (!res.ok) {
			const errorData = await res.json().catch(() => null);
			throw new BBC_API_Error(errorData?.error || `Failed to unmap series: HTTP ${res.status}`);
		}
	}

	async getDiscoverySeriesMapped(mappedId: string): Promise<{ data: BBCSeriesDetail }> {
		const res = await fetch(`${this.apiUrl}/discovery/series/${encodeURIComponent(mappedId)}`);
		if (!res.ok) {
			throw new BBC_API_Error(`Failed to fetch mapped series: HTTP ${res.status}`);
		}
		return await res.json();
	}

	async getDiscovery(): Promise<{
		newlyAddedBooks: BBCBookDetail[];
		newlyAddedSeries: BBCSeriesDetail[];
		newlyMergedSeries: BBCSeriesDetail[];
		recentlyReleasedBooks: BBCBookDetail[];
	}> {
		const res = await fetch(`${this.apiUrl}/discovery`);
		if (!res.ok) throw new BBC_API_Error(`Failed to fetch discovery: HTTP ${res.status}`);
		const json = await res.json();
		return json.data;
	}

	async searchMergedSeries(
		query: string,
		mature: boolean
	): Promise<BBCListResponse<BBCSeriesDetail>> {
		const res = await fetch(
			`${this.apiUrl}/discovery/search?q=${encodeURIComponent(query)}&mature=${mature}`
		);
		if (!res.ok) throw new BBC_API_Error(`Failed to search discovery: HTTP ${res.status}`);
		return res.json();
	}

	private async fetchPaginated<T>(url: string, page: number): Promise<BBCListResponse<T>> {
		const res = await fetch(`${url}?page=${page}`);
		if (!res.ok) throw new BBC_API_Error(`Failed to fetch paginated data: HTTP ${res.status}`);
		return res.json();
	}

	async getDiscoverySeriesMerged(page: number = 1): Promise<BBCListResponse<BBCSeriesDetail>> {
		return this.fetchPaginated(`${this.apiUrl}/discovery/series/merged`, page);
	}

	async getDiscoverySeriesNew(page: number = 1): Promise<BBCListResponse<BBCSeriesDetail>> {
		return this.fetchPaginated(`${this.apiUrl}/discovery/series/new`, page);
	}

	async getDiscoveryBooksNew(page: number = 1): Promise<BBCListResponse<BBCBookDetail>> {
		return this.fetchPaginated(`${this.apiUrl}/discovery/books/new`, page);
	}

	async getDiscoveryBooksReleased(page: number = 1): Promise<BBCListResponse<BBCBookDetail>> {
		return this.fetchPaginated(`${this.apiUrl}/discovery/books/released`, page);
	}
}
