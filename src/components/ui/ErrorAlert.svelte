<script lang="ts">
	import { appState, removeAppError } from '../../lib/svelte/app.svelte.ts';
	import { X } from 'lucide-svelte';
</script>

<div class="toast toast-end toast-top z-100 max-h-screen overflow-y-auto">
	<noscript>
		<div class="alert alert-error">
			<span>Please enable JavaScript</span>
		</div>
	</noscript>

	{#if appState.errors.length > 0}
		<div class="alert alert-error flex justify-between">
			<span>Clear All</span>
			<button
				onclick={() => [...appState.errors].forEach((e) => removeAppError(e))}
				class="btn btn-circle btn-ghost"
			>
				<X class="size-6" />
			</button>
		</div>
	{/if}

	{#each appState.errors as error, index (index)}
		<div class="alert alert-error flex justify-between">
			<span>{error?.message || error}</span>
			<button onclick={() => removeAppError(error)} class="btn btn-circle btn-ghost">
				<X class="size-6" />
			</button>
		</div>
	{/each}
</div>
