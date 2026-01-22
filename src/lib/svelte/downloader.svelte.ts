import { appState, addAppError } from './app.svelte.ts';
import type { BBCBook, BBCBookPage, BBCSeries } from '../apis/bbc.ts';
import allProviders, { type Provider } from '../apis/providers.ts';
import BBC_API, { type BBCSort } from '../apis/bbc.ts';
import WsrvApi from '../apis/wsrv.ts';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import {
	filterFilename,
	getAllSvelteSearchParams,
	getLocaleName,
	natsort,
	replaceTextVariables,
} from '../utils.ts';
import {
	textVariables,
	bookSortBySetting,
	bookDisplayTextSetting,
	automaticCropSetting,
	cropFormatSetting,
	cropQualitySetting,
	coverFilenameSetting,
	coverPathSetting,
	zipFilenameSetting,
	copyFormatSetting,
} from './settings.svelte.ts';
import { fileTypeFromBuffer } from 'file-type';
import fileSaver from 'file-saver';
import { zipSync } from 'fflate';

export interface Series extends BBCSeries {
	provider: Provider;
}

export interface Book extends BBCBook {
	thumbnail: string;
	provider: Provider;
	volumeName: string;
	volumeNumber: string;
	displayText: string;
	coverFormat?: string;
	coverHeight?: number;
	coverWidth?: number;
	coverIsCropped?: boolean;
	originalCover?: string;
	originalThumbnail?: string;
	originalWidth?: number;
	chromaSubsampling?: string;
	coverQualityScore?: number;
	selectedPage?: number;
}

export interface BookPage extends BBCBookPage {
	provider: Provider;
}

export interface OpenedImage {
	url: string;
	percentage: number;
	provider: Provider;
	name: string;
}

class Downloader {
	private readonly MAX_SELECTED_SERIES = 10;
	private readonly MAX_COMPARE_BOOKS = 6;
	private readonly THUMBNAIL_DATA = {
		width: 336,
		output: 'jpg',
		quality: 60,
	} as const;

	private readonly api = new BBC_API();
	private readonly imageApi = new WsrvApi();

	isFetching = $state<boolean>(false);
	allSeriesIds = $state<Record<string, string[]>>({});
	allBookIds = $state<Record<string, string[]>>({});
	sortOrder = $state<BBCSort>('asc');
	automaticCoverQualityEnabled = $state<boolean>(true);
	page = $state<number>(1);
	maxPage = $state<number>(1);
	incrementPages = $state<boolean>(false);
	fetchedPages = $state<number[]>([]);
	allBooks = $state<Book[]>([]);
	allSeries = $state<Series[]>([]);
	selectedBooks = $state<Book[]>([]);
	lastToggledBook = $state<Book>();
	providers = $state<Provider[]>([]);
	selectedProviders = $state<Provider[]>([]);
	openedImages = $state<OpenedImage[]>([]);
	openedImageData = $state({
		targetOffsetX: 0,
		targetOffsetY: 0,
		targetScale: 1.0,
		minScale: 0.3,
		maxScale: 100.0,
		smoothing: 0.25,
	});
	knownFilenames = $state<Record<string, number>>({});
	downloadProgress = $state<number>();
	copyValues = new SvelteMap<string, boolean | null>();
	allBookPages = $state<BookPage[]>([]);
	selectedBookPage = $state<number>(0);

	allPages = $derived<number[]>(this.getPages(this.page, this.maxPage));
	isNextPage = $derived<boolean>(this.page < this.maxPage);
	filteredBooks = $derived.by(() => {
		let books = [...this.allBooks];
		if (this.automaticCoverQualityEnabled) books = this.automaticallyPickCovers(books);
		return books;
	});
	sortedFilteredBooks = $derived<Book[]>(
		[...this.filteredBooks].sort((a, b) => this.sortBookNaturally(a, b))
	);
	sortedSelectedBooks = $derived<Book[]>(
		[...this.selectedBooks].sort((a, b) => this.sortBookNaturally(a, b))
	);
	isSomeSelected = $derived<boolean>(this.selectedBooks.length > 0);
	isAllSelected = $derived<boolean>(this.filteredBooks.length === this.selectedBooks.length);
	croppingAvailable = $derived<boolean>(this.filteredBooks.some((b) => this.coverCanBeCropped(b)));
	shouldCrop = $derived<boolean>(this.selectedBooks.some((b) => this.coverShouldBeCropped(b)));
	selectedCanBeCropped = $derived<boolean>(
		this.selectedBooks.some((b) => this.coverCanBeCropped(b))
	);
	selectedBooksToCompare = $derived<Book[]>(
		this.sortedSelectedBooks.slice(0, this.MAX_COMPARE_BOOKS)
	);
	downloadProgressPercentage = $derived<number>(
		Math.ceil(((this.downloadProgress || 0) / this.selectedBooks.length) * 100)
	);
	isDownloading = $derived<boolean>(this.downloadProgress !== undefined);
	maxBookPage = $derived<number>(Math.max(0, ...this.allBookPages.map((p) => p.number)));
	maxBookPageArray = $derived<number[]>(Array.from({ length: this.maxBookPage + 1 }, (_, i) => i));
	canChangeBookPage = $derived<boolean>(
		this.selectedProviders.some((p) => p.supportsBookPages) && this.maxBookPage > 0
	);

	private sortBookNaturally(a: Book, b: Book): number {
		const sortBy = bookSortBySetting.value;
		const order = this.sortOrder;

		let compareResult: number;
		switch (sortBy) {
			case 'volume':
				compareResult = natsort(a.volumeName, b.volumeName);
				break;
			case 'title':
				compareResult = natsort(a.title, b.title);
				break;
			case 'provider':
				compareResult = natsort(a.provider.name, b.provider.name);
				break;
			default:
				compareResult = natsort(a.volumeName, b.volumeName);
		}

		return order === 'asc' ? compareResult : -compareResult;
	}

	private getPages(currentPage: number, maxPage: number): number[] {
		if (maxPage <= 0) return [];
		if (currentPage < 1) currentPage = 1;
		if (currentPage > maxPage) currentPage = maxPage;

		const pages = new SvelteSet<number>();

		pages.add(1);
		pages.add(currentPage);
		pages.add(maxPage);

		const maxLength = 5;
		let offset = 1;
		while (pages.size < maxLength) {
			let added = false;

			if (currentPage - offset >= 1 && pages.size < maxLength) {
				pages.add(currentPage - offset);
				added = true;
			}

			if (currentPage + offset <= maxPage && pages.size < maxLength) {
				pages.add(currentPage + offset);
				added = true;
			}

			if (!added) break;

			offset++;
		}

		return Array.from(pages).sort((a, b) => a - b);
	}

	private coverCanBeCropped(b: Book): boolean {
		return (
			b.coverIsCropped ||
			(!!b.coverWidth &&
				!!b.coverHeight &&
				this.calculateCropAmount(b.coverWidth, b.coverHeight) !== undefined)
		);
	}

	private coverShouldBeCropped(b: Book): boolean {
		return (
			!!b.coverWidth &&
			!!b.coverHeight &&
			this.calculateCropAmount(b.coverWidth, b.coverHeight) !== undefined &&
			!b.coverIsCropped
		);
	}

	private calculateCropAmount(width: number, height: number): number | undefined {
		const aspect = Math.floor((width / height) * 100) / 100;

		if (width >= 880 && width <= 964 && height === 1200) return 120;
		if (width >= 220 && width <= 241 && height === 300) return 30;
		if (height > 4000 && aspect >= 0.73 && aspect < 0.8) return -355;
		if (width > 2000 && height > 2000 && aspect >= 0.73 && aspect < 0.8) return -211;
		if (width < 2000 && height > 2000 && aspect >= 0.73 && aspect < 0.8) return -224;
	}

	private getCoverQualityScore(book: Book): number {
		const formatScores: Record<string, number> = {
			png: 9,
			jpeg: 6,
			jpg: 6,
			webp: 3,
		};

		const chromaScores: Record<string, number> = {
			'4:4:4': 8,
			'4:2:2': 6,
			'4:2:0': 4,
		};

		const resolution = (book.coverWidth || 0) * (book.coverHeight || 0);
		const resScore = Math.floor(Math.sqrt(resolution) / 20);

		const formatKey = book.coverFormat?.toLowerCase();
		const formatScore = formatKey ? formatScores[formatKey] || 0 : 0;

		let chromaScore = 8;
		const isJpeg = formatKey === 'jpeg' || formatKey === 'jpg';
		if (isJpeg && book.chromaSubsampling) {
			chromaScore = chromaScores[book.chromaSubsampling] || 4;
		}

		const totalScore = resScore + formatScore + chromaScore;
		return Math.round(totalScore / 2);
	}

	private parseTextVariables(
		text: string,
		options: { book?: Book; extension?: string } = {}
	): string {
		const { book, extension } = options;
		const vars: [string, string][] = [];

		if (book) {
			vars.push([textVariables.coverUrl, book.cover]);
			vars.push([textVariables.volumeName, book.volumeName]);
			vars.push([textVariables.volumeNumber, book.volumeNumber]);
			vars.push([textVariables.bookTitle, book.title]);
			vars.push([textVariables.bookId, book.id]);
			vars.push([textVariables.providerName, book.provider.name]);
			vars.push([textVariables.providerId, book.provider.id]);
			vars.push([textVariables.providerLanguageName, getLocaleName(book.provider.locale)]);
			vars.push([textVariables.providerLanguageCode, book.provider.locale]);
			vars.push([textVariables.bookPageNumber, (book.selectedPage || 0).toString()]);
			vars.push([textVariables.bookPageName, book.selectedPage ? `Page ${book.selectedPage}` : '']);

			const bookSeries = this.allSeries.find(
				(s) => s.id === book.seriesId && s.provider.id === book.provider.id
			);
			if (bookSeries) {
				vars.push([textVariables.seriesTitle, bookSeries.title]);
				vars.push([textVariables.seriesThumbnailUrl, bookSeries.thumbnail]);
				vars.push([textVariables.seriesPublicationType, bookSeries.publicationType || 'digital']);
				vars.push([textVariables.seriesBookType, bookSeries.bookType || '']);
				vars.push([textVariables.seriesType, bookSeries.type]);
				vars.push([textVariables.seriesId, bookSeries.id]);
			} else {
				vars.push([textVariables.seriesId, book.seriesId || '0']);
			}

			vars.push([textVariables.coverQualityScore, book.coverQualityScore?.toString() || '0']);
			vars.push([textVariables.coverWidth, book.coverWidth?.toString() || '0']);
			vars.push([textVariables.coverHeight, book.coverHeight?.toString() || '0']);
			vars.push([textVariables.coverCropStatus, book.coverIsCropped ? 'cropped' : 'uncropped']);
		}

		if (extension) {
			vars.push([textVariables.fileExtension, extension]);
		}

		return replaceTextVariables(text, vars);
	}

	private automaticallyPickCovers(books: Book[]): Book[] {
		const booksByVolume = new SvelteMap<string, Book[]>();
		for (const book of books) {
			if (!booksByVolume.has(book.volumeName)) {
				booksByVolume.set(book.volumeName, []);
			}
			booksByVolume.get(book.volumeName)?.push(book);
		}

		const booksToKeep = new SvelteSet<Book>();
		for (const [, volumeBooks] of booksByVolume) {
			if (volumeBooks.length === 1) {
				booksToKeep.add(volumeBooks[0]);
				continue;
			}

			volumeBooks.sort((a, b) => {
				if (this.selectedBookPage > 0) {
					if (a.provider.supportsBookPages && !b.provider.supportsBookPages) return -1;
					if (!a.provider.supportsBookPages && b.provider.supportsBookPages) return 1;
				}

				const qualityA = a.coverQualityScore || 0;
				const qualityB = b.coverQualityScore || 0;
				if (qualityA !== qualityB) return qualityB - qualityA;

				const providerIndexA = this.providers.findIndex((p) => p.id === a.provider.id);
				const providerIndexB = this.providers.findIndex((p) => p.id === b.provider.id);
				return providerIndexA - providerIndexB;
			});

			booksToKeep.add(volumeBooks[0]);
		}

		return books.filter((book) => booksToKeep.has(book));
	}

	private getVolumePrefix(title: string): string {
		if (/Chapter|#\d+/i.test(title)) return 'Chapter';
		return 'Volume';
	}

	private getVolumeNumber(title: string): string | undefined {
		let volumeString = title.replace(/[．,#/／・年月]/g, '.');

		const japaneseCharacters = '０１２３４５６７８９'.split('');
		japaneseCharacters.forEach(
			(character, i) => (volumeString = volumeString.replaceAll(character, i.toString()))
		);

		const spaceMatch =
			volumeString.match(/(?:Volume\s+|Chapter\s+|vol\.|No\.)(\d+(?:(?:\.\d+)+)?)/i) ||
			volumeString.match(/\((\d+(?:(?:\.\d+)+)?)\)/g) ||
			volumeString.match(/ (\d+(?:(?:\.\d+)+)?) /g) ||
			volumeString.match(/(\d+(?:(?:\.\d+)+)?)/g);
		const spaceMatchN = spaceMatch?.pop();
		if (spaceMatchN) volumeString = spaceMatchN;

		const volumeNumbers = /(?:0+)?(\d+(?:(?:\.\d+)+)?)/g.exec(volumeString);
		if (volumeNumbers) {
			const volumeNumberString = volumeNumbers.pop();
			if (volumeNumberString) return volumeNumberString;
		}
	}

	private parseVolumeName(title: string, options?: { forcePrefix?: string }): string {
		const volumePrefix = options?.forcePrefix ? options.forcePrefix : this.getVolumePrefix(title);
		const volumeNumber = this.getVolumeNumber(title);

		if (volumeNumber) return `${volumePrefix} ${volumeNumber}`;

		return title.trim();
	}

	private async copyLinksToClipboard(books: Book[], copyId: string): Promise<void> {
		const text = books
			.map((b) => this.parseTextVariables(copyFormatSetting.value, { book: b }))
			.join('');

		await navigator.clipboard.writeText(text).then(
			() => {
				this.copyValues.set(copyId, true);
				console.debug('Copied links to clipboard');
			},
			() => {
				this.copyValues.set(copyId, false);
				addAppError(new Error('Failed to copy links to clipboard'));
			}
		);
	}

	get maxCompareBooks(): number {
		return this.MAX_COMPARE_BOOKS;
	}

	async fetchSeries(): Promise<void> {
		if (this.isFetching) return;

		this.isFetching = true;

		const allIds = {
			...this.allBookIds,
			...this.allSeriesIds,
		};

		try {
			const response = await this.api.getSeries(allIds);

			if (response.errors.length > 0) response.errors.forEach((e) => addAppError(e));

			Object.entries(response.data).forEach(([providerId, series]) => {
				const provider = this.providers.find((p) => p.id === providerId);

				if (!provider) return;

				this.allSeries.push(...series.map((s) => ({ ...s, provider })));
			});
		} catch (e) {
			addAppError(new Error('Failed to fetch series', e as Error));
		}

		this.isFetching = false;
	}

	async fetchBooks(): Promise<void> {
		if (this.isFetching) return;

		this.isFetching = true;

		if (!Object.keys(this.allSeriesIds).length && !Object.keys(this.allBookIds).length) {
			this.isFetching = false;
			return;
		}

		try {
			const pagesToFetch = this.incrementPages
				? new Array(this.page)
						.fill(0)
						.map((_, i) => i + 1)
						.filter((p) => !this.fetchedPages.includes(p))
				: [this.page];

			for (const currentPage of pagesToFetch) {
				this.fetchedPages.push(currentPage);

				const response = await this.api.getBooks(
					this.allSeriesIds,
					this.allBookIds,
					this.sortOrder,
					currentPage
				);

				this.maxPage = Math.max(this.maxPage, response.pages);

				if (response.errors.length > 0) response.errors.forEach((e) => addAppError(e));

				if (response.count > 0) {
					let newBooks: Book[] = [];

					for (const provider of this.selectedProviders) {
						if (response.data[provider.id]) {
							newBooks.push(
								...response.data[provider.id].map((book) => {
									const data: Book = {
										...book,
										provider,
										volumeName: this.parseVolumeName(book.title, {
											forcePrefix: provider.volumePrefix,
										}),
										volumeNumber: this.getVolumeNumber(book.title) || '0',
										displayText: this.parseVolumeName(book.title, {
											forcePrefix: provider.volumePrefix,
										}),
										thumbnail: this.imageApi.getUrl(book.cover, this.THUMBNAIL_DATA).href,
									};

									data.displayText = this.parseTextVariables(bookDisplayTextSetting.value, {
										book: data,
									});

									return data;
								})
							);
						}

						if (provider.supportsBookPages) {
							try {
								const newBookIds = newBooks
									.filter((b) => b.provider.id === provider.id)
									.map((b) => b.id);
								const bookPages = await this.api.getBookPages({ [provider.id]: newBookIds });

								if (!provider.ignoreErrors && bookPages.errors.length > 0) {
									bookPages.errors.forEach((e) => addAppError(e));
								}

								this.allBookPages.push(
									...bookPages.data[provider.id].map((p) => ({
										...p,
										provider,
									}))
								);
							} catch (e) {
								if (!provider.ignoreErrors) {
									addAppError(new Error('Failed to change book preview page', e as Error));
								}
							}
						}
					}

					if (this.canChangeBookPage) {
						newBooks = newBooks.map((b) => {
							const data: Book = { ...b };
							const bookPages = this.allBookPages.filter(
								(p) => p.bookId === b.id && p.provider.id === b.provider.id
							);

							if (bookPages.length > 0) {
								const selectedPage =
									bookPages.find((p) => p.number === this.selectedBookPage) ||
									bookPages[bookPages.length - 1];
								if (selectedPage) {
									data.selectedPage = selectedPage.number;
									data.cover = selectedPage.url;
									data.thumbnail = this.imageApi.getUrl(data.cover, this.THUMBNAIL_DATA).href;
								}
							}

							return data;
						});
					}

					await Promise.all(
						newBooks.map(async (book) => {
							try {
								const response = await this.imageApi.getInfo(book.cover);
								book.coverFormat = response.format;
								book.coverHeight = response.height;
								book.coverWidth = response.width;
								book.chromaSubsampling = response.chromaSubsampling;
								book.coverQualityScore = this.getCoverQualityScore(book);
							} catch (e) {
								if (!book.provider.ignoreErrors) {
									addAppError(
										new Error(
											`Failed to get cover details for ${book.provider.name} - ${book.title}`,
											e as Error
										)
									);
								}
							}
						})
					);

					newBooks = newBooks.filter(
						(book) =>
							!book.provider.ignoreErrors ||
							(book.coverHeight && book.coverHeight > 1 && book.coverWidth && book.coverWidth > 1)
					);

					if (automaticCropSetting.value) this.toggleCropCovers(newBooks, true);

					this.allBooks.push(...newBooks);
				} else {
					console.debug('No more books to fetch');
				}
			}
		} catch (e) {
			addAppError(new Error('Failed to fetch books', e as Error));
		}

		this.isFetching = false;
	}

	async resetAll(): Promise<void> {
		appState.loading = true;
		this.fetchedPages = [];
		this.allBooks = [];
		this.selectedBooks = [];
		this.allBookPages = [];
		await this.fetchBooks();
		appState.loading = false;
	}

	async changePage(p: number): Promise<void> {
		if (p === this.page) return;

		this.page = p;
		this.incrementPages = false;
		await this.resetAll();
	}

	async incrementPage(): Promise<void> {
		if (!this.isNextPage) return;

		++this.page;
		this.incrementPages = true;
		await this.fetchBooks();
	}

	async toggleSortOrder(): Promise<void> {
		this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
		await this.resetAll();
	}

	toggleBook(book: Book, force?: boolean): void {
		const bookIndex = this.selectedBooks.findIndex(
			(b) => b.id === book.id && b.provider.id === book.provider.id
		);

		if ((bookIndex === -1 && force === undefined) || (bookIndex === -1 && force)) {
			this.selectedBooks.push(book);
		} else if (force === undefined || (bookIndex > -1 && !force)) {
			this.selectedBooks.splice(bookIndex, 1);
		}

		this.lastToggledBook = book;
	}

	toggleAllBooks(): void {
		if (this.isAllSelected) this.selectedBooks = [];
		else this.selectedBooks = [...this.filteredBooks];
	}

	shiftSelect(event: MouseEvent, book: Book): void {
		if (event.shiftKey) {
			const lastSelectedBookIndex = this.sortedFilteredBooks.findIndex(
				(b) =>
					b.id === this.lastToggledBook?.id && b.provider.id === this.lastToggledBook?.provider.id
			);
			const bookIndex = this.sortedFilteredBooks.findIndex(
				(b) => b.id === book.id && b.provider.id === book.provider.id
			);
			const isBookSelected = this.selectedBooks.some(
				(b) => b.id === book.id && b.provider.id === book.provider.id
			);

			if (lastSelectedBookIndex === -1) {
				this.toggleBook(book);
			} else if (bookIndex > lastSelectedBookIndex) {
				for (let i = lastSelectedBookIndex; i <= bookIndex; i++) {
					this.toggleBook(this.sortedFilteredBooks[i], !isBookSelected);
				}
			} else if (bookIndex < lastSelectedBookIndex) {
				for (let i = lastSelectedBookIndex; i >= bookIndex; i--) {
					this.toggleBook(this.sortedFilteredBooks[i], !isBookSelected);
				}
			}
		} else {
			this.toggleBook(book);
		}
	}

	toggleCropCovers(books: Book[], crop = true): void {
		for (const book of books) {
			if (!crop) {
				book.cover = book.originalCover ?? book.cover;
				book.thumbnail = book.originalThumbnail ?? book.thumbnail;
				book.coverWidth = book.originalWidth ?? book.coverWidth;
				book.originalCover = undefined;
				book.originalThumbnail = undefined;
				book.originalWidth = undefined;
				book.coverIsCropped = false;
				book.coverQualityScore = this.getCoverQualityScore(book);
				continue;
			}

			if (book.coverIsCropped) continue;
			if (!book.coverHeight || !book.coverWidth) continue;

			const cropAmount = this.calculateCropAmount(book.coverWidth, book.coverHeight);
			if (!cropAmount) continue;

			const absoluteCropAmount = Math.abs(cropAmount);
			const croppedWidth = book.coverWidth - absoluteCropAmount;

			const cropUrl = this.imageApi.getUrl(book.cover, {
				output: cropFormatSetting.value,
				quality: cropQualitySetting.value,
				width: book.coverWidth,
				height: book.coverHeight,
				cw: cropAmount > 0 ? croppedWidth : undefined,
				cx: cropAmount < 0 ? absoluteCropAmount : undefined,
			});

			const thumbnailAbsoluteCropAmount = Math.round(
				absoluteCropAmount * (this.THUMBNAIL_DATA.width / book.coverWidth)
			);
			const thumbnailCroppedWidth = this.THUMBNAIL_DATA.width - thumbnailAbsoluteCropAmount;

			const thumbnailCropUrl = this.imageApi.getUrl(book.cover, {
				...this.THUMBNAIL_DATA,
				cw: cropAmount > 0 ? thumbnailCroppedWidth : undefined,
				cx: cropAmount < 0 ? thumbnailAbsoluteCropAmount : undefined,
			});

			book.originalCover = book.cover;
			book.originalThumbnail = book.thumbnail;
			book.originalWidth = book.coverWidth;
			book.cover = cropUrl.href;
			book.thumbnail = thumbnailCropUrl.href;
			book.coverWidth = croppedWidth;
			book.coverIsCropped = true;
			book.coverQualityScore = this.getCoverQualityScore(book);
		}
	}

	async openCoverImages(books: Book[]): Promise<void> {
		if (appState.loading) return;

		appState.loading = true;

		try {
			const images = await this.api.getCovers(books.map((b) => b.cover));
			const urls: (string | null)[] = [];

			for (const index in books) {
				const image = images[index];

				if (!image) {
					urls.push(null);
					continue;
				}

				const blob = new Blob([new Uint8Array(image)]);
				const url = URL.createObjectURL(blob);

				urls.push(url);
			}

			const totalImages = urls.filter(Boolean).length;
			const widthPercentage = totalImages > 0 ? 100 / totalImages : 100;

			for (const [index, book] of books.entries()) {
				const url = urls[index];

				if (!url) {
					if (!book.provider.ignoreErrors) {
						addAppError(
							new Error(`Failed to open cover for ${book.provider.name} - ${book.title}`)
						);
					}
					continue;
				}

				this.openedImages.push({
					url,
					percentage: widthPercentage,
					provider: book.provider,
					name: book.title,
				});
			}
		} catch (e) {
			addAppError(new Error('Failed to open covers', e as Error));
		}

		appState.loading = false;
	}

	async openSelectedCovers(): Promise<void> {
		await this.openCoverImages(this.selectedBooksToCompare);
	}

	closeOpenedImages(): void {
		this.openedImages.forEach((img) => URL.revokeObjectURL(img.url));
		this.openedImages = [];
	}

	async downloadSelectedCovers(): Promise<void> {
		if (this.isDownloading) return;

		this.downloadProgress = 0;

		try {
			const urls = this.selectedBooks.map((b) => b.cover);
			const images = await this.api.getCovers(urls, (p) => (this.downloadProgress = p));
			const imagesToZip: Record<string, Uint8Array<ArrayBufferLike>> = {};

			for (const [index, book] of this.selectedBooks.entries()) {
				const imageBuffer = images[index];

				if (!imageBuffer) {
					if (!book.provider.ignoreErrors) {
						addAppError(
							new Error(`Failed to download cover for ${book.provider.name} - ${book.title}`)
						);
					}
					continue;
				}

				const imageFileType = await fileTypeFromBuffer(imageBuffer);

				if (!imageFileType || !imageFileType.mime.startsWith('image/')) {
					if (!book.provider.ignoreErrors) {
						addAppError(
							new Error(
								`Cover for ${book.provider.name} - ${book.title} is not an image: ${imageFileType?.mime || 'unknown'}`
							)
						);
					}
					continue;
				}

				const imagePath = this.parseTextVariables(coverPathSetting.value, { book });

				let imageFileName = filterFilename(
					`${imagePath ? imagePath + '/' : ''}${this.parseTextVariables(coverFilenameSetting.value, { book, extension: imageFileType.ext })}`,
					{ isPath: true }
				);

				if (this.knownFilenames[imageFileName] === undefined) {
					this.knownFilenames[imageFileName] = 0;
				} else {
					this.knownFilenames[imageFileName]++;
				}

				const isKnownName =
					this.knownFilenames[imageFileName] && this.knownFilenames[imageFileName] > 0;

				if (isKnownName) {
					const lastDotIndex = imageFileName.lastIndexOf('.');
					if (lastDotIndex > 0) {
						const nameWithoutExt = imageFileName.substring(0, lastDotIndex);
						const ext = imageFileName.substring(lastDotIndex);
						imageFileName = filterFilename(
							`${nameWithoutExt} (${this.knownFilenames[imageFileName]})${ext}`,
							{ isPath: true }
						);
					} else {
						imageFileName = filterFilename(
							`${imageFileName} (${this.knownFilenames[imageFileName]})`,
							{
								isPath: true,
							}
						);
					}
				}

				imagesToZip[imageFileName] = imageBuffer;
			}

			const imagesToZipTotal = Object.keys(imagesToZip).length;

			if (imagesToZipTotal === 0) {
				console.debug('No covers to download');
			} else if (imagesToZipTotal === 1) {
				const [imageKey] = Object.keys(imagesToZip);
				const image = imagesToZip[imageKey];
				const filename = imageKey.split('/').pop();
				fileSaver.saveAs(new Blob([new Uint8Array(image)]), filename || 'cover.jpg');
			} else {
				const zipped = zipSync(imagesToZip, { level: 0 });
				fileSaver.saveAs(
					new Blob([new Uint8Array(zipped)]),
					this.parseTextVariables(zipFilenameSetting.value, { extension: 'zip' }) || 'covers.zip'
				);
			}
		} catch (e) {
			addAppError(new Error('Failed to download covers', e as Error));
		}

		this.knownFilenames = {};
		this.downloadProgress = undefined;
	}

	async copySelectedLinks(): Promise<void> {
		await this.copyLinksToClipboard(this.sortedSelectedBooks, 'selected-links');
	}

	async copyCoverLink(book: Book): Promise<void> {
		await this.copyLinksToClipboard([book], `book-${book.provider.id}-${book.id}`);
	}

	async initialize(): Promise<void> {
		this.providers = [];
		this.selectedProviders = [];
		this.allSeriesIds = {};
		this.allBookIds = {};

		for (const provider of allProviders) {
			const series = getAllSvelteSearchParams(`series(${provider.id})`);
			const books = getAllSvelteSearchParams(`book(${provider.id})`);

			if (!series.length && !books.length) continue;

			this.providers.push(provider);
			this.selectedProviders.push(provider);

			if (series.length) this.allSeriesIds[provider.id] = series;
			if (books.length) this.allBookIds[provider.id] = books;
		}

		const countIds = (store: Record<string, string[]>) =>
			Object.values(store).reduce((sum, arr) => sum + arr.length, 0);

		const totalIds = countIds(this.allSeriesIds) + countIds(this.allBookIds);

		if (totalIds > this.MAX_SELECTED_SERIES) {
			addAppError(
				new Error(
					`Too many series selected. Please select up to ${this.MAX_SELECTED_SERIES} series at a time.`
				)
			);
			return;
		}

		if (this.providers.length > 0) {
			await this.fetchSeries();
			await this.fetchBooks();
		}
	}
}

export default Downloader;
