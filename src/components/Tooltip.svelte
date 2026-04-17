<script lang="ts">
	import { computePosition, flip, shift, offset, arrow, autoUpdate } from '@floating-ui/dom';
	import type { Snippet } from 'svelte';

	interface Props {
		tip: string;
		position?: 'top' | 'bottom' | 'left' | 'right';
		class?: string;
		tipClass?: string;
		children: Snippet;
		open?: boolean;
	}

	let {
		tip,
		position = 'top',
		class: className = '',
		tipClass = '',
		children,
		open = $bindable(false),
	}: Props = $props();

	let triggerEl = $state<HTMLElement | null>(null);
	let tooltipEl: HTMLDivElement | null = null;
	let arrowEl: HTMLDivElement | null = null;
	let cleanup: (() => void) | null = null;

	function place() {
		if (!triggerEl || !tooltipEl || !arrowEl) return;

		computePosition(triggerEl, tooltipEl, {
			placement: position,
			middleware: [offset(10), flip(), shift({ padding: 6 }), arrow({ element: arrowEl })],
		}).then(({ x, y, placement, middlewareData }) => {
			if (tooltipEl && arrowEl) {
				tooltipEl.style.left = `${x}px`;
				tooltipEl.style.top = `${y}px`;

				if (middlewareData.arrow) {
					const { x: ax, y: ay } = middlewareData.arrow;
					const staticSide = {
						top: 'bottom',
						right: 'left',
						bottom: 'top',
						left: 'right',
					}[placement.split('-')[0]] as string;

					Object.assign(arrowEl.style, {
						left: ax != null ? `${ax}px` : '',
						top: ay != null ? `${ay}px` : '',
						right: '',
						bottom: '',
						[staticSide]: '-4px',
					});
				}
			}
		});
	}

	function show() {
		if (!tip || tooltipEl) return;

		tooltipEl = document.createElement('div');
		tooltipEl.classList.add(
			'fixed',
			'z-9999',
			'pointer-events-none',
			'p-2',
			'rounded-2xl',
			'bg-neutral',
			'text-neutral-content',
			'text-sm',
			'opacity-0',
			'transition-opacity',
			'duration-100',
			'max-w-xs',
			'text-center'
		);
		if (tipClass) tooltipEl.classList.add(tipClass);
		tooltipEl.textContent = tip;

		arrowEl = document.createElement('div');
		arrowEl.classList.add('absolute', 'w-2', 'h-2', 'bg-neutral', 'rotate-45');
		tooltipEl.appendChild(arrowEl);

		document.body.appendChild(tooltipEl);
		cleanup = autoUpdate(triggerEl!, tooltipEl, place);

		requestAnimationFrame(() => {
			if (tooltipEl) {
				tooltipEl.classList.remove('opacity-0');
				tooltipEl.classList.add('opacity-100');
				open = true;
			}
		});
	}

	function hide() {
		if (tooltipEl) {
			tooltipEl.classList.remove('opacity-100');
			tooltipEl.classList.add('opacity-0');

			const elToRemove = tooltipEl;
			const currentCleanup = cleanup;

			setTimeout(() => {
				if (!open) {
					currentCleanup?.();
					elToRemove.remove();
				}
			}, 100);

			tooltipEl = null;
			arrowEl = null;
			cleanup = null;
			open = false;
		}
	}

	function toggle() {
		if (open) hide();
		else show();
	}

	$effect(() => {
		if (open) {
			const handleOutsideClick = (e: MouseEvent) => {
				if (triggerEl && !triggerEl.contains(e.target as Node)) hide();
			};
			window.addEventListener('click', handleOutsideClick, true);
			return () => window.removeEventListener('click', handleOutsideClick, true);
		}
	});

	$effect(() => {
		return () => {
			cleanup?.();
			tooltipEl?.remove();
		};
	});
</script>

<div
	role="presentation"
	bind:this={triggerEl}
	onmouseenter={show}
	onmouseleave={hide}
	onclick={toggle}
	onfocusin={show}
	onfocusout={hide}
	class={className}
>
	{@render children()}
</div>
