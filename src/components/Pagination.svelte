<script lang="ts">
	import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-svelte';
	import { SvelteSet } from 'svelte/reactivity';

	interface Props {
		page: number;
		minPage?: number;
		maxPage: number;
		onchange: (page: number) => void;
		class?: string;
	}

	let { page, minPage = 1, maxPage, onchange, class: className = '' }: Props = $props();

	const hasPrevPage = $derived(page > minPage);
	const hasNextPage = $derived(page < maxPage);

	const allPages = $derived.by(() => {
		if (maxPage <= 0) return [];

		const clampedPage = Math.min(Math.max(page, minPage), maxPage);
		const pages = new SvelteSet<number>();

		pages.add(minPage);
		pages.add(clampedPage);
		pages.add(maxPage);

		const maxLength = 3;
		let offset = 1;
		while (pages.size < maxLength) {
			let added = false;

			if (clampedPage - offset >= minPage && pages.size < maxLength) {
				pages.add(clampedPage - offset);
				added = true;
			}

			if (clampedPage + offset <= maxPage && pages.size < maxLength) {
				pages.add(clampedPage + offset);
				added = true;
			}

			if (!added) break;
			offset++;
		}

		return Array.from(pages).sort((a, b) => a - b);
	});

	function hasGapBefore(index: number): boolean {
		if (index === 0) return false;
		return allPages[index] - allPages[index - 1] > 1;
	}
</script>

{#if maxPage > minPage}
	<nav class="flex items-center p-4 {className}">
		<div class="join">
			<button
				onclick={() => onchange(minPage)}
				disabled={!hasPrevPage}
				class="join-item btn btn-sm sm:btn-md btn-soft btn-square"
			>
				<ChevronsLeft class="size-5" />
			</button>

			<button
				onclick={() => onchange(page - 1)}
				disabled={!hasPrevPage}
				class="join-item btn btn-sm sm:btn-md btn-soft btn-square"
			>
				<ChevronLeft class="size-5" />
			</button>

			{#each allPages as p, i (p)}
				{#if hasGapBefore(i)}
					<button
						class="join-item btn btn-sm sm:btn-md btn-disabled"
						tabindex="-1"
						aria-hidden="true"
					>
						&hellip;
					</button>
				{/if}

				<button
					onclick={() => onchange(p)}
					class="join-item btn btn-sm sm:btn-md"
					class:btn-primary={p === page}
					class:btn-soft={p !== page}
				>
					{p}
				</button>
			{/each}

			<button
				onclick={() => onchange(page + 1)}
				disabled={!hasNextPage}
				class="join-item btn btn-sm sm:btn-md btn-soft btn-square"
			>
				<ChevronRight class="size-5" />
			</button>

			<button
				onclick={() => onchange(maxPage)}
				disabled={!hasNextPage}
				class="join-item btn btn-sm sm:btn-md btn-soft btn-square"
			>
				<ChevronsRight class="size-5" />
			</button>
		</div>
	</nav>
{/if}
