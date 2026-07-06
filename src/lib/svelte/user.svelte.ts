import { userLoginSetting, userTokenSetting } from './settings.svelte.ts';
import { addAppError } from './app.svelte.ts';
import { SvelteURLSearchParams } from 'svelte/reactivity';
import { BBC_API_URL } from '../constants.ts';

export interface UserSession {
	role: string;
	username: string | null;
	userId: string;
}

export class UserState {
	readonly apiUrl = BBC_API_URL.origin;
	session = $state<UserSession | null>(null);

	async init(): Promise<void> {
		const params = new SvelteURLSearchParams(window.location.search);
		const urlToken = params.get('user_token');
		const urlSessionId = params.get('session_id');
		if (urlToken || urlSessionId) {
			if (urlToken) this.token = urlToken;
			if (urlSessionId) this.sessionId = urlSessionId;
			params.delete('user_token');
			params.delete('session_id');
			const qs = params.size ? `?${params}` : '';
			window.history.replaceState(null, '', `${window.location.pathname}${qs}`);
		}

		await this.checkSession();
	}

	private get token(): string | null {
		userTokenSetting.load();
		return userTokenSetting.value;
	}
	private set token(v) {
		userTokenSetting.value = v;
		userTokenSetting.save();
	}

	private get sessionId(): string | null {
		userLoginSetting.load();
		return userLoginSetting.value;
	}
	private set sessionId(v) {
		userLoginSetting.value = v;
		userLoginSetting.save();
	}

	get headers(): Record<string, string> {
		const token = this.token;
		const sessionId = this.sessionId;
		return {
			...(token ? { 'X-User-Token': token } : {}),
			...(sessionId ? { 'X-Session-Id': sessionId } : {}),
		};
	}

	async checkSession(): Promise<void> {
		if (!this.token) {
			this.session = null;
			return;
		}

		try {
			const res = await fetch(`${this.apiUrl}/user/me`, { headers: this.headers });
			if (res.status === 401) {
				this.token = null;
				this.sessionId = null;
				throw new Error("You've been logged out. Please login again.");
			}
			if (!res.ok) {
				throw new Error(`Failed to fetch user session: ${res.statusText}`);
			}
			const { data } = await res.json();
			this.session = data;
		} catch (e) {
			this.session = null;
			addAppError(e);
		}
	}

	login(): void {
		window.location.href = `${this.apiUrl}/user/login`;
	}

	async logout(): Promise<void> {
		fetch(`${this.apiUrl}/user/logout`, {
			method: 'POST',
			headers: this.headers,
		}).catch(() => {});

		this.token = null;
		this.sessionId = null;
		this.session = null;
	}
}

const userState = new UserState();
export default userState;
