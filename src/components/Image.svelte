<script lang="ts">
	interface Props {
		src: string;
		alt: string;
		class?: string;
		loading?: 'lazy' | 'eager';
	}

	let { src, alt, class: className = '', loading = 'lazy' }: Props = $props();

	let loaded = $state(false);
	let errored = $state(false);

	function setErrorImage(event: Event) {
		const target = event.target as HTMLImageElement;
		target.src = '/images/error.svg';
	}
</script>

{#if !loaded && !errored}
	<div class="relative size-full">
		<div class="skeleton pointer-events-none absolute inset-0 size-full rounded-none"></div>
	</div>
{/if}
<img
	{src}
	{alt}
	class="transition-opacity duration-300 {loaded || errored
		? 'opacity-100'
		: 'absolute top-0 left-0 opacity-0'} {className}"
	{loading}
	onload={() => (loaded = true)}
	onerror={(e) => {
		errored = true;
		setErrorImage(e);
	}}
/>
