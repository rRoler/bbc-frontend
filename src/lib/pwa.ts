import { registerSW } from 'virtual:pwa-register';

window.addEventListener('load', () => {
	const pwaToast = document.querySelector<HTMLDivElement>('#pwa-toast');
	const pwaCloseBtn = pwaToast?.querySelector<HTMLButtonElement>('#pwa-close');
	const pwaRefreshBtn = pwaToast?.querySelector<HTMLButtonElement>('#pwa-refresh');

	const refreshCallback = () => refreshSW?.(true);

	const hidePwaToast = () => {
		pwaRefreshBtn?.removeEventListener('click', refreshCallback);
		requestAnimationFrame(() => {
			pwaToast?.classList.add('hidden');
		});
	};

	const showPwaToast = () => {
		pwaRefreshBtn?.addEventListener('click', refreshCallback);
		requestAnimationFrame(() => {
			pwaToast?.classList.remove('hidden');
		});
	};

	pwaCloseBtn?.addEventListener('click', () => hidePwaToast());

	const refreshSW = registerSW({
		immediate: true,
		onOfflineReady() {
			console.log('App ready to work offline.');
		},
		onNeedRefresh() {
			console.log('New content available, click on reload button to update.');
			showPwaToast();
		},
		onRegisteredSW(swScriptUrl) {
			console.log('SW registered: ', swScriptUrl);
		},
	});
});
