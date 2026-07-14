<script lang="ts">
	import { appState } from '../lib/svelte/app.svelte.ts';
	import allProviders from '../lib/svelte/providers.svelte.ts';
	import { onMount } from 'svelte';

	let { children, id, isMobile = false } = $props();

	let visible = $state(false);

	onMount(() => {
		allProviders.load();
	});

	$effect(() => {
		const mq = window.matchMedia('(width >= 40rem)');
		visible = isMobile ? !mq.matches : mq.matches;
		const handler = (e: MediaQueryListEvent) => (visible = isMobile ? !e.matches : e.matches);
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});
</script>

{#if visible}
	<div class="flex size-full items-center justify-center" class:hidden={!appState.loading}>
		<span class="loading loading-ring loading-xl size-32"></span>
	</div>

	<div
		{id}
		class="relative flex size-full grow flex-col overflow-x-hidden overflow-y-auto"
		class:hidden={appState.loading}
	>
		{@render children()}
	</div>
{/if}
