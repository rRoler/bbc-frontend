import { disableApfAdsSetting } from './svelte/settings.svelte.ts';

interface Ad {
	image: string;
	url: string;
}

const coverAds: Ad[] = [
	{
		image: 'images/ads/MB-Ad-Cover-1.gif',
		url: 'https://mangabaka.org/2894',
	},
	{
		image: 'images/ads/MB-Ad-Cover-2.png',
		url: 'https://mangabaka.org/49417',
	},
	{
		image: 'images/ads/MB-Ad-Cover-3.png',
		url: 'https://mangabaka.org/66622',
	},
	{
		image: 'images/ads/MB-Ad-Cover-4.png',
		url: 'https://mangabaka.org/33172',
	},
	{
		image: 'images/ads/MB-Ad-Cover-5.png',
		url: 'https://mangabaka.org/32169',
	},
	{
		image: 'images/ads/MB-Ad-Cover-6.gif',
		url: 'https://mangabaka.org/49417',
	},
	{
		image: 'images/ads/MB-Ad-Cover-7.gif',
		url: 'https://mangabaka.org/49417',
	},
];

const bannerAds: Ad[] = [
	{
		image: 'images/ads/MB-Ad-Banner-1.png',
		url: 'https://mangabaka.org/7489',
	},
	{
		image: 'images/ads/MB-Ad-Banner-2.png',
		url: 'https://mangabaka.org/32124',
	},
	{
		image: 'images/ads/MB-Ad-Banner-3.png',
		url: 'https://mangabaka.org/8134',
	},
	{
		image: 'images/ads/MB-Ad-Banner-4.png',
		url: 'https://mangabaka.org/47690',
	},
	{
		image: 'images/ads/MB-Ad-Banner-5.png',
		url: 'https://mangabaka.org/1754',
	},
	{
		image: 'images/ads/MB-Ad-Banner-6.png',
		url: 'https://mangabaka.org/41447',
	},
];

export function areAdsDisabled() {
	disableApfAdsSetting.load();
	return disableApfAdsSetting.value;
}

export function getRandomAd(type: 'cover' | 'banner') {
	const ads = type === 'cover' ? coverAds : bannerAds;
	return ads[Math.floor(Math.random() * ads.length)];
}
