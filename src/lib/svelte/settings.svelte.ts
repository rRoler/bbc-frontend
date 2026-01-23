import { getTextVariableName } from '../utils.ts';
import { defaultProviders, type Provider } from '../apis/providers.ts';
import type { WsrvOptions } from '../apis/wsrv.ts';
import type { BBCSort } from '../apis/bbc.ts';

export interface SettingBase<T> {
	id: string;
	name: string;
	description?: string;
	tooltip?: string;
	type: string;
	currentValue?: T;
	storedValue?: T;
	defaultValue: T;
}

export interface ProviderSelectSetting extends SettingBase<Provider[]> {
	type: 'provider-select';
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

export type SettingType =
	| ProviderSelectSetting
	| TextSetting
	| TextAreaSetting
	| ToggleSetting
	| SelectSetting
	| RangeSetting;

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
	currentValue: T['currentValue'];
	storedValue: T['storedValue'];

	constructor(setting: T) {
		this.id = setting.id;
		this.name = setting.name;
		this.description = setting.description;
		this.tooltip = setting.tooltip;
		this.type = setting.type;
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

	get value(): T['defaultValue'] {
		return this.currentValue ?? this.defaultValue;
	}
	set value(value: T['currentValue']) {
		this.currentValue = this.cloneValue(value ?? this.defaultValue);
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
		const storedData = localStorage.getItem('settings');
		if (storedData) {
			const parsedData = JSON.parse(storedData);
			if (parsedData[this.id] !== undefined && parsedData[this.id] !== null) {
				this.storedValue = this.cloneValue(parsedData[this.id]);
				this.value = this.storedValue;
			}
		} else {
			this.value = this.defaultValue;
			this.storedValue = this.cloneValue(this.value);
		}
	}
	save() {
		const storedData = localStorage.getItem('settings');
		const parsedData = storedData ? JSON.parse(storedData) : {};
		parsedData[this.id] = this.value;
		localStorage.setItem('settings', JSON.stringify(parsedData));
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

	reset() {
		this.settings.forEach((setting) => setting.reset());
	}
	load() {
		this.settings.forEach((setting) => setting.load());
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
	bookId: 'BOOK_ID',
	seriesTitle: 'SERIES_TITLE',
	seriesThumbnailUrl: 'SERIES_THUMBNAIL_URL',
	seriesPublicationType: 'SERIES_PUBLICATION_TYPE',
	seriesBookType: 'SERIES_BOOK_TYPE',
	seriesType: 'SERIES_TYPE',
	seriesId: 'SERIES_ID',
	providerName: 'PROVIDER_NAME',
	providerId: 'PROVIDER_ID',
	providerLanguageName: 'PROVIDER_LANGUAGE_NAME',
	providerLanguageCode: 'PROVIDER_LANGUAGE_CODE',
	coverQualityScore: 'COVER_QUALITY_SCORE',
	coverWidth: 'COVER_WIDTH',
	coverHeight: 'COVER_HEIGHT',
	coverCropStatus: 'COVER_CROP_STATUS',
	fileExtension: 'FILE_EXTENSION',
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

export const generalSettings = new SettingsField({
	name: 'General',
	settings: [themeSetting],
});

export const defaultSearchProvidersSetting = new Setting<ProviderSelectSetting>({
	id: 'default-search-providers',
	type: 'provider-select',
	name: 'Search Providers',
	description: 'The providers to use by default when searching',
	defaultValue: defaultProviders,
});

export const autoMatchResultsSetting = new Setting<ToggleSetting>({
	id: 'results-auto-match',
	type: 'toggle',
	name: 'Auto-Match Results',
	description: 'Automatically match series/book results by default',
	defaultValue: true,
});

export const searchSettings = new SettingsField({
	name: 'Search',
	settings: [defaultSearchProvidersSetting, autoMatchResultsSetting],
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
	tooltip:
		'Available variables: ' +
		[
			textVariables.volumeName,
			textVariables.volumeNumber,
			textVariables.bookPageName,
			textVariables.bookPageNumber,
			textVariables.bookTitle,
			textVariables.bookId,
			textVariables.seriesTitle,
			textVariables.seriesPublicationType,
			textVariables.seriesBookType,
			textVariables.seriesType,
			textVariables.seriesId,
			textVariables.providerName,
			textVariables.providerId,
			textVariables.providerLanguageName,
			textVariables.providerLanguageCode,
			textVariables.coverQualityScore,
			textVariables.coverWidth,
			textVariables.coverHeight,
			textVariables.coverCropStatus,
		]
			.map((v) => getTextVariableName(v))
			.join(', '),
	defaultValue: getTextVariableName(textVariables.volumeName),
});

export const coverFilenameSetting = new Setting<TextSetting>({
	id: 'cover-filename',
	type: 'text',
	name: 'Cover Filename',
	description: 'The filename to use for downloaded covers',
	tooltip:
		'Available variables: ' +
		[
			textVariables.volumeName,
			textVariables.volumeNumber,
			textVariables.bookPageName,
			textVariables.bookPageNumber,
			textVariables.bookTitle,
			textVariables.bookId,
			textVariables.seriesTitle,
			textVariables.seriesPublicationType,
			textVariables.seriesBookType,
			textVariables.seriesType,
			textVariables.seriesId,
			textVariables.providerName,
			textVariables.providerId,
			textVariables.providerLanguageName,
			textVariables.providerLanguageCode,
			textVariables.coverQualityScore,
			textVariables.coverWidth,
			textVariables.coverHeight,
			textVariables.coverCropStatus,
			textVariables.fileExtension,
		]
			.map((v) => getTextVariableName(v))
			.join(', '),
	defaultValue: `${getTextVariableName(textVariables.volumeName)}.${getTextVariableName(textVariables.fileExtension)}`,
});

export const coverPathSetting = new Setting<TextSetting>({
	id: 'cover-path',
	type: 'text',
	name: 'Cover Path',
	description: 'The path inside the ZIP to save downloaded covers to',
	tooltip:
		'Available variables: ' +
		[
			textVariables.volumeName,
			textVariables.volumeNumber,
			textVariables.bookPageName,
			textVariables.bookPageNumber,
			textVariables.bookTitle,
			textVariables.bookId,
			textVariables.seriesTitle,
			textVariables.seriesPublicationType,
			textVariables.seriesBookType,
			textVariables.seriesType,
			textVariables.seriesId,
			textVariables.providerName,
			textVariables.providerId,
			textVariables.providerLanguageName,
			textVariables.providerLanguageCode,
			textVariables.coverQualityScore,
			textVariables.coverWidth,
			textVariables.coverHeight,
			textVariables.coverCropStatus,
		]
			.map((v) => getTextVariableName(v))
			.join(', '),
	defaultValue: `${getTextVariableName(textVariables.providerName)}/${getTextVariableName(textVariables.seriesId)}`,
});

export const zipFilenameSetting = new Setting<TextSetting>({
	id: 'zip-filename',
	type: 'text',
	name: 'Zip Filename',
	description: 'The filename of use for the downloaded zip',
	tooltip:
		'Available variables: ' +
		[textVariables.fileExtension].map((v) => getTextVariableName(v)).join(', '),
	defaultValue: `covers.${getTextVariableName(textVariables.fileExtension)}`,
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
	tooltip:
		'Available variables: ' +
		[
			textVariables.coverUrl,
			textVariables.volumeName,
			textVariables.volumeNumber,
			textVariables.bookPageName,
			textVariables.bookPageNumber,
			textVariables.bookTitle,
			textVariables.bookId,
			textVariables.seriesTitle,
			textVariables.seriesThumbnailUrl,
			textVariables.seriesPublicationType,
			textVariables.seriesBookType,
			textVariables.seriesType,
			textVariables.seriesId,
			textVariables.providerName,
			textVariables.providerId,
			textVariables.providerLanguageName,
			textVariables.providerLanguageCode,
			textVariables.coverQualityScore,
			textVariables.coverWidth,
			textVariables.coverHeight,
			textVariables.coverCropStatus,
		]
			.map((v) => getTextVariableName(v))
			.join(', '),
	defaultValue: `${getTextVariableName(textVariables.coverUrl)}\n`,
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
	],
});

const allSettingsFields = [generalSettings, searchSettings, downloadSettings];

export default allSettingsFields;
