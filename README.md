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

Fast, and updates automatically.

## Development

**Stack:** Astro · Svelte · Tailwind CSS · DaisyUI · TypeScript

</div>

> [!IMPORTANT]
> Requires **Node.js 22+** and **pnpm** before running any commands.

```sh
pnpm install        # install dependencies
pnpm dev            # dev server → localhost:4321
pnpm build          # production build → ./dist/
pnpm preview        # preview production build locally
```

<details>
<summary>View all commands</summary>

| Command                  | Action                                     |
| :----------------------- | :----------------------------------------- |
| `pnpm install`           | Install dependencies                       |
| `pnpm dev`               | Start local dev server at `localhost:4321` |
| `pnpm build`             | Build production site to `./dist/`         |
| `pnpm preview`           | Preview build locally before deploying     |
| `pnpm lint`              | Run linter                                 |
| `pnpm lint:fix`          | Fix lint issues                            |
| `pnpm format`            | Check formatting                           |
| `pnpm format:write`      | Format and write changes                   |
| `pnpm flint`             | Format + fix lint in one step              |
| `pnpm astro ...`         | Run Astro CLI commands e.g. `astro add`    |
| `pnpm build:pwa`         | Package PWA for all platforms              |
| `pnpm build:pwa:win`     | Package for Windows                        |
| `pnpm build:pwa:mac`     | Package for macOS                          |
| `pnpm build:pwa:linux`   | Package for Linux                          |
| `pnpm build:pwa:android` | Package for Android                        |

</details>

<div align="center">

### Disclaimer

The developer(s) of this application have no affiliation with the content providers listed. This application is a tool to fetch publicly available metadata and covers; it does not host or provide book content.

<br/>

MIT License · Made by [Roler](https://roler.dev)

</div>
