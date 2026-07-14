<script lang="ts">
	import allProviders, {
		getEnabledProviders,
		type Provider,
		type ProviderStorageEntry,
	} from '../lib/svelte/providers.svelte.ts';
	import { mapToStoreEntries } from '../lib/providers.ts';
	import ProviderLabel from './ProviderLabel.svelte';
	import { GripVertical, Settings2, X } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let {
		class: className = '',
		providers = $bindable<ProviderStorageEntry[]>(mapToStoreEntries(allProviders.sorted)),
		onchange,
	}: {
		class?: string;
		providers?: ProviderStorageEntry[];
		onchange?: (providers: ProviderStorageEntry[]) => void | Promise<void>;
	} = $props();

	let workingList = $state<Provider[]>(allProviders.sorted);
	let enabledProviders = $derived(getEnabledProviders(workingList));
	let dialogEl = $state<HTMLDialogElement>();

	onMount(() => {
		reset();
	});

	function reset() {
		allProviders.load();
		workingList = allProviders.sorted;
	}

	function openModal() {
		workingList = allProviders.expandStoreEntries(providers);
		dialogEl?.showModal();
	}

	function commit() {
		providers = mapToStoreEntries(workingList);
		onchange?.(providers);
	}

	function toggleCheck(index: number) {
		workingList[index] = { ...workingList[index], enabledByDefault: !workingList[index].enabledByDefault };
		commit();
	}

	let dragIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	// ── Mouse / pointer drag (desktop) ──────────────────────────────────────

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
		reorder(dragIndex, dropIndex);
	}

	function onDragEnd() {
		dragIndex = null;
		dragOverIndex = null;
	}

	// ── Touch drag (mobile) ──────────────────────────────────────────────────

	function gripTouchDrag(node: HTMLElement, index: number) {
		let current = index;
		const handler = () => {
			dragIndex = current;
		};
		node.addEventListener('touchstart', handler, { passive: true });
		return {
			update(i: number) {
				current = i;
			},
		};
	}

	function listTouchDrag(node: HTMLElement) {
		function onTouchMove(e: TouchEvent) {
			if (dragIndex === null) return;
			e.preventDefault();
			const touch = e.touches[0];
			const el = document.elementFromPoint(touch.clientX, touch.clientY);
			const li = (el as HTMLElement)?.closest<HTMLElement>('li[data-index]');
			if (li) {
				const idx = Number(li.dataset.index);
				if (!isNaN(idx)) dragOverIndex = idx;
			}
		}

		function onTouchEnd() {
			if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
				reorder(dragIndex, dragOverIndex);
			}
			dragIndex = null;
			dragOverIndex = null;
		}

		node.addEventListener('touchmove', onTouchMove, { passive: false });
		node.addEventListener('touchend', onTouchEnd);
	}

	// ── Shared reorder logic ─────────────────────────────────────────────────

	function reorder(fromIndex: number, toIndex: number) {
		const reordered = [...workingList];
		const [moved] = reordered.splice(fromIndex, 1);
		reordered.splice(toIndex, 0, moved);
		workingList = reordered.map((p, i) => ({ ...p, priority: i + 1 }));
		commit();
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

		<ul class="flex flex-col gap-0.5 overflow-y-auto p-2" use:listTouchDrag>
			{#each workingList as provider, i (provider.id)}
				<li
					data-index={i}
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
						use:gripTouchDrag={i}
						ondragstart={(e) => {
							dragIndex = i;
							onDragStart(e, i);
						}}
						class="text-base-content/60 active:text-base-content cursor-grab touch-none px-2 py-2 active:cursor-grabbing"
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

		<div class="modal-action">
			<form method="dialog">
				<button
					class="btn"
					onclick={() => {
						reset();
						dialogEl?.close();
					}}
				>
					Cancel
				</button>
				<button class="btn btn-primary" onclick={() => dialogEl?.close()}> Done </button>
			</form>
		</div>
	</div>

	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
