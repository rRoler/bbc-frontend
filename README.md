<div align="center">

<a href="https://covers.roler.dev">
    <img src="public/favicon.svg" alt="Big Book Covers logo" title="Big Book Covers" width="160"/>
</a>

# Big Book Covers

### High-quality cover downloader

Download high-resolution book covers from major digital storefronts.

[![Site](https://img.shields.io/badge/covers.roler.dev-live-6366f1?style=flat-square&logo=astro&logoColor=white)](https://covers.roler.dev)
[![License](https://img.shields.io/github/license/rRoler/bbc-frontend?style=flat-square&color=6366f1)](LICENSE)
[![Stars](https://img.shields.io/github/stars/rRoler/bbc-frontend?style=flat-square&color=6366f1)](https://github.com/rRoler/bbc-frontend/stargazers)

## Download

[![Web App](https://img.shields.io/badge/Open%20in%20Browser-6366f1?style=for-the-badge&logo=googlechrome&logoColor=white)](https://covers.roler.dev)
&nbsp;
[![Windows](https://img.shields.io/badge/Windows-.exe-0078d4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/rRoler/bbc-frontend/releases/latest/download/bbc-windows_setup.exe)
&nbsp;
[![macOS](https://img.shields.io/badge/macOS-.dmg-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/rRoler/bbc-frontend/releases/latest/download/bbc-mac.dmg)

[![Android](https://img.shields.io/badge/Android-.apk-3ddc84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/rRoler/bbc-frontend/releases/latest/download/bbc-android.apk)
&nbsp;
[![Linux AppImage](https://img.shields.io/badge/Linux-.AppImage-f97316?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/rRoler/bbc-frontend/releases/latest/download/bbc-linux.AppImage)
&nbsp;
[![Linux deb](https://img.shields.io/badge/Linux-.deb-f97316?style=for-the-badge&logo=debian&logoColor=white)](https://github.com/rRoler/bbc-frontend/releases/latest/download/bbc-linux.deb)

_On mobile, [open the website](https://covers.roler.dev) in Chrome or Safari and tap "Install" or "Add to Home Screen" for an app-like experience._

## Features

### Multi-Source Support

Download high-quality covers from Amazon, BookWalker, BookLive, eBookJapan, and more.

### Cross-Platform

Available as a web app, desktop client (Windows, macOS, Linux), and Android TWA.

### PWA Optimized

Fast, with automatic updates.

## Development

**Stack:** Astro · Svelte · Tailwind CSS · DaisyUI · TypeScript

</div>

> [!IMPORTANT]
> Requires **Node.js 22+** and **pnpm** before running any commands.

```sh
pnpm install            # install dependencies
pnpm run dev            # dev server → localhost:4321
pnpm run build          # production build → ./dist/
pnpm run preview        # preview production build locally
```

<details>
<summary>View all commands</summary>

| Command                      | Action                                       |
| :--------------------------- | :------------------------------------------- |
| `pnpm install`               | Installs dependencies                        |
| `pnpm run dev`               | Starts local dev server at `localhost:4321`  |
| `pnpm run lint`              | Run linter                                   |
| `pnpm run lint:fix`          | Fix lint issues                              |
| `pnpm run format`            | Run code formatter                           |
| `pnpm run format:write`      | Format code                                  |
| `pnpm run flint`             | Format code and fix lint issues              |
| `pnpm run build`             | Build your production site to `./dist/`      |
| `pnpm run preview`           | Preview your build locally, before deploying |
| `pnpm run astro ...`         | Run CLI commands like `astro add`            |
| `pnpm run build:pwa`         | Package PWA for all platforms                |
| `pnpm run build:pwa:win`     | Package for Windows                          |
| `pnpm run build:pwa:mac`     | Package for macOS                            |
| `pnpm run build:pwa:linux`   | Package for Linux                            |
| `pnpm run build:pwa:android` | Package for Android                          |

</details>

<div align="center">

### Disclaimer

The developer of this application has no affiliation with the content providers listed. This application is a tool to fetch publicly available metadata and covers; it does not host book content.

<br/>

MIT License · Made by [Roler](https://roler.dev)

</div>
