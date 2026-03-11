<script lang="ts">
	import allProviders, {
		sortProviders,
		getEnabledProviders,
		type Provider,
	} from '../lib/svelte/providers.svelte.ts';
	import ProviderLabel from './ProviderLabel.svelte';
	import { GripVertical, Settings2, X } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let {
		class: className = '',
		providers = $bindable<Provider[]>(allProviders.sorted),
		onchange,
	}: {
		class?: string;
		providers?: Provider[];
		onchange?: (providers: Provider[]) => void | Promise<void>;
	} = $props();

	let enabledProviders = $derived(getEnabledProviders(providers));
	let dialogEl = $state<HTMLDialogElement>();
	let workingList = $state<Provider[]>([]);

	onMount(() => {
		allProviders.load();
	});

	function openModal() {
		const allIds = new Set(providers.map((p) => p.id));
		const merged = [
			...providers.map((p) => ({ ...p })),
			...allProviders.sorted.filter((p) => !allIds.has(p.id)),
		];
		workingList = sortProviders(merged);
		dialogEl?.showModal();
	}

	function toggleCheck(index: number) {
		workingList[index] = { ...workingList[index], enabled: !workingList[index].enabled };
		providers = [...workingList];
		onchange?.([...providers]);
	}

	let dragIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	function onDragStart(e: DragEvent, index: number) {
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(index));
		}
	}

	function onDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dragOverIndex = index;
	}

	function onDrop(e: DragEvent, dropIndex: number) {
		e.preventDefault();
		if (dragIndex === null || dragIndex === dropIndex) {
			dragIndex = null;
			dragOverIndex = null;
			return;
		}
		const reordered = [...workingList];
		const [moved] = reordered.splice(dragIndex, 1);
		reordered.splice(dropIndex, 0, moved);
		workingList = reordered.map((p, i) => ({ ...p, priority: i + 1 }));
		providers = [...workingList];
		onchange?.([...providers]);
		dragIndex = null;
		dragOverIndex = null;
	}

	function onDragEnd() {
		dragIndex = null;
		dragOverIndex = null;
	}
</script>

<button
	class="btn btn-primary btn-outline h-fit max-w-full flex-wrap px-4 py-1 {className}"
	onclick={openModal}
>
	<Settings2 class="size-4" />
	{#if enabledProviders.length > 0}
		<span>Providers:</span>
		{#each enabledProviders as provider (provider.id)}
			<img src={provider.icon} class="size-4" alt="{provider.name} Logo" />
		{/each}
	{:else}
		Edit Providers
	{/if}
</button>

<dialog bind:this={dialogEl} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box h-full max-h-full w-full max-w-sm sm:h-fit sm:max-h-[90vh]">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute top-6 right-6"
				onclick={() => dialogEl?.close()}
			>
				<X class="size-5" />
			</button>
		</form>

		<h3 class="text-lg font-bold">Edit Providers</h3>

		<ul class="flex flex-col gap-0.5 overflow-y-auto p-2">
			{#each workingList as provider, i (provider.id)}
				<li
					ondragover={(e) => onDragOver(e, i)}
					ondrop={(e) => onDrop(e, i)}
					ondragend={onDragEnd}
					class="hover:bg-base-300 focus:bg-base-300 flex items-center rounded-lg transition-all duration-100 select-none
						{dragIndex === i
						? 'scale-95 opacity-40'
						: dragOverIndex === i && dragIndex !== i
							? 'bg-primary/10 ring-primary scale-[1.02] ring-1'
							: ''}"
				>
					<button
						draggable="true"
						tabindex="-1"
						ondragstart={(e) => {
							dragIndex = i;
							onDragStart(e, i);
						}}
						class="text-base-content/60 active:text-base-content cursor-grab px-2 py-2 active:cursor-grabbing"
					>
						<GripVertical class="size-4 shrink-0" />
					</button>
					<button class="label flex-1" onclick={() => toggleCheck(i)}>
						<input
							type="checkbox"
							class="checkbox checkbox-sm checkbox-primary"
							checked={provider.enabled}
							tabindex="-1"
						/>
						<ProviderLabel {provider} />
					</button>
				</li>
			{/each}
		</ul>
	</div>

	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
