export const SITE_NAME = 'Big Book Covers';

export function formatPageTitle(title?: string): string {
	return `${title ? title + ' - ' : ''}${SITE_NAME}`;
}

function setMetaContent(attr: 'name' | 'property', key: string, content: string): void {
	if (typeof document === 'undefined') return;
	const el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
	if (el) el.content = content;
}

export function setPageMeta(meta: { title?: string; description?: string }): void {
	if (typeof document === 'undefined') return;

	if (meta.title !== undefined) {
		const formatted = formatPageTitle(meta.title);
		document.title = formatted;
		setMetaContent('property', 'og:title', formatted);
		setMetaContent('name', 'twitter:title', formatted);
	}

	if (meta.description !== undefined) {
		setMetaContent('name', 'description', meta.description);
		setMetaContent('property', 'og:description', meta.description);
		setMetaContent('name', 'twitter:description', meta.description);
	}
}
