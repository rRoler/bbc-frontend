import { unzipSync } from 'fflate';
import allProviders, { type Provider } from './providers.ts';

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
	type: 'series' | 'book';
	title: string;
	thumbnail: string;
	bookType?: 'manga' | 'novel';
	publicationType?: 'physical' | 'digital';
}

export interface BBCBook {
	id: string;
	title: string;
	cover: string;
	seriesId: string | null;
}

export interface BBCBookPage {
	number: number;
	url: string;
	type: string;
	height: number;
	width: number;
	bookId: string;
}

export type BBCSort = 'asc' | 'desc';

export default class BBC_API {
	readonly apiUrl = 'https://c.roler.dev';
	readonly bookPagesMaxCount = 12;
	readonly zipMaxCount = 6;

	chopArray<T>(array: T[], chunkSize: number): T[][] {
		const result: T[][] = [];

		for (let i = 0; i < array.length; i += chunkSize) {
			result.push(array.slice(i, i + chunkSize));
		}

		return result;
	}

	async search(query: string, providers: Provider[] = allProviders): Promise<BBCResult<BBCSeries>> {
		const allData: BBCResult<BBCSeries> = { data: {}, count: 0, pages: 0, errors: [] };

		await Promise.all(
			providers.map(async (provider) => {
				if (!allData.data[provider.id]) allData.data[provider.id] = [];

				const searchUrl = new URL(`${this.apiUrl}/search`);

				searchUrl.searchParams.set('q', query);
				searchUrl.searchParams.append('provider', provider.id);

				try {
					const res = await fetch(searchUrl);
					const data: BBCResponse<BBCSeries> = await res.json();

					if (data.error) {
						allData.errors.push(new BBC_API_Error(`${provider.name}: ${data.error}`));
					} else {
						allData.data[provider.id].push(...(data.data[provider.id] || []));
						allData.count += data.count;
					}
				} catch (e) {
					allData.errors.push(new BBC_API_Error(`${provider.name}: ${e}`));
				}
			})
		);

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
}
