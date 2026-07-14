<script lang="ts">
	import type { Provider } from '../lib/svelte/providers.svelte.ts';
	import { getLocaleName, langToFlag } from '../lib/utils.ts';

	let {
		provider,
		class: className,
		textClass,
		iconClass,
	}: {
		provider: Provider;
		class?: string;
		textClass?: string;
		iconClass?: string;
	} = $props();

	const Flag = $derived(langToFlag(provider.locale));
	const flagSize = $derived(
		Math.round((Number(iconClass?.match(/(?:size|w|h)-(\d+)/)?.[1]) || 4) * 4 * 0.75)
	);
	// Safari (iOS) does not support `fit-content` on SVG dimensions, use explicit px values
	const flagHeight = $derived(Math.round(flagSize * 0.75));
</script>

<div
	class="flex w-fit flex-row items-center justify-center gap-3 {className || ''}"
	title="{provider.name} ({getLocaleName(provider.locale)})"
>
	<div class="indicator shrink-0">
		{#if Flag}
			<span
				class="indicator-item indicator-bottom indicator-end badge badge-xs size-fit overflow-hidden p-0"
			>
				<Flag style="width: {flagSize}px; height: {flagHeight}px;" />
			</span>
		{/if}
		<img
			class="size-4 rounded-sm {iconClass || ''}"
			src={provider.icon}
			alt="{provider.name} logo"
		/>
	</div>
	<p
		class="bg-clip-text! font-semibold text-transparent text-shadow-sm {textClass || ''}"
		style="background: linear-gradient(to right, {provider.colors.primary}, {provider.colors
			.secondary});"
	>
		{provider.name}
	</p>
</div>
