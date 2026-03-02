#!/usr/bin/env node
//
// Packages covers.roler.dev into native desktop installers using Electron.
// The app loads the live URL — the service worker handles offline support.
//
// Prereqs:
//   pnpm add -D electron electron-builder sharp to-ico
//
// Usage (no `pnpm build` needed):
//   node scripts/package-pwa.mjs                  ← all platforms
//   node scripts/package-pwa.mjs --platform=windows
//   node scripts/package-pwa.mjs --platform=mac
//   node scripts/package-pwa.mjs --platform=linux
//   node scripts/package-pwa.mjs --platform=android
//
// Output: ./pwa-packages/

import { execSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	readdirSync,
	renameSync,
	rmSync,
	writeFileSync,
	readFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { homedir, tmpdir } from 'node:os';

const req = createRequire(import.meta.url);
const rootPkg = req('../package.json');

const APP_NAME = 'Big Book Covers';
const APP_NAME_SLUG = APP_NAME.toLowerCase().replaceAll(' ', '-');
const APP_ID = 'dev.roler.covers';
const APP_URL = new URL('https://covers.roler.dev');
const OUT = './pwa-packages';
const FAVICON_SVG = fileURLToPath(new URL('../public/favicon.svg', import.meta.url));

// YYYY.MM.DD build version
const VERSION = (() => {
	const d = new Date();
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`;
})();

// electron-builder normalizes version segments (strips leading zeros), e.g.
// 2026.03.01 → 2026.3.1. Use this for RENAME keys that come from eb filenames.
const EB_VERSION = VERSION.split('.').map(Number).join('.');

const RENAME = {
	[`${APP_NAME} Setup ${EB_VERSION}.exe`]: `bbc-windows_setup.exe`,
	[`${APP_NAME}-${EB_VERSION}.dmg`]: `bbc-mac.dmg`,
	[`${APP_NAME}-${EB_VERSION}.AppImage`]: `bbc-linux.AppImage`,
	[`${APP_NAME_SLUG}_${EB_VERSION}_amd64.deb`]: `bbc-linux.deb`,
	'app-release-signed.apk': `bbc-android.apk`,
};

const platform = process.argv.find((a) => a.startsWith('--platform='))?.split('=')[1] ?? 'all';

mkdirSync(OUT, { recursive: true });

function run(cmd, opts = {}) {
	console.log(`\n▶  ${cmd}\n`);
	execSync(cmd, { stdio: 'inherit', ...opts });
}

function collect(dir) {
	for (const name of readdirSync(dir)) {
		const dest = RENAME[name];
		if (!dest) continue;
		renameSync(join(dir, name), join(OUT, dest));
		console.log(`  ✔  ${dest}`);
	}
}

// ── Icon generation ───────────────────────────────────────────────────────────
async function writeIcons(buildDir) {
	mkdirSync(buildDir, { recursive: true });

	if (!existsSync(FAVICON_SVG)) {
		console.warn(`  ⚠  ${FAVICON_SVG} not found — default electron icon will be used.`);
		return { ico: null, png: null };
	}

	try {
		const { default: sharp } = await import('sharp');
		const { default: toIco } = await import('to-ico');
		const svgBuf = readFileSync(FAVICON_SVG);

		const icoSizes = [16, 32, 48, 64, 128, 256];
		const pngBuffers = await Promise.all(
			icoSizes.map((size) =>
				sharp(svgBuf, { density: Math.ceil((size / 16) * 72) })
					.resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
					.png()
					.toBuffer()
			)
		);

		const icoPath = join(buildDir, 'icon.ico');
		writeFileSync(icoPath, await toIco(pngBuffers));
		console.log(`  ✔  icon.ico → ${icoPath} (${icoSizes.join('/')}px)`);

		const pngPath = join(buildDir, 'icon.png');
		await sharp(svgBuf, { density: 300 })
			.resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
			.png()
			.toFile(pngPath);
		console.log(`  ✔  icon.png → ${pngPath} (1024px)`);

		return { ico: icoPath, png: pngPath };
	} catch (e) {
		console.warn(`  ⚠  Icon generation failed: ${e.message}`);
		console.warn('     Run: pnpm add -D sharp to-ico');
		return { ico: null, png: null };
	}
}

// ── Electron main process ─────────────────────────────────────────────────────
const MAIN_JS = `
'use strict';
const { app, BrowserWindow, Menu } = require('electron');

Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  const win = new BrowserWindow({
		width: 1280,
		height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.once('ready-to-show', () => {
		win.maximize();
		win.show();
	});
  win.loadURL('${APP_URL.href}');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
`;

// ── Build one desktop target ──────────────────────────────────────────────────
async function buildElectron(ebFlag, targets, outDir) {
	outDir = resolve(outDir);
	const appDir = join(tmpdir(), 'eb-bbc-app');
	rmSync(appDir, { recursive: true, force: true });
	mkdirSync(appDir, { recursive: true });

	writeFileSync(join(appDir, 'main.js'), MAIN_JS);
	writeFileSync(
		join(appDir, 'package.json'),
		JSON.stringify(
			{
				name: 'big-book-covers',
				version: VERSION,
				description: 'Download high-quality book covers',
				homepage: APP_URL.href,
				author: { name: 'roler', email: '60528736+rRoler@users.noreply.github.com' },
				main: 'main.js',
				dependencies: {},
			},
			null,
			2
		)
	);

	const icons = await writeIcons(join(appDir, 'build'));

	const electronVersion = req('electron/package.json').version;

	const config = {
		appId: APP_ID,
		productName: APP_NAME,
		electronVersion,
		npmRebuild: false,
		files: ['main.js', 'package.json', 'build/**/*'],
		asar: true,
		directories: {
			output: outDir,
			buildResources: join(appDir, 'build'),
		},
		...targets,
	};

	if (icons.ico && ebFlag === 'win') config.icon = resolve(appDir, 'build', 'icon.ico');
	else if (icons.png) config.icon = resolve(appDir, 'build', 'icon.png');

	const configFile = resolve(`_eb-${ebFlag}.json`);
	writeFileSync(configFile, JSON.stringify(config, null, 2));

	try {
		run(
			`npx electron-builder --${ebFlag} --projectDir ${JSON.stringify(appDir)} --config ${JSON.stringify(configFile)}`
		);
		collect(outDir);
	} finally {
		rmSync(outDir, { recursive: true, force: true });
		rmSync(configFile, { force: true });
		rmSync(appDir, { recursive: true, force: true });
	}
}

// ── Windows ───────────────────────────────────────────────────────────────────
if (platform === 'all' || platform === 'windows') {
	await buildElectron(
		'win',
		{
			win: {
				target: [{ target: 'nsis', arch: ['x64'] }],
				compression: 'maximum',
			},
			nsis: {
				oneClick: false,
				allowToChangeInstallationDirectory: true,
				createDesktopShortcut: true,
				createStartMenuShortcut: true,
				runAfterFinish: true,
			},
		},
		'./tmp-win-dist'
	);
}

// ── macOS ─────────────────────────────────────────────────────────────────────
if (platform === 'all' || platform === 'mac') {
	await buildElectron(
		'mac',
		{
			mac: {
				target: [{ target: 'dmg', arch: ['x64', 'arm64'] }],
				identity: null,
			},
			dmg: {
				contents: [
					{ x: 130, y: 220 },
					{ x: 410, y: 220, type: 'link', path: '/Applications' },
				],
			},
		},
		'./tmp-mac-dist'
	);
}

// ── Linux ─────────────────────────────────────────────────────────────────────
if (platform === 'all' || platform === 'linux') {
	await buildElectron(
		'linux',
		{
			linux: {
				target: ['AppImage', 'deb'],
				category: 'Utility',
				maintainer: '60528736+rRoler@users.noreply.github.com',
				desktop: {
					entry: {
						Name: APP_NAME,
						Comment: 'Download high-quality book covers',
						Categories: 'Utility;',
					},
				},
			},
		},
		'./tmp-linux-dist'
	);
}

// ── Android manifest patcher ──────────────────────────────────────────────────
// Injects storage permissions required for the File System Access API
// (window.showDirectoryPicker / showSaveFilePicker) to read and write media
// files into a user-selected folder on Android 10–14+.
//
// Permissions injected:
//   READ_EXTERNAL_STORAGE            (≤ API 32 / Android 12L — legacy broad storage)
//   WRITE_EXTERNAL_STORAGE           (≤ API 29 / Android 9   — legacy write)
//   READ_MEDIA_IMAGES                (API 33+ / Android 13   — granular media read)
//   READ_MEDIA_VIDEO                 (API 33+)
//   READ_MEDIA_AUDIO                 (API 33+)
//   READ_MEDIA_VISUAL_USER_SELECTED  (API 34+ / Android 14   — photo picker partial access)
//
// MANAGE_EXTERNAL_STORAGE is intentionally omitted — it requires a special
// Play Store declaration and is unnecessary for SAF/picker-based flows.
function patchAndroidManifest(androidDir) {
	const manifestPath = join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
	if (!existsSync(manifestPath)) {
		console.warn(`  ⚠  AndroidManifest.xml not found at ${manifestPath} — skipping patch`);
		return;
	}

	const permissions = [
		// Capped with maxSdkVersion so they don't appear on modern Android
		'<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32"/>',
		'<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29"/>',
		// Granular media permissions (Android 13+)
		'<uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>',
		'<uses-permission android:name="android.permission.READ_MEDIA_VIDEO"/>',
		'<uses-permission android:name="android.permission.READ_MEDIA_AUDIO"/>',
		// Partial photo/video access picker (Android 14+)
		'<uses-permission android:name="android.permission.READ_MEDIA_VISUAL_USER_SELECTED"/>',
	];

	let xml = readFileSync(manifestPath, 'utf8');

	// Avoid duplicating entries on re-runs
	const toAdd = permissions.filter((p) => !xml.includes(p));
	if (!toAdd.length) {
		console.log('  ✔  AndroidManifest.xml already patched');
		return;
	}

	// Insert before the opening <application> tag
	const anchor = '<application';
	if (!xml.includes(anchor)) {
		console.warn('  ⚠  Could not find <application> in manifest — skipping patch');
		return;
	}

	xml = xml.replace(anchor, `${toAdd.join('\n    ')}\n\n    ${anchor}`);
	writeFileSync(manifestPath, xml);
	console.log(`  ✔  AndroidManifest.xml patched (+${toAdd.length} storage permissions)`);
}

// ── Android (.apk via bubblewrap TWA) ─────────────────────────────────────────
// Prereqs: npm i -g @bubblewrap/cli  +  JDK 17+  +  Android SDK
// JAVA_HOME must be set (GitHub Actions: use actions/setup-java before this).
//
// Secrets (GitHub Actions):
//   ANDROID_KEYSTORE_BASE64  — base64 -w0 bbc-release.keystore
//   ANDROID_STORE_PASSWORD   — keystore password
//   ANDROID_KEY_PASSWORD     — key password (often same as store password)
// If secrets are absent, a throwaway debug keystore is used (sideload only).
if (platform === 'all' || platform === 'android') {
	const jdkPath = process.env.JAVA_HOME;
	if (!jdkPath) throw new Error('JAVA_HOME is not set — add a setup-java step to your workflow');

	const androidSdkPath = process.env.ANDROID_SDK_ROOT ?? process.env.ANDROID_HOME ?? '';
	if (!androidSdkPath)
		throw new Error('ANDROID_SDK_ROOT is not set — add a setup-android step to your workflow');

	// Pre-configure bubblewrap so it never prompts for JDK/SDK paths.
	const bubblewrapConfigDir = join(homedir(), '.bubblewrap');
	mkdirSync(bubblewrapConfigDir, { recursive: true });
	writeFileSync(
		join(bubblewrapConfigDir, 'config.json'),
		JSON.stringify({ jdkPath, androidSdkPath }, null, 2)
	);

	const androidDir = resolve('./tmp-android');
	mkdirSync(androidDir, { recursive: true });

	try {
		// ── Keystore ────────────────────────────────────────────────────────
		const keystorePath = join(androidDir, 'android.keystore');
		const keystoreB64 = process.env.ANDROID_KEYSTORE_BASE64;
		let storePassword = process.env.ANDROID_STORE_PASSWORD;
		let keyPassword = process.env.ANDROID_KEY_PASSWORD || storePassword;

		if (keystoreB64 && storePassword) {
			// Production: decode the real keystore from the GitHub secret.
			writeFileSync(keystorePath, Buffer.from(keystoreB64, 'base64'));
			console.log('  ✔  Using production keystore from ANDROID_KEYSTORE_BASE64');
		} else {
			// Local dev fallback: generate a throwaway keystore (sideload only).
			console.warn('  ⚠  No keystore secrets found — using debug keystore (sideload only)');
			storePassword = 'android';
			keyPassword = 'android';
			run(
				`keytool -genkeypair -v -keystore ${JSON.stringify(keystorePath)}` +
					` -alias android -keyalg RSA -keysize 2048 -validity 10000` +
					` -dname "CN=BBC, OU=Dev, O=roler.dev, L=Earth, S=Earth, C=US"` +
					` -storepass android -keypass android`
			);
		}

		// ── Web App Manifest ─────────────────────────────────────────────────
		// Fetch the live manifest so twa-manifest.json stays in sync with
		// whatever @vite-pwa/astro generates — no values hardcoded here.
		console.log(`\n▶  Fetching ${APP_URL.origin}/manifest.webmanifest\n`);
		const manifestRes = await fetch(`${APP_URL.origin}/manifest.webmanifest`);
		if (!manifestRes.ok) throw new Error(`Failed to fetch manifest: ${manifestRes.status}`);
		const manifest = await manifestRes.json();

		const themeColor = manifest.theme_color ?? '#000000';
		const bgColor = manifest.background_color ?? '#ffffff';

		const icons = manifest.icons ?? [];
		const icon192 = icons.find((i) => i.sizes === '192x192' && !i.purpose?.includes('maskable'));
		const iconMaskable = icons.find((i) => i.purpose?.includes('maskable'));
		const iconAny = icons.find((i) => !i.purpose?.includes('maskable')) ?? icons[0];

		function iconUrl(entry) {
			if (!entry) return `${APP_URL.origin}/pwa-192x192.png`;
			const src = entry.src;
			return src.startsWith('http') ? src : `${APP_URL.origin}/${src.replace(/^\//, '')}`;
		}

		// Passwords are embedded in twa-manifest.json so bubblewrap update
		// writes them into the gradle signingConfigs block — no prompts at build time.
		writeFileSync(
			join(androidDir, 'twa-manifest.json'),
			JSON.stringify(
				{
					packageId: APP_ID,
					host: APP_URL.host,
					name: manifest.name ?? APP_NAME,
					launcherName: manifest.short_name ?? 'BBC',
					display: manifest.display ?? 'standalone',
					orientation: manifest.orientation ?? 'default',
					themeColor,
					navigationColor: themeColor,
					navigationColorDark: bgColor,
					navigationDividerColor: themeColor,
					navigationDividerColorDark: bgColor,
					backgroundColor: bgColor,
					enableNotifications: false,
					startUrl: manifest.start_url ?? '/',
					iconUrl: iconUrl(icon192 ?? iconAny),
					maskableIconUrl: iconUrl(iconMaskable ?? iconAny),
					monochromeIconUrl: iconUrl(icon192 ?? iconAny),
					shortcuts: manifest.shortcuts ?? [],
					webManifestUrl: `${APP_URL.origin}/manifest.webmanifest`,
					fallbackType: 'customtabs',
					features: {},
					alphaDependencies: false,
					enableSiteSettingsShortcut: true,
					isChromeOSOnly: false,
					isMetaQuest: false,
					minSdkVersion: 21,
					targetSdkVersion: 34,
					splashScreenFadeOutDuration: 300,
					signingKey: { path: '../android.keystore', alias: 'android' },
					signing: { storePassword, keyPassword },
					version: VERSION,
					versionCode: String(Math.floor(Date.now() / 1000)),
				},
				null,
				2
			)
		);

		// ── Scaffold Android project ─────────────────────────────────────────
		// bubblewrap update reads twa-manifest.json (including signing passwords)
		// and generates the full gradle project — no interactive prompts needed
		// except for the versionName question.
		console.log('\n▶  bubblewrap update --skipPwaValidation\n');
		execSync('bubblewrap update --skipPwaValidation', {
			cwd: androidDir,
			input: `${VERSION}\n`,
			stdio: ['pipe', 'inherit', 'inherit'],
		});

		// ── Patch AndroidManifest.xml ────────────────────────────────────────
		// Must run after bubblewrap generates the project but before gradle
		// compiles it. Adds storage + media permissions needed for the File
		// System Access API (showDirectoryPicker / showSaveFilePicker).
		patchAndroidManifest(androidDir);

		// ── Build via gradle directly ────────────────────────────────────────
		// bubblewrap build is just a thin wrapper around gradlew — calling it
		// directly avoids all interactive password prompts entirely since the
		// signing config is already baked into the generated build.gradle.
		const gradlew = join(androidDir, 'gradlew');
		run(`chmod +x ${JSON.stringify(gradlew)}`);
		run('./gradlew assembleRelease --no-daemon', { cwd: androidDir });

		// Locate the signed APK and move it where collect() can find it.
		const apkDir = join(androidDir, 'app', 'build', 'outputs', 'apk', 'release');
		const builtApk = readdirSync(apkDir).find((f) => f.endsWith('.apk'));
		if (!builtApk) throw new Error('No APK found after gradle build');

		const unsignedApk = join(apkDir, builtApk);
		const signedApk = join(androidDir, 'app-release-signed.apk');

		// Sign with apksigner (part of Android SDK build-tools)
		const buildToolsDir = join(androidSdkPath, 'build-tools');
		const buildToolsVersion = readdirSync(buildToolsDir).sort().at(-1); // use latest
		const apkSigner = join(buildToolsDir, buildToolsVersion, 'apksigner');

		run(
			`${JSON.stringify(apkSigner)} sign` +
				` --ks ${JSON.stringify(keystorePath)}` +
				` --ks-key-alias android` +
				` --ks-pass env:ANDROID_STORE_PASSWORD` +
				` --key-pass env:ANDROID_KEY_PASSWORD` +
				` --out ${JSON.stringify(signedApk)}` +
				` ${JSON.stringify(unsignedApk)}`
		);

		collect(androidDir);
	} finally {
		rmSync(androidDir, { recursive: true, force: true });
	}
}

// ── Summary ───────────────────────────────────────────────────────────────────
const built = readdirSync(OUT);
if (!built.length) {
	console.error('\n✘  No packages produced.\n');
	process.exit(1);
}
console.log(`\n✅  ${built.length} package(s) in ${OUT}/`);
console.log(built.map((f) => `     ${f}`).join('\n'));
console.log('\nUpload these as GitHub release assets tagged "latest".\n');
