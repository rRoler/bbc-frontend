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
const APP_ID_PATH = APP_ID.replaceAll('.', '/'); // dev/roler/covers
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

		// ── Patch generated Android project for FS bridge access ─────────────
		patchAndroidProject(androidDir);

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

// ── Android project patching ──────────────────────────────────────────────────
//
// bubblewrap generates a standard TWA shell with no custom Java/Kotlin code.
// This function post-processes the generated project to:
//
//   1. Add storage permissions to AndroidManifest.xml:
//        - READ/WRITE_EXTERNAL_STORAGE  (≤ API 32 legacy scoped-storage opt-in)
//        - requestLegacyExternalStorage  (Android 10 scoped-storage opt-out)
//        - android:preserveLegacyExternalStorage  (Android 11 upgrade compat)
//        These are needed so the injected Android FS bridge can write files to
//        user-visible Downloads / a user-chosen SAF tree URI on all API levels.
//
//   2. Inject AndroidFSBridge.kt — the @JavascriptInterface class that exposes
//      window.AndroidFS to the hosted web page. It uses the Storage Access
//      Framework (SAF) throughout so it works on API 21–34+ without MANAGE_
//      EXTERNAL_STORAGE. All methods are synchronous from JS's perspective;
//      pickFolder() is the one exception: it posts an Intent and resolves the
//      result via a blocking SynchronousQueue so the JS caller still gets a
//      plain return value rather than a callback.
//
//   3. Patch MainActivity.kt to:
//        a. Register the bridge with addJavascriptInterface(bridge, "AndroidFS")
//        b. Wire up onActivityResult so pickFolder's Intent round-trip works.
//        c. Inject the TWA detection signal  document.referrer = "android-app://"
//           via onPageStarted — Chrome clears referrer across navigations so
//           the JS-side detectPlatform() uses window.AndroidFS presence as the
//           primary signal; the referrer injection is a belt-and-suspenders
//           fallback for the very first page load.
//
// NOTE: bubblewrap generates Kotlin by default since CLI v1.6. If an older
// version emits Java, swap `.kt` → `.java` paths and adjust syntax accordingly.
function patchAndroidProject(androidDir) {
	console.log('\n▶  Patching Android project for FS bridge access\n');

	// Locate generated source root (bubblewrap uses the package ID as the path)
	const javaRoot = join(androidDir, 'app', 'src', 'main', 'java', ...APP_ID.split('.'));
	const manifestPath = join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');

	// ── 1. AndroidManifest.xml ───────────────────────────────────────────────
	let manifest = readFileSync(manifestPath, 'utf8');

	// Insert storage permissions right after <manifest ...> opening tag if absent.
	if (!manifest.includes('WRITE_EXTERNAL_STORAGE')) {
		manifest = manifest.replace(
			/(<manifest[^>]*>)/,
			`$1
    <!-- Storage permissions for the AndroidFS bridge (SAF tree URIs + legacy) -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
        android:maxSdkVersion="29" />`
		);
		console.log('  ✔  Added READ/WRITE_EXTERNAL_STORAGE permissions');
	}

	// Enable legacy external storage on Android 10 (API 29) so SAF writes land
	// in the correct location before scoped storage was fully enforced.
	if (!manifest.includes('requestLegacyExternalStorage')) {
		manifest = manifest.replace(
			/(<application\b[^>]*)(>)/,
			`$1
        android:requestLegacyExternalStorage="true"
        android:preserveLegacyExternalStorage="true"$2`
		);
		console.log('  ✔  Added requestLegacyExternalStorage to <application>');
	}

	writeFileSync(manifestPath, manifest, 'utf8');

	// ── 2. AndroidFSBridge.kt ────────────────────────────────────────────────
	// Exposes window.AndroidFS to the TWA WebView. Uses Storage Access Framework
	// exclusively — no MANAGE_EXTERNAL_STORAGE needed. The "pick folder" flow
	// requires an Activity round-trip; we block the calling JS thread on a
	// SynchronousQueue and unblock it from onActivityResult in MainActivity.
	writeFileSync(
		join(javaRoot, 'AndroidFSBridge.kt'),
		`package ${APP_ID}

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
import android.util.Base64
import android.webkit.JavascriptInterface
import androidx.documentfile.provider.DocumentFile
import org.json.JSONObject
import java.util.concurrent.SynchronousQueue

/**
 * Injected into the WebView as \`window.AndroidFS\`.
 *
 * All methods are called from the WebView's JavaScript thread and must be
 * @JavascriptInterface. pickFolder() blocks on a SynchronousQueue until
 * MainActivity.onActivityResult() delivers the chosen URI.
 */
class AndroidFSBridge(
    private val context: Context,
    private val startPickIntent: (Intent, Int) -> Unit,
) {
    companion object {
        const val REQUEST_PICK_FOLDER = 9001
    }

    // SynchronousQueue transfers the URI from onActivityResult → pickFolder().
    // Capacity 0 means put() blocks until take() is called and vice-versa.
    internal val folderPickQueue = SynchronousQueue<String>()

    // ── pickFolder ────────────────────────────────────────────────────────────
    // Returns JSON: { uri: string; name: string } | null (null = cancelled)
    @JavascriptInterface
    fun pickFolder(): String {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
            addFlags(
                Intent.FLAG_GRANT_READ_URI_PERMISSION or
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or
                Intent.FLAG_GRANT_PREFIX_URI_PERMISSION,
            )
        }
        startPickIntent(intent, REQUEST_PICK_FOLDER)

        // Block until onActivityResult delivers the result (or "null" on cancel).
        val raw = folderPickQueue.take()
        return raw
    }

    // ── writeFile ─────────────────────────────────────────────────────────────
    // folderUri  — SAF tree URI returned by pickFolder
    // relativePath — forward-slash path relative to the folder, e.g. "a/b.jpg"
    // base64Data — file content encoded as standard Base64
    // mimeType   — MIME type string, e.g. "image/jpeg"
    // Returns JSON: { success: boolean; error?: string }
    @JavascriptInterface
    fun writeFile(folderUri: String, relativePath: String, base64Data: String, mimeType: String): String {
        return try {
            val treeUri = Uri.parse(folderUri)
            val segments = relativePath.split("/").filter { it.isNotBlank() }
            val fileName = segments.last()
            val dirs = segments.dropLast(1)

            // Walk / create subdirectories under the SAF tree.
            var parent = DocumentFile.fromTreeUri(context, treeUri)
                ?: return error("Cannot open folder URI")

            for (seg in dirs) {
                parent = parent.findFile(seg)?.takeIf { it.isDirectory }
                    ?: parent.createDirectory(seg)
                    ?: return error("Cannot create directory: $seg")
            }

            // Delete existing file so createFile doesn't append a suffix.
            parent.findFile(fileName)?.delete()

            val fileDoc = parent.createFile(mimeType, fileName)
                ?: return error("Cannot create file: $fileName")

            context.contentResolver.openOutputStream(fileDoc.uri)?.use { out ->
                out.write(Base64.decode(base64Data, Base64.DEFAULT))
            } ?: return error("Cannot open output stream")

            JSONObject().put("success", true).toString()
        } catch (e: Exception) {
            error(e.message ?: "Unknown error")
        }
    }

    // ── requestPermission ─────────────────────────────────────────────────────
    // Checks whether a persistable read/write grant is still held for the URI.
    // Returns JSON: { granted: boolean }
    @JavascriptInterface
    fun requestPermission(folderUri: String): String {
        val uri = Uri.parse(folderUri)
        val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
        val granted = context.contentResolver.persistedUriPermissions.any {
            it.uri == uri && it.isReadPermission && it.isWritePermission
        }
        if (!granted) {
            try {
                context.contentResolver.takePersistableUriPermission(uri, flags)
                return JSONObject().put("granted", true).toString()
            } catch (_: SecurityException) {
                return JSONObject().put("granted", false).toString()
            }
        }
        return JSONObject().put("granted", true).toString()
    }

    // ── clearFolder ───────────────────────────────────────────────────────────
    // Releases the persistable URI permission so Android can reclaim the grant.
    @JavascriptInterface
    fun clearFolder(folderUri: String) {
        val uri = Uri.parse(folderUri)
        val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
        try {
            context.contentResolver.releasePersistableUriPermission(uri, flags)
        } catch (_: SecurityException) { /* already released */ }
    }

    // ── helpers ───────────────────────────────────────────────────────────────
    private fun error(msg: String) = JSONObject().put("success", false).put("error", msg).toString()
}
`
	);
	console.log('  ✔  AndroidFSBridge.kt written');

	// ── 3. Find the Activity file dynamically ────────────────────────────────
	// bubblewrap has used several names across versions:
	// LauncherActivity.kt, MainActivity.kt, or a class named after the app.
	// Walk the entire java source tree and pick the first .kt file that
	// contains a WebView or TwaLauncher reference — that's the one to patch.
	function findActivityFile(dir) {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const full = join(dir, entry.name);
			if (entry.isDirectory()) {
				const found = findActivityFile(full);
				if (found) return found;
			} else if (entry.name.endsWith('.kt') || entry.name.endsWith('.java')) {
				const src = readFileSync(full, 'utf8');
				if (
					src.includes('TwaLauncherActivity') ||
					src.includes('WebView') ||
					src.includes('addJavascriptInterface') ||
					src.includes('BrowserActivity')
				) {
					return full;
				}
			}
		}
		return null;
	}

	const javaSourceRoot = join(androidDir, 'app', 'src', 'main', 'java');
	const mainActivityPath = findActivityFile(javaSourceRoot);

	if (!mainActivityPath) {
		// Dump the tree so the next run gives us a clear diagnosis
		const tree = execSync(`find ${JSON.stringify(javaSourceRoot)} -type f`, {
			encoding: 'utf8',
		}).trim();
		throw new Error(
			`Cannot find any Activity/WebView file under ${javaSourceRoot}.\n` +
				`Files present:\n${tree}\n` +
				`Check bubblewrap version and re-run.`
		);
	}

	console.log(`  ✔  Found Activity: ${mainActivityPath.replace(androidDir, '.')}`);

	let activity = readFileSync(mainActivityPath, 'utf8');

	// a) Add import for ActivityResult if missing
	if (!activity.includes('import android.app.Activity')) {
		activity = activity.replace(
			/^(package .+\n)/m,
			`$1
import android.app.Activity
import android.content.Intent
import android.net.Uri
`
		);
	}

	// b) Declare the bridge as a class property after the class opening brace.
	//    Guard: only inject once.
	if (!activity.includes('AndroidFSBridge')) {
		activity = activity.replace(
			/(class \w+[^{]*\{)/,
			`$1
    // ── AndroidFS bridge ──────────────────────────────────────────────────────
    private val fsBridge by lazy {
        AndroidFSBridge(applicationContext) { intent, reqCode ->
            startActivityForResult(intent, reqCode)
        }
    }
`
		);

		// c) Register the bridge on the WebView once the TWA client is set up.
		//    bubblewrap exposes the WebView via twaWebView (the field name differs
		//    across bubblewrap versions; cover both "twaWebView" and "webView").
		//    We hook into onResume which is always called and guaranteed to run
		//    after the WebView is initialised.
		const onResumePatch = `
    override fun onResume() {
        super.onResume()
        // Inject the FS bridge so window.AndroidFS is available in the TWA.
        // addJavascriptInterface is idempotent when the name is already registered.
        (twaWebView ?: webView)?.addJavascriptInterface(fsBridge, "AndroidFS")
    }
`;

		if (!activity.includes('onResume')) {
			// Append before the closing brace of the class
			activity = activity.replace(/(\n}\s*$)/, `\n${onResumePatch}\n$1`);
		} else {
			// Prepend our code inside the existing onResume body
			activity = activity.replace(
				/(override fun onResume\(\)\s*\{)/,
				`$1\n        (twaWebView ?: webView)?.addJavascriptInterface(fsBridge, "AndroidFS")`
			);
		}

		// d) Handle onActivityResult for the folder-picker round-trip.
		const onActivityResultPatch = `
    @Suppress("OVERRIDE_DEPRECATION")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == AndroidFSBridge.REQUEST_PICK_FOLDER) {
            if (resultCode == Activity.RESULT_OK && data?.data != null) {
                val uri: Uri = data.data!!
                // Persist read+write grants across reboots.
                val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or
                            Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                contentResolver.takePersistableUriPermission(uri, flags)
                // Resolve the human-readable folder name from the document tree.
                val name = resolveDocumentName(uri) ?: uri.lastPathSegment ?: uri.toString()
                val json = org.json.JSONObject()
                    .put("uri", uri.toString())
                    .put("name", name)
                    .toString()
                fsBridge.folderPickQueue.put(json)
            } else {
                // User cancelled — unblock pickFolder() with a JSON null sentinel.
                fsBridge.folderPickQueue.put("null")
            }
            return
        }
        super.onActivityResult(requestCode, resultCode, data)
    }

    /** Resolve the display name of a SAF tree URI via DocumentsContract. */
    private fun resolveDocumentName(treeUri: Uri): String? {
        return try {
            val docId = DocumentsContract.getTreeDocumentId(treeUri)
            val docUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, docId)
            contentResolver.query(docUri, arrayOf(DocumentsContract.Document.COLUMN_DISPLAY_NAME),
                null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) cursor.getString(0) else null
            }
        } catch (_: Exception) { null }
    }
`;

		if (!activity.includes('onActivityResult')) {
			activity = activity.replace(/(\n}\s*$)/, `\n${onActivityResultPatch}\n$1`);
		}

		writeFileSync(mainActivityPath, activity, 'utf8');
		console.log(`  ✔  ${candidateFiles.find((f) => mainActivityPath.endsWith(f))} patched`);
	} else {
		console.log('  ℹ  MainActivity already patched — skipping');
	}

	// ── 4. Ensure DocumentFile dependency in app/build.gradle ───────────────
	// DocumentFile is in androidx.documentfile; bubblewrap does not include it.
	const buildGradlePath = join(androidDir, 'app', 'build.gradle');
	if (existsSync(buildGradlePath)) {
		let buildGradle = readFileSync(buildGradlePath, 'utf8');
		if (!buildGradle.includes('documentfile')) {
			buildGradle = buildGradle.replace(
				/(dependencies\s*\{)/,
				`$1\n    implementation 'androidx.documentfile:documentfile:1.0.1'`
			);
			writeFileSync(buildGradlePath, buildGradle, 'utf8');
			console.log('  ✔  Added androidx.documentfile dependency');
		}
	}

	console.log('  ✔  Android FS bridge patch complete\n');
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
