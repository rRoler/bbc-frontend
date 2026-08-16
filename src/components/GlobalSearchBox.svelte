<script lang="ts">
	import { searchLocation } from '../lib/locations.ts';
	import { addKeyboardShortcut } from '../lib/utils.ts';

	let {
		value = $bindable(''),
		class: className = $bindable(''),
		size = $bindable('md'),
		searchPath = searchLocation.path,
		placeholder = 'Search',
	}: {
		value?: string;
		class?: string;
		size?: 'md' | 'lg' | 'xl';
		searchPath?: string;
		placeholder?: string;
	} = $props();

	let inputEl = $state<HTMLInputElement>();
	let inputClass = $state<string>('');
	let buttonClass = $state<string>('');
	let iconClass = $state<string>('');
	let kbdClass = $state<string>('');

	let searchValue = $derived<string>(`${searchPath}?q=${encodeURIComponent(value)}`);

	switch (size) {
		case 'md':
			inputClass = 'input-md';
			iconClass = 'size-4';
			buttonClass = 'btn-xs';
			kbdClass = 'kbd-xs';
			break;
		case 'lg':
			inputClass = 'input-lg';
			iconClass = 'size-5';
			buttonClass = 'btn-sm';
			kbdClass = 'kbd-sm';
			break;
		case 'xl':
			inputClass = 'input-xl';
			iconClass = 'size-6';
			buttonClass = 'btn-md';
			kbdClass = 'kbd-md';
			break;
	}

	$effect(() => {
		const removeShortcuts = [
			addKeyboardShortcut(['ControlLeft', 'KeyK'], () => inputEl?.focus()),
			addKeyboardShortcut(['ControlRight', 'KeyK'], () => inputEl?.focus()),
		];

		return () => removeShortcuts.forEach((rm) => rm());
	});

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') window.location.assign(searchValue);
	}
</script>

<label class="input input-primary glass group max-w-full {inputClass} {className}">
	<input
		bind:this={inputEl}
		bind:value
		onkeydown={handleKeyDown}
		type="search"
		required
		{placeholder}
		class="w-full grow"
	/>

	<span
		class="pointer-events-none hidden gap-1 sm:flex sm:group-focus-within:hidden"
		class:hidden!={!!value}
	>
		<kbd class="kbd {kbdClass}">ctrl</kbd>
		<kbd class="kbd {kbdClass}">k</kbd>
	</span>

	<a class="btn btn-circle btn-ghost {buttonClass}" href={searchValue}>
		<searchLocation.Icon class={iconClass} />
	</a>
</label>
