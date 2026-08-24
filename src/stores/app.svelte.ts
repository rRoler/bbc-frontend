export const appState = $state<{
	loading: boolean;
	errors: Error[];
}>({
	loading: false,
	errors: [],
});

export function addAppError(error: unknown) {
	console.error(error);
	appState.errors.push(error as Error);
}

export function removeAppError(error: unknown) {
	const index = appState.errors.indexOf(error as Error);
	if (index !== -1) appState.errors.splice(index, 1);
}
