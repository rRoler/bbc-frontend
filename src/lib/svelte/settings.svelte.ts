import { getTextVariableName } from '../utils.ts';
import type { ProviderStorageEntry } from './providers.svelte.ts';
import type { WsrvOptions } from '../apis/wsrv.ts';
import type { BBCSort } from '../apis/bbc.ts';

export const ALLOWED_EDIT_ROLES = ['developer', 'contributor', 'moderator', 'admin'];

export function readLocalSettings(): {
	data: Record<string, unknown>;
	syncFlags: Record<string, boolean>;
} | null {
	const stored = localStorage.getItem('settings');
	if (!stored) return null;
	const data = JSON.parse(stored) as Record<string, unknown>;
	if (!data._syncFlags) data._syncFlags = {};
	return { data, syncFlags: data._syncFlags as Record<string, boolean> };
}

export function isSyncableKey(key: string, syncFlags: Record<string, boolean>): boolean {
	return key !== '_syncFlags' && key !== 'user-login' && key !== 'user-token' && syncFlags[key];
}

export function saveLocalSettings(data: Record<string, unknown>): void {
	localStorage.setItem('settings', JSON.stringify(data));
}

export interface SettingBase<T> {
	id: string;
	name: string;
	description?: string;
	tooltip?: string;
	type: string;
	currentValue?: T;
	storedValue?: T;
	loginOnly?: boolean;
	allowedRoles?: string[];
	defaultValue: T;
	varCategories?: readonly string[];
}

export interface ProviderSelectSetting extends SettingBase<ProviderStorageEntry[]> {
	type: 'provider-select';
}

export interface ProviderEditorSetting extends SettingBase<ProviderStorageEntry[]> {
	type: 'provider-editor';
}

export interface TextSetting extends SettingBase<string> {
	type: 'text';
}

export interface TextAreaSetting extends SettingBase<string> {
	type: 'textarea';
}

export interface ToggleSetting extends SettingBase<boolean> {
	type: 'toggle';
}

export interface SelectOption<T extends string = string> {
	label: string;
	value: T;
}

export interface SelectSetting<T extends SelectOption = SelectOption> extends SettingBase<
	T['value']
> {
	type: 'select';
	options: T[];
}

export interface RangeSetting extends SettingBase<number> {
	type: 'range';
	min: number;
	max: number;
	step: number;
}

export interface FileSystemFolderPickerSetting extends SettingBase<string | null | undefined> {
	type: 'file-system-folder-picker';
}

export interface LoginSetting extends SettingBase<string | null> {
	type: 'login';
}

export type SettingType =
	| ProviderSelectSetting
	| ProviderEditorSetting
	| TextSetting
	| TextAreaSetting
	| ToggleSetting
	| SelectSetting
	| RangeSetting
	| FileSystemFolderPickerSetting
	| LoginSetting;

export interface SettingsFieldType<T extends readonly Setting<SettingType>[]> {
	name: string;
	settings: T;
}

export class Setting<T extends SettingType> {
	readonly id: T['id'];
	readonly name: T['name'];
	readonly description: T['description'];
	readonly tooltip: T['tooltip'];
	readonly type: T['type'];
	readonly defaultValue: T['defaultValue'];
	readonly options?: SelectOption[];
	readonly min?: RangeSetting['min'];
	readonly max?: RangeSetting['max'];
	readonly step?: RangeSetting['step'];
	readonly loginOnly?: T['loginOnly'];
	readonly allowedRoles?: T['allowedRoles'];
	readonly varCategories?: ReadonlyArray<string>;
	currentValue: T['currentValue'];
	storedValue: T['storedValue'];
	syncEnabled = $state(true);

	constructor(setting: T) {
		this.id = setting.id;
		this.name = setting.name;
		this.description = setting.description;
		this.tooltip = setting.tooltip;
		this.type = setting.type;
		this.loginOnly = setting.loginOnly;
		this.allowedRoles = setting.allowedRoles;
		this.varCategories = (setting as SettingBase<unknown>).varCategories;
		this.defaultValue = setting.defaultValue;
		this.currentValue = $state(setting.currentValue);
		this.storedValue = $state(setting.storedValue);
		if (setting.type === 'select') this.options = setting.options;
		if (setting.type === 'range') {
			this.min = setting.min;
			this.max = setting.max;
			this.step = setting.step;
		}
	}

	loadSyncFlag(): void {
		const local = readLocalSettings();
		if (local) {
			this.syncEnabled = local.syncFlags[this.id] ?? true;
		}
	}

	saveSyncFlag(): void {
		const local = readLocalSettings() ?? { data: {}, syncFlags: {} };
		if (!local.data._syncFlags) local.data._syncFlags = {};
		(local.data._syncFlags as Record<string, boolean>)[this.id] = this.syncEnabled;
		saveLocalSettings(local.data);
	}

	get value(): T['defaultValue'] {
		return this.currentValue === undefined ? this.defaultValue : this.currentValue;
	}
	set value(value: T['currentValue']) {
		this.currentValue = this.cloneValue(value === undefined ? this.defaultValue : value);
	}

	get isChanged() {
		return JSON.stringify(this.value) !== JSON.stringify(this.storedValue);
	}
	get isDefault() {
		return JSON.stringify(this.value) === JSON.stringify(this.defaultValue);
	}

	cloneValue(value: T['currentValue']): T['currentValue'] {
		return Array.isArray(value) ? [...value] : value;
	}

	reset() {
		this.value = this.defaultValue;
	}
	load() {
		const local = readLocalSettings();
		if (local && local.data[this.id] !== undefined) {
			this.storedValue = this.cloneValue(local.data[this.id] as T['currentValue']);
			this.value = this.storedValue;
		} else {
			this.value = this.defaultValue;
			this.storedValue = this.cloneValue(this.value);
		}
	}
	save() {
		const local = readLocalSettings() ?? { data: {}, syncFlags: {} };
		local.data[this.id] = this.value;
		saveLocalSettings(local.data);
		this.storedValue = this.cloneValue(this.value);
	}
}

export class SettingsField<T extends readonly Setting<SettingType>[]> {
	readonly name: SettingsFieldType<T>['name'];
	settings: SettingsFieldType<T>['settings'];

	constructor(field: SettingsFieldType<T>) {
		this.name = field.name;
		this.settings = $derived(field.settings);
	}

	get isChanged() {
		return this.settings.some((setting) => setting.isChanged);
	}
	get isDefault() {
		return this.settings.every((setting) => setting.isDefault);
	}
	get hasSyncedChange() {
		return this.settings.some((setting) => setting.isChanged && setting.syncEnabled);
	}

	reset() {
		this.settings.forEach((setting) => setting.reset());
	}
	load() {
		this.settings.forEach((setting) => setting.load());
	}
	loadSyncFlag() {
		this.settings.forEach((setting) => setting.loadSyncFlag());
	}
	save() {
		this.settings.forEach((setting) => setting.save());
	}
}

export const textVariables = {
	coverUrl: 'COVER_URL',
	volumeName: 'VOLUME_NAME',
	volumeNumber: 'VOLUME_NUMBER',
	bookPageName: 'BOOK_PAGE_NAME',
	bookPageNumber: 'BOOK_PAGE_NUMBER',
	bookTitle: 'BOOK_TITLE',
	bookUrl: 'BOOK_URL',
	bookId: 'BOOK_ID',
	bookPrice: 'BOOK_PRICE',
	bookCurrency: 'BOOK_CURRENCY',
	bookIsbn: 'BOOK_ISBN',
	bookReleaseDate: 'BOOK_RELEASE_DATE',
	bookPageCount: 'BOOK_PAGE_COUNT',
	bookDescription: 'BOOK_DESCRIPTION',
	bookAuthors: 'BOOK_AUTHORS',
	bookArtists: 'BOOK_ARTISTS',
	bookPublisher: 'BOOK_PUBLISHER',
	bookTags: 'BOOK_TAGS',
	bookRating: 'BOOK_RATING',
	bookRatingCount: 'BOOK_RATING_COUNT',
	bookLanguage: 'BOOK_LANGUAGE',
	bookTranslator: 'BOOK_TRANSLATOR',
	bookFormat: 'BOOK_FORMAT',
	bookOriginalPrice: 'BOOK_ORIGINAL_PRICE',
	bookFileSize: 'BOOK_FILE_SIZE',
	seriesTitle: 'SERIES_TITLE',
	seriesThumbnailUrl: 'SERIES_THUMBNAIL_URL',
	seriesPublicationType: 'SERIES_PUBLICATION_TYPE',
	seriesBookType: 'SERIES_BOOK_TYPE',
	seriesType: 'SERIES_TYPE',
	seriesUrl: 'SERIES_URL',
	seriesId: 'SERIES_ID',
	seriesDescription: 'SERIES_DESCRIPTION',
	seriesAuthors: 'SERIES_AUTHORS',
	seriesArtists: 'SERIES_ARTISTS',
	seriesPublisher: 'SERIES_PUBLISHER',
	seriesTags: 'SERIES_TAGS',
	seriesStatus: 'SERIES_STATUS',
	seriesRating: 'SERIES_RATING',
	seriesRatingCount: 'SERIES_RATING_COUNT',
	seriesLanguage: 'SERIES_LANGUAGE',
	seriesTranslator: 'SERIES_TRANSLATOR',
	seriesFormat: 'SERIES_FORMAT',
	seriesReadingDirection: 'SERIES_READING_DIRECTION',
	seriesBookCount: 'SERIES_BOOK_COUNT',
	seriesChapterCount: 'SERIES_CHAPTER_COUNT',
	seriesMagazine: 'SERIES_MAGAZINE',
	seriesGenre: 'SERIES_GENRE',
	seriesTitleKana: 'SERIES_TITLE_KANA',
	seriesAlId: 'SERIES_AL_ID',
	seriesApId: 'SERIES_AP_ID',
	seriesMuId: 'SERIES_MU_ID',
	seriesNuId: 'SERIES_NU_ID',
	seriesKtId: 'SERIES_KT_ID',
	seriesMalId: 'SERIES_MAL_ID',
	seriesMbId: 'SERIES_MB_ID',
	seriesShikiId: 'SERIES_SHIKI_ID',
	seriesMappedId: 'SERIES_MAPPED_ID',
	seriesMappedSource: 'SERIES_MAPPED_SOURCE',
	seriesMappedAt: 'SERIES_MAPPED_AT',
	seriesLastUpdated: 'SERIES_LAST_UPDATED',
	bookLastFetchedAt: 'BOOK_LAST_FETCHED_AT',
	bookCreatedAt: 'BOOK_CREATED_AT',
	bookUpdatedAt: 'BOOK_UPDATED_AT',
	seriesLastFetchedAt: 'SERIES_LAST_FETCHED_AT',
	seriesCreatedAt: 'SERIES_CREATED_AT',
	seriesUpdatedAt: 'SERIES_UPDATED_AT',
	providerName: 'PROVIDER_NAME',
	providerId: 'PROVIDER_ID',
	providerLanguageName: 'PROVIDER_LANGUAGE_NAME',
	providerLanguageCode: 'PROVIDER_LANGUAGE_CODE',
	coverQualityScore: 'COVER_QUALITY_SCORE',
	coverWidth: 'COVER_WIDTH',
	coverHeight: 'COVER_HEIGHT',
	coverCropStatus: 'COVER_CROP_STATUS',
	fileExtension: 'FILE_EXTENSION',
	date: 'DATE',
	time: 'TIME',
	datetime: 'DATETIME',
};

export const themeSetting = new Setting<SelectSetting<SelectOption<'light' | 'dark' | 'system'>>>({
	id: 'theme',
	type: 'select',
	name: 'Theme',
	defaultValue: 'system',
	options: [
		{ label: 'System', value: 'system' },
		{ label: 'Light', value: 'light' },
		{ label: 'Dark', value: 'dark' },
	],
});

export const configuredProvidersSetting = new Setting<ProviderEditorSetting>({
	id: 'configured-providers',
	type: 'provider-editor',
	name: 'Providers',
	description:
		'Change the provider priority order and whether they are used by default when searching',
	defaultValue: [],
});

export const matureContentSetting = new Setting<SelectSetting>({
	id: 'mature-content',
	type: 'select',
	name: 'Mature Content',
	description: 'Choose how mature/pornographic content will be displayed',
	defaultValue: 'hide',
	options: [
		{ label: 'Hide', value: 'hide' },
		{ label: 'Blur', value: 'blur' },
		{ label: 'Display', value: 'display' },
	],
});

export const generalSettings = new SettingsField({
	name: 'General',
	settings: [themeSetting, configuredProvidersSetting, matureContentSetting],
});

export const autoMatchResultsSetting = new Setting<ToggleSetting>({
	id: 'results-auto-match',
	type: 'toggle',
	name: 'Auto-Match Results',
	description: 'Automatically match series/book results by default',
	defaultValue: true,
});

export const searchCopyFormatSetting = new Setting<TextAreaSetting>({
	id: 'search-copy-format',
	type: 'textarea',
	name: 'Copy Format',
	description: 'The format to use when copying search links',
	varCategories: ['series', 'provider', 'datetime'],
	defaultValue: `${getTextVariableName(textVariables.seriesUrl)}\n`,
});

export const searchSettings = new SettingsField({
	name: 'Search',
	settings: [autoMatchResultsSetting, searchCopyFormatSetting],
});

export const bookSortOrderSetting = new Setting<SelectSetting<SelectOption<BBCSort>>>({
	id: 'book-sort-order',
	type: 'select',
	name: 'Sort Order',
	description: 'The order to sort books by default',
	defaultValue: 'asc',
	options: [
		{ label: 'Ascending', value: 'asc' },
		{ label: 'Descending', value: 'desc' },
	],
});

export const bookSortBySetting = new Setting<
	SelectSetting<SelectOption<'title' | 'volume' | 'provider'>>
>({
	id: 'book-sort-by',
	type: 'select',
	name: 'Sort By',
	description: 'The field to sort books by',
	defaultValue: 'volume',
	options: [
		{ label: 'Title', value: 'title' },
		{ label: 'Volume', value: 'volume' },
		{ label: 'Provider', value: 'provider' },
	],
});

export const automaticQualityPickerSetting = new Setting<ToggleSetting>({
	id: 'automatic-quality-picker',
	type: 'toggle',
	name: 'Automatic Quality Picker',
	description: 'Automatically pick best-quality covers by default',
	defaultValue: true,
});

export const automaticCropSetting = new Setting<ToggleSetting>({
	id: 'automatic-crop',
	type: 'toggle',
	name: 'Automatic Crop',
	description: 'Automatically crop covers by default',
	defaultValue: true,
});

export const cropFormatSetting = new Setting<
	SelectSetting<SelectOption<NonNullable<WsrvOptions['output']>>>
>({
	id: 'crop-format',
	type: 'select',
	name: 'Crop Format',
	description: 'The format to use when cropping covers',
	defaultValue: 'jpg',
	options: [
		{ label: 'JPEG', value: 'jpg' },
		{ label: 'PNG', value: 'png' },
		{ label: 'WEBP', value: 'webp' },
		{ label: 'TIFF', value: 'tiff' },
		{ label: 'GIF', value: 'gif' },
	],
});

export const cropQualitySetting = new Setting<RangeSetting>({
	id: 'crop-quality',
	type: 'range',
	name: 'Crop Quality',
	description: 'The format quality to use when cropping covers\n(applies only to lossy formats)',
	min: 0,
	max: 100,
	step: 1,
	defaultValue: 98,
});

export const bookDisplayTextSetting = new Setting<TextSetting>({
	id: 'book-display-text',
	type: 'text',
	name: 'Book Display Text',
	description: 'The text to display for books',
	varCategories: ['book', 'series', 'provider', 'datetime'],
	defaultValue: getTextVariableName(textVariables.volumeName),
});

export const coverFilenameSetting = new Setting<TextSetting>({
	id: 'cover-filename',
	type: 'text',
	name: 'Cover Filename',
	description: 'The filename to use for downloaded covers',
	varCategories: ['book', 'series', 'provider', 'cover', 'file', 'datetime'],
	defaultValue: `${getTextVariableName(textVariables.volumeName)}.${getTextVariableName(textVariables.fileExtension)}`,
});

export const coverPathSetting = new Setting<TextSetting>({
	id: 'cover-path',
	type: 'text',
	name: 'Cover Path',
	description: 'The path inside the ZIP to save downloaded covers to',
	varCategories: ['book', 'series', 'provider', 'datetime'],
	defaultValue: `${getTextVariableName(textVariables.providerName)}/${getTextVariableName(textVariables.seriesId)}`,
});

export const zipFilenameSetting = new Setting<TextSetting>({
	id: 'zip-filename',
	type: 'text',
	name: 'Zip Filename',
	description: 'The filename of use for the downloaded zip',
	varCategories: ['file', 'datetime'],
	defaultValue: `covers_${getTextVariableName(textVariables.datetime)}.${getTextVariableName(textVariables.fileExtension)}`,
});

export const zipThreshold = new Setting<SelectSetting>({
	id: 'zip-threshold',
	type: 'select',
	name: 'Zip Threshold',
	description: 'Determines when selected covers should be bundled into a ZIP file',
	defaultValue: '1',
	options: [
		{ label: 'Never', value: 'NaN' },
		{ label: 'Always', value: '0' },
		{ label: `If more than 1 file`, value: '1' },
		...new Array(39)
			.fill(null)
			.map((_, i) => ({ label: `If more than ${i + 2} files`, value: `${i + 2}` })),
	],
});

export const copyFormatSetting = new Setting<TextAreaSetting>({
	id: 'copy-format',
	type: 'textarea',
	name: 'Copy Format',
	description: 'The format to use when copying the cover URL',
	varCategories: ['book', 'series', 'provider', 'cover', 'datetime'],
	defaultValue: `${getTextVariableName(textVariables.coverUrl)}\n`,
});

export const fileSystemFolderSetting = new Setting<FileSystemFolderPickerSetting>({
	id: 'download-folder',
	type: 'file-system-folder-picker',
	name: 'Download Folder',
	description: 'The folder where the covers will be downloaded. Browser support is limited.',
	defaultValue: undefined,
});

export const autoMapSetting = new Setting<ToggleSetting>({
	id: 'auto-map',
	type: 'toggle',
	name: 'Auto-Map',
	tooltip: 'Automatically map series when downloading',
	description: 'Pass external IDs to the downloader and auto-map series on download/copy',
	defaultValue: true,
	loginOnly: true,
	allowedRoles: ALLOWED_EDIT_ROLES,
});

export const downloadSettings = new SettingsField({
	name: 'Download',
	settings: [
		bookSortOrderSetting,
		bookSortBySetting,
		automaticQualityPickerSetting,
		automaticCropSetting,
		cropFormatSetting,
		cropQualitySetting,
		bookDisplayTextSetting,
		coverFilenameSetting,
		coverPathSetting,
		zipFilenameSetting,
		zipThreshold,
		copyFormatSetting,
		fileSystemFolderSetting,
	],
});

export const userLoginSetting = new Setting<LoginSetting>({
	id: 'user-login',
	type: 'login',
	name: 'Login',
	defaultValue: null,
});

export const userTokenSetting = new Setting<LoginSetting>({
	id: 'user-token',
	type: 'login',
	name: 'User Token',
	defaultValue: null,
});

export const editAutoSyncSetting = new Setting<ToggleSetting>({
	id: 'edit-auto-sync',
	type: 'toggle',
	name: 'Auto-Sync Edits',
	tooltip: 'Edits can take up to one day to apply',
	description: 'Automatically sync volume edits to the server when applied',
	defaultValue: true,
	loginOnly: true,
	allowedRoles: ALLOWED_EDIT_ROLES,
});

export const userSettings = new SettingsField({
	name: 'User',
	settings: [userLoginSetting, editAutoSyncSetting, autoMapSetting],
});

const allSettingsFields = [userSettings, generalSettings, searchSettings, downloadSettings];

export default allSettingsFields;
