<script lang="ts">
	import { Info, RotateCcw } from 'lucide-svelte';
	import allSettingsFields, { themeSetting } from '../lib/svelte/settings.svelte.ts';
	import ProviderSelector from './ProviderSelector.svelte';
	import { appState } from '../lib/svelte/app.svelte.ts';
	import { onMount } from 'svelte';

	onMount(() => {
		appState.loading = true;

		allSettingsFields.forEach((f) => f.load());

		appState.loading = false;
	});
</script>

<div class="flex w-full flex-col gap-2 sm:w-2xl">
	{#each allSettingsFields as field, fieldIndex (fieldIndex)}
		<fieldset class="fieldset border-accent w-full rounded-2xl border p-4">
			<legend class="fieldset-legend text-2xl">
				{field.name}
			</legend>

			{#each field.settings as setting, settingIndex (setting.id)}
				<label class="label text-base-content text-base">
					<span>{setting.name}</span>
					{#if setting.tooltip}
						<div class="tooltip" data-tip={setting.tooltip}>
							<Info class="size-4 cursor-help" />
						</div>
					{/if}
				</label>

				{#if setting.description}
					<p class="label text-wrap! whitespace-pre">{setting.description}</p>
				{/if}

				<div class="flex w-full flex-row items-start justify-center gap-2">
					{#if setting.type === 'text'}
						<input bind:value={setting.value} class="input w-full" type="text" />
					{:else if setting.type === 'textarea'}
						<textarea bind:value={setting.value} class="textarea w-full"></textarea>
					{:else if setting.type === 'provider-select'}
						<div class="flex w-full flex-row justify-center sm:justify-start">
							<ProviderSelector bind:selected={setting.value} paramsEnabled={false} delayMs={0} />
						</div>
					{:else if setting.type === 'toggle'}
						<input bind:checked={setting.value} class="toggle" type="checkbox" />
						<div class="grow"></div>
					{:else if setting.type === 'select'}
						<select bind:value={setting.value} class="select w-full">
							{#each setting.options as option, index (index)}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					{:else if setting.type === 'range'}
						<div class="flex w-full flex-row items-center justify-center gap-2 p-2">
							<p class="w-6 shrink-0 text-base font-semibold">{setting.value}</p>
							<input
								bind:value={setting.value}
								class="range w-full"
								type="range"
								min={setting.min}
								max={setting.max}
								step={setting.step}
							/>
						</div>
					{/if}

					<div class="tooltip tooltip-top" data-tip="Reset">
						<button
							class="btn btn-circle btn-soft"
							disabled={setting.isDefault}
							onclick={() => setting.reset()}
						>
							<RotateCcw class="size-6" />
						</button>
					</div>
				</div>

				{#if settingIndex < field.settings.length - 1}
					<div class="divider divider-accent"></div>
				{/if}
			{/each}
		</fieldset>
	{/each}
</div>

<div class="grow"></div>

<div class="sticky bottom-0 left-0 flex w-full flex-row items-center justify-center p-4 sm:w-2xl">
	<button
		onclick={() => {
			const shouldReload = [themeSetting].some((s) => s.isChanged);
			allSettingsFields.forEach((f) => f.save());
			if (shouldReload) window.location.reload();
		}}
		class="btn btn-lg btn-primary shadow-lg"
		disabled={!allSettingsFields.some((f) => f.isChanged)}
	>
		Save
	</button>
</div>
