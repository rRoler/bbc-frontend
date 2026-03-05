import { registerSW } from 'virtual:pwa-register';

window.addEventListener('load', () => {
	const pwaToast = document.querySelector<HTMLDivElement>('#pwa-toast');
	const pwaCloseBtn = pwaToast?.querySelector<HTMLButtonElement>('#pwa-close');
	const pwaRefreshBtn = pwaToast?.querySelector<HTMLButtonElement>('#pwa-refresh');

	const refreshCallback = () => refreshSW?.(true);

	const hidePwaToast = (raf = false) => {
		if (raf) {
			requestAnimationFrame(() => hidePwaToast(false));
			return;
		}
		if (pwaToast?.classList.contains('refresh'))
			pwaRefreshBtn?.removeEventListener('click', refreshCallback);

		pwaToast?.classList.remove('show', 'refresh');
	};

	const showPwaToast = () => {
		pwaRefreshBtn?.addEventListener('click', refreshCallback);
		requestAnimationFrame(() => {
			hidePwaToast(false);
			pwaToast?.classList.add('show', 'refresh');
		});
	};

	pwaCloseBtn?.addEventListener('click', () => hidePwaToast(true));

	const refreshSW = registerSW({
		immediate: true,
		onOfflineReady() {
			console.log('App ready to work offline');
		},
		onNeedRefresh() {
			console.log('New content available, click on reload button to update');
			showPwaToast();
		},
		onRegisteredSW(swScriptUrl) {
			console.log('SW registered: ', swScriptUrl);
		},
	});
});
