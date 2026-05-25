import { app, BrowserWindow, dialog, Menu, shell } from "electron";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "../..");

export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");

/** 外部 URL — 通过 VITE_EXTERNAL_URL 环境变量配置或修改下方默认值 */
const EXTERNAL_URL =
  process.env.VITE_EXTERNAL_URL || "https://www.baidu.com";

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let win: BrowserWindow | null = null;
const preload = path.join(__dirname, "../preload/index.mjs");

async function createWindow() {
  win = new BrowserWindow({
    title: "Main window",
    icon: path.join(process.env.APP_ROOT, "public", "favicon.ico"),
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload,
    },
  });

  win.loadURL(EXTERNAL_URL);

  // Open external links in the default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });

  // Confirm before quitting
  win.on("close", (e) => {
    const response = dialog.showMessageBoxSync(win!, {
      type: "warning",
      title: "提示",
      message: "是否退出应用？",
      buttons: ["取消", "退出"],
      cancelId: 0,
      defaultId: 1,
    });

    if (response !== 1) {
      e.preventDefault();
    }
  });
}

Menu.setApplicationMenu(null);

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});
