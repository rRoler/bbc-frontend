<script lang="ts">
	import allProviders from '../lib/svelte/providers.svelte.ts';
	import { addAppError } from '../lib/svelte/app.svelte.ts';
	import BBC_API, { endpointLabels, type ProviderStatus } from '../lib/apis/bbc.ts';
	import { onMount } from 'svelte';
	import prettyMilliseconds from 'pretty-ms';
	import ProviderLabel from './ProviderLabel.svelte';

	const api = new BBC_API();

	let initialLoad = $state<Record<string, boolean>>({});
	let providerStatuses = $state<Record<string, ProviderStatus[]>>({});

	async function checkProviders(): Promise<void> {
		await Promise.all(
			allProviders.sorted.map(async (p) => {
				const results = await Promise.all(
					p.supportedEndpoints.map(async (ep) => {
						try {
							return await api.getEndpointStatus(p.id, ep);
						} catch {
							return {
								providerEndpoint: endpointLabels[ep] ?? `GET ${ep}`,
								status: false,
								statusText: 'Error',
								latencyMs: 0,
								clientError: true,
							};
						}
					})
				);

				initialLoad[p.id] = false;
				providerStatuses[p.id] = results;
			})
		);
	}

	function getProviderStatusClass(
		pStatuses: ProviderStatus[]
	): 'status-success' | 'status-warning' | 'status-error' | 'status-neutral' {
		if (pStatuses.every((p) => p.status)) return 'status-success';
		if (pStatuses.some((p) => p.status)) return 'status-warning';
		if (pStatuses.every((p) => p.clientError)) return 'status-neutral';
		return 'status-error';
	}

	onMount(async () => {
		try {
			initialLoad = Object.fromEntries(allProviders.sorted.map((p) => [p.id, true]));
			await checkProviders();
		} catch (e) {
			addAppError(e);
		}
		setInterval(async () => {
			try {
				await checkProviders();
			} catch (e) {
				addAppError(e);
			}
		}, 300_000);
	});
</script>

<div class="relative flex h-full w-full flex-col items-center gap-4 lg:w-4/6">
	<h2 class="text-base-content mb-2 text-4xl">Service Status</h2>

	<h3 class="text-base-content/80 text-2xl">Providers</h3>
	<div class="join join-vertical w-full">
		{#each allProviders.sorted as provider (provider.id)}
			{#if initialLoad[provider.id]}
				<div class="collapse-arrow join-item border-base-300 collapse border">
					<div class="collapse-title flex items-center gap-2 font-semibold">
						<div class="skeleton h-3 w-3 shrink-0 rounded-full"></div>
						<div class="skeleton h-4 w-32"></div>
						<div class="skeleton ml-auto h-4 w-12"></div>
					</div>
					<div class="collapse-content">
						<div class="flex flex-col gap-3 p-2">
							{#each Array(provider.supportedEndpoints.length) as _, i (i)}
								<div class="skeleton h-5 w-full"></div>
							{/each}
						</div>
					</div>
				</div>
			{:else}
				{@const pStatuses = providerStatuses[provider.id]}
				{#if pStatuses}
					{@const providerStatusClass = getProviderStatusClass(pStatuses)}
					{@const avgLatency = Math.round(
						pStatuses.reduce((sum, p) => sum + p.latencyMs, 0) / pStatuses.length
					)}

					<div class="collapse-arrow join-item border-base-300 collapse border">
						<input type="checkbox" />
						<div class="collapse-title flex items-center gap-4 font-semibold">
							<div class="inline-grid *:[grid-area:1/1]">
								<div class="status {providerStatusClass} animate-ping"></div>
								<div class="status {providerStatusClass}"></div>
							</div>
							<ProviderLabel
								{provider}
								iconClass="size-5 sm:size-6"
								textClass="text-sm sm:text-lg"
							/>
							<span class="badge badge-ghost badge-sm ml-auto"
								>{prettyMilliseconds(avgLatency)}</span
							>
						</div>
						<div class="collapse-content">
							<ul class="list rounded-box shadow-md">
								{#each pStatuses as pStatus (pStatus.providerEndpoint)}
									{@const statusClass = pStatus.status
										? 'status-success'
										: pStatus.clientError
											? 'status-neutral'
											: 'status-error'}

									<li class="list-row items-center justify-center">
										<div class="inline-grid *:[grid-area:1/1]">
											<div class="status {statusClass} animate-ping"></div>
											<div class="status {statusClass}"></div>
										</div>
										<div class="inline-flex w-full flex-row justify-between">
											<h3 class="font-semibold sm:text-lg">{pStatus.providerEndpoint}</h3>
											<div class="flex items-center gap-2">
												<span class="badge badge-ghost badge-sm"
													>{prettyMilliseconds(pStatus.latencyMs)}</span
												>
												<span class="text-md hidden sm:inline-block">{pStatus.statusText}</span>
											</div>
										</div>
									</li>
								{/each}
							</ul>
						</div>
					</div>
				{/if}
			{/if}
		{/each}
	</div>

	<p class="text-base-content text-sm opacity-50">
		Note: statuses are cached server-side for 5 minutes and refreshed automatically
	</p>
</div>
