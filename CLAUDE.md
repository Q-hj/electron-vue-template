# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — Start Vite dev server with Electron (VITE_DEV_SERVER_URL=http://127.0.0.1:3344/)
- `pnpm build` — Type-check with `vue-tsc --noEmit`, then `vite build`, then `electron-builder`
- `pnpm preview` — `vite preview`

## Architecture

Three-process Electron app (main / preload / renderer):

### Electron Main Process (`electron/main/index.ts`)
- Creates a 1200×800 BrowserWindow (min 1200×800)
- Single-instance lock via `app.requestSingleInstanceLock()`
- Dev: loads `VITE_DEV_SERVER_URL` and opens DevTools; Prod: loads `dist/index.html`
- Handles `open-win` IPC to create child windows
- Sends `"main-process-message"` to renderer on did-finish-load
- GPU acceleration disabled for Windows 7

### Preload Script (`electron/preload/index.ts`)
- Uses `contextBridge.exposeInMainWorld` to expose a typed `ipcRenderer` object (on, off, send, invoke)
- Shows a CSS loading animation until `removeLoading` message or 4999ms timeout

### Renderer Process (`src/`)
- Vue 3 app with `<script setup lang="ts">` and TypeScript
- Styles: UnoCSS with `presetUno` + `presetAttributify` (see `src/uno.config.ts`)
- `src/assets/styles/reset.css` handles light/dark mode root variables
- IPC calls use `window.ipcRenderer.*` (typed via `src/vite-env.d.ts`)
- Demos: `src/demos/ipc.ts` and `src/demos/node.ts`

### IPC Communication Pattern
```
Renderer → window.ipcRenderer.invoke('channel', args) → ipcMain.handle('channel', handler)
Renderer → window.ipcRenderer.send('channel', args)   → ipcMain.on('channel', handler)
Main → win.webContents.send('channel', data)           → Renderer: window.ipcRenderer.on('channel', listener)
```

## Build Pipeline

1. `vue-tsc --noEmit` — TypeScript type-check Vue SFCs
2. `vite build` — Builds renderer (`dist/`), main (`dist-electron/main/`), preload (`dist-electron/preload/`)
3. `electron-builder` — Packages into platform installers (Windows NSIS, macOS DMG, Linux AppImage)

## Key Config Files

- `vite.config.ts` — Vite + Vue + UnoCSS + vite-plugin-electron + vite-plugin-electron-renderer
- `electron-builder.json5` — Cross-platform packaging config, output to `release/${version}/`
- `src/uno.config.ts` — UnoCSS presets, shortcuts, theme (colors, breakpoints)
- `tsconfig.json` / `tsconfig.node.json` — Separate TS configs for src/ and node code

## VS Code Debugging

Launch config "Debug App" in `.vscode/launch.json` — composite of main process debug (Electron) + renderer process debug (Chrome attach on port 9229). Run via `.vscode/.debug.script.mjs` which writes `.debug.env` and starts dev with `VSCODE_DEBUG=true`.
