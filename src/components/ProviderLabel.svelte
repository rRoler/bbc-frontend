<script lang="ts">
	import type { Provider } from '../lib/providers.ts';

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
</script>

<div class="flex w-fit flex-row items-center justify-center gap-2 {className || ''}">
	<img class="size-4 rounded-sm {iconClass || ''}" src={provider.icon} alt="{provider.name} logo" />
	<p
		class="bg-clip-text! font-semibold text-transparent text-shadow-sm {textClass || ''}"
		style="background: linear-gradient(to right, {provider.colors.primary}, {provider.colors
			.secondary});"
	>
		{provider.name}
	</p>
</div>
