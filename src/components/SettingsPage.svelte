<script lang="ts">
	import { Info, RotateCcw, Folder, FolderOpen, X, Save } from 'lucide-svelte';
	import allSettingsFields, {
		themeSetting,
		fileSystemFolderSetting,
	} from '../lib/svelte/settings.svelte.ts';
	import ProviderEditor from './ProviderEditor.svelte';
	import { addAppError, appState } from '../lib/svelte/app.svelte.ts';
	import { FileSystem } from '../lib/svelte/filesystem.svelte.ts';
	import { onMount } from 'svelte';
	import Tooltip from './Tooltip.svelte';
	import userState from '../lib/svelte/user.svelte.ts';

	const fs = new FileSystem();

	onMount(async () => {
		appState.loading = true;

		allSettingsFields.forEach((f) => f.load());

		await fs.restore();
		if (fs.hasFolder) {
			fileSystemFolderSetting.value = fs.folderName;
			fileSystemFolderSetting.save();
		}

		appState.loading = false;
	});

	async function pickFolder() {
		try {
			const h = await fs.pickFolder();
			fileSystemFolderSetting.value = h.name;
			fileSystemFolderSetting.save();
		} catch (error) {
			if ((error as Error)?.name !== 'AbortError') addAppError(error);
		}
	}

	async function clearFolder() {
		await fs.clearFolder();
		fileSystemFolderSetting.value = null;
		fileSystemFolderSetting.save();
	}

	function filterSettings(settings: (typeof allSettingsFields)[number]['settings'][number][]) {
		return settings.filter((s) => !s.loginOnly || (s.loginOnly && userState.session));
	}
</script>

<div class="flex w-full flex-col gap-2 sm:w-2xl">
	{#each allSettingsFields as field, fieldIndex (fieldIndex)}
		{@const filteredSettings = filterSettings(field.settings)}

		<fieldset class="fieldset border-accent w-full rounded-2xl border p-4">
			<legend class="fieldset-legend text-2xl">
				{field.name}
			</legend>

			{#each filteredSettings as setting, settingIndex (setting.id)}
				<label id={setting.id} class="label text-base-content text-base">
					<a href="#{setting.id}">{setting.name}</a>
					{#if setting.tooltip}
						<Tooltip position="top" tip={setting.tooltip}>
							<Info class="size-4 cursor-help" />
						</Tooltip>
					{/if}
				</label>

				{#if setting.description}
					<p class="label text-wrap! whitespace-pre">{setting.description}</p>
				{/if}

				<div class="flex w-full min-w-0 flex-row items-start justify-center gap-2">
					{#if setting.type === 'text'}
						<input bind:value={setting.value} class="input w-full" type="text" />
					{:else if setting.type === 'textarea'}
						<textarea bind:value={setting.value} class="textarea w-full"></textarea>
					{:else if setting.type === 'provider-editor'}
						<div class="flex w-full flex-row justify-center sm:justify-start">
							<ProviderEditor bind:providers={setting.value} />
						</div>
					{:else if setting.type === 'toggle'}
						<input bind:checked={setting.value} class="toggle" type="checkbox" />
						<div class="grow"></div>
					{:else if setting.type === 'select'}
						<select bind:value={setting.value} class="select inline-block w-full">
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
					{:else if setting.type === 'file-system-folder-picker'}
						<div class="flex w-full min-w-0 flex-row items-center gap-2">
							<div class="input flex min-w-0 flex-1 flex-row items-center gap-2 overflow-hidden">
								{#if fs.hasFolder}
									<FolderOpen class="text-success size-4 shrink-0" />
								{:else}
									<Folder class="text-base-content/30 size-4 shrink-0" />
								{/if}
								<span
									class="truncate text-sm {fs.hasFolder
										? 'text-base-content'
										: 'text-base-content/40'}"
								>
									{fs.folderName ?? 'No folder selected'}
								</span>
							</div>

							<Tooltip
								position="top"
								tip={fs.supported ? 'Pick folder' : (fs.support.reason ?? 'Not supported')}
							>
								<button
									class="btn btn-soft sm:rounded-btn aspect-square rounded-full px-0 sm:aspect-auto sm:px-4"
									class:btn-success={fs.hasFolder}
									onclick={pickFolder}
									disabled={!fs.supported}
								>
									<Folder class="size-4" />
									<span class="hidden sm:inline">{fs.hasFolder ? 'Change' : 'Pick'}</span>
								</button>
							</Tooltip>

							{#if fs.hasFolder}
								<button class="btn btn-soft btn-error btn-square" onclick={clearFolder}>
									<X class="size-4" />
								</button>
							{/if}
						</div>
					{:else if setting.type === 'login'}
						<div class="flex w-full min-w-0 flex-row items-center">
							{#if userState.session}
								<div class="join min-w-0">
									<p
										class="join-item bg-neutral flex min-w-0 items-center justify-center truncate px-8 text-lg"
									>
										{userState.session.username}
									</p>
									<button
										class="btn btn-soft btn-error join-item shrink-0"
										onclick={() => userState.logout()}
									>
										Logout
									</button>
								</div>
							{:else}
								<button class="btn btn-soft btn-primary" onclick={() => userState.login()}>
									Login with MangaBaka
									<img
										alt="MangaBaka Logo"
										src="https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://mangabaka.org&size=64"
										class="size-6"
									/>
								</button>
							{/if}
						</div>
					{/if}

					<Tooltip position="top" tip="Reset">
						<button
							class="btn btn-circle btn-soft"
							disabled={setting.isDefault}
							onclick={() => {
								setting.reset();
								if (setting.type === 'file-system-folder-picker') clearFolder();
							}}
						>
							<RotateCcw class="size-6" />
						</button>
					</Tooltip>
				</div>

				{#if settingIndex < filteredSettings.length - 1}
					<div class="divider divider-accent"></div>
				{/if}
			{/each}
		</fieldset>
	{/each}
</div>

<div class="grow"></div>

<div
	class="sticky bottom-0 left-0 flex w-full flex-row items-center justify-center gap-2 p-4 sm:w-2xl"
>
	<button
		onclick={() => {
			allSettingsFields.forEach((f) => f.load());
			if (fs.hasFolder) clearFolder();
		}}
		class="btn btn-lg btn-neutral shadow-lg"
		disabled={!allSettingsFields.some((f) => f.isChanged)}
	>
		<X class="size-6" />
		Cancel
	</button>

	<button
		onclick={() => {
			const shouldReload = [themeSetting].some((s) => s.isChanged);
			allSettingsFields.forEach((f) => f.save());
			if (shouldReload) window.location.reload();
		}}
		class="btn btn-lg btn-primary shadow-lg"
		disabled={!allSettingsFields.some((f) => f.isChanged)}
	>
		<Save class="size-6" />
		Save
	</button>
</div>
