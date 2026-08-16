<script lang="ts">
	import { Search } from 'lucide-svelte';

	let {
		class: className = '',
		value = $bindable(''),
		placeholder = 'Search',
		onsubmit,
	}: {
		class?: string;
		value?: string;
		placeholder?: string;
		onsubmit?: () => void;
	} = $props();

	function handleKeys(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			if (onsubmit) onsubmit();
		}
	}
</script>

<label class="input input-xl input-primary w-full shrink-0 {className}">
	<input bind:value onkeydown={handleKeys} type="search" required {placeholder} />
	<button
		onclick={(e) => {
			e.preventDefault();
			if (onsubmit) onsubmit();
		}}
		class="btn btn-circle btn-ghost"
	>
		<Search class="size-6" />
	</button>
</label>
