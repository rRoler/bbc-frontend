<script lang="ts">
	import { searchLocation } from '../lib/locations.ts';

	let {
		value = $bindable(''),
		class: className = $bindable(''),
		size = $bindable('md'),
	}: {
		value?: string;
		class?: string;
		size?: 'md' | 'lg' | 'xl';
	} = $props();

	let inputClass = $state<string>('');
	let buttonClass = $state<string>('');
	let iconClass = $state<string>('');

	let searchValue = $derived<string>(`${searchLocation.path}?q=${encodeURIComponent(value)}`);

	switch (size) {
		case 'md':
			inputClass = 'input-md';
			iconClass = 'size-4';
			buttonClass = 'btn-xs';
			break;
		case 'lg':
			inputClass = 'input-lg';
			iconClass = 'size-5';
			buttonClass = 'btn-sm';
			break;
		case 'xl':
			inputClass = 'input-xl';
			iconClass = 'size-6';
			buttonClass = 'btn-md';
			break;
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') window.location.assign(searchValue);
	}
</script>

<label class="input input-primary glass max-w-full {inputClass} {className}">
	<input bind:value onkeydown={handleKeyDown} type="search" placeholder="Search" />
	<a class="btn btn-circle btn-ghost {buttonClass}" href={searchValue}>
		<searchLocation.Icon class={iconClass} />
	</a>
</label>
