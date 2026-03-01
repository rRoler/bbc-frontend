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
import { tmpdir } from 'node:os';

const req = createRequire(import.meta.url);
const rootPkg = req('../package.json');

const APP_NAME = 'Big Book Covers';
const APP_ID = 'dev.roler.covers';
const APP_URL = new URL('https://covers.roler.dev');
const VERSION = (() => {
	const d = new Date();
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`;
})();
const OUT = './pwa-packages';
const FAVICON_SVG = fileURLToPath(new URL('../public/favicon.svg', import.meta.url));

const RENAME = {
	[`${APP_NAME} Setup ${VERSION}.exe`]: 'bbc-windows.exe',
	[`${APP_NAME}-${VERSION}.dmg`]: 'bbc-mac.dmg',
	[`${APP_NAME}-${VERSION}.AppImage`]: 'bbc-linux.AppImage',
	[`${APP_NAME}_${VERSION}_amd64.deb`]: 'bbc-linux.deb',
	'app-release-signed.apk': 'bbc-android.apk',
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
    width: 1920,
    height: 1080,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.once('ready-to-show', () => win.show());
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

// ── Android (.apk via bubblewrap TWA) ─────────────────────────────────────────
if (platform === 'all' || platform === 'android') {
	const androidDir = resolve('./tmp-android');
	mkdirSync(androidDir, { recursive: true });
	try {
		const keystorePath = join(androidDir, 'android.keystore');
		if (!existsSync(keystorePath)) {
			run(
				`keytool -genkeypair -v -keystore ${JSON.stringify(keystorePath)}` +
					` -alias android -keyalg RSA -keysize 2048 -validity 10000` +
					` -dname "CN=BBC, OU=Dev, O=roler.dev, L=Earth, S=Earth, C=US"` +
					` -storepass android -keypass android`
			);
		}

		writeFileSync(
			join(androidDir, 'twa-manifest.json'),
			JSON.stringify(
				{
					packageId: APP_ID,
					host: APP_URL.host,
					name: APP_NAME,
					launcherName: 'BBC',
					display: 'standalone',
					orientation: 'default',
					themeColor: '#04262e',
					navigationColor: '#04262e',
					navigationColorDark: '#030d11',
					navigationDividerColor: '#04262e',
					navigationDividerColorDark: '#030d11',
					backgroundColor: '#030d11',
					enableNotifications: false,
					startUrl: '/',
					iconUrl: `${APP_URL.origin}/pwa-192x192.png`,
					maskableIconUrl: `${APP_URL.origin}/maskable-icon-512x512.png`,
					monochromeIconUrl: `${APP_URL.origin}/pwa-192x192.png`,
					shortcuts: [],
					webManifestUrl: `${APP_URL.origin}/manifest.webmanifest`,
					fallbackType: 'customtabs',
					features: {},
					alphaDependencies: false,
					enableSiteSettingsShortcut: true,
					isChromeOSOnly: false,
					isMetaQuest: false,
					minSdkVersion: 21,
					targetSdkVersion: 34,
					signingKey: { path: './android.keystore', alias: 'android' },
					signing: { storePassword: 'android', keyPassword: 'android' },
					version: VERSION,
					versionCode: '1',
				},
				null,
				2
			)
		);

		run('bubblewrap build --skipPwaValidation', { cwd: androidDir });
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
