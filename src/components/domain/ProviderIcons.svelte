<script lang="ts">
	import type { Provider } from '../../stores/providers.svelte.ts';
	import { getLocaleName, langToFlag } from '../../utils';

	let {
		providers,
		size = 'size-5',
		max = 4,
		class: className = '',
		showTitle = true,
	}: {
		providers: Provider[];
		size?: string;
		max?: number;
		class?: string;
		showTitle?: boolean;
	} = $props();

	const unique = $derived(Array.from(new Map(providers.map((p) => [p.id, p])).values()));
	const visible = $derived(max && unique.length > max ? unique.slice(0, max) : unique);
	const overflow = $derived(max ? Math.max(0, unique.length - visible.length) : 0);
</script>

<div class="avatar-group flex-wrap -space-x-2 overflow-visible {className}">
	{#each visible as provider (provider.id)}
		{@const Flag = langToFlag(provider.locale)}
		<div class="indicator">
			<div class="avatar rounded-sm" title={showTitle ? provider.name : undefined}>
				<div class={size}>
					<img src={provider.icon} alt="{provider.name} logo" />
				</div>
			</div>
			{#if Flag}
				<span
					class="ring-base-100 bg-base-100/90 absolute bottom-0 left-0 z-10 w-2/5 overflow-hidden rounded ring-1"
					title={getLocaleName(provider.locale)}
				>
					<Flag class="block h-auto w-full" />
				</span>
			{/if}
		</div>
	{/each}
	{#if overflow > 0}
		<div class="avatar rounded-sm">
			<div
				class="{size} bg-base-300 text-base-content flex items-center justify-center text-xs font-bold"
			>
				+{overflow}
			</div>
		</div>
	{/if}
</div>
