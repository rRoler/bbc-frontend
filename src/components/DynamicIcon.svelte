<script lang="ts">
	import { Check, Copy, X } from 'lucide-svelte';

	let {
		class: className = 'size-4',
		value = $bindable(null),
		resetDelayMs = 500,
		icon: Icon = Copy,
	}: {
		class?: string;
		value?: boolean | null;
		resetDelayMs?: number;
		icon?: typeof Copy;
	} = $props();

	$effect(() => {
		if (value === null) return;

		const timer = setTimeout(() => {
			value = null;
		}, resetDelayMs);

		return () => {
			clearTimeout(timer);
		};
	});
</script>

{#if value === true}
	<Check class="text-success {className}" />
{:else if value === false}
	<X class="text-error {className}" />
{:else}
	<Icon class={className} />
{/if}
