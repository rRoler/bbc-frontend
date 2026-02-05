<script lang="ts">
	import { appState } from '../lib/svelte/app.svelte.ts';

	let { children, id } = $props();
</script>

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
