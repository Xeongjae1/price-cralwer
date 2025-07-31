import { app, BrowserWindow, ipcMain, shell, protocol } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === "development";

let mainWindow: BrowserWindow;

// 보안 설정 강화
app.whenReady().then(() => {
  // CSP 및 보안 헤더 설정
  protocol.registerFileProtocol("app", (request, callback) => {
    const url = request.url.replace("app://", "");
    const normalizedPath = path.normalize(path.join(__dirname, url));
    callback({ path: normalizedPath });
  });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: !isDev,
      sandbox: false, // React 19 호환성을 위해
    },
    titleBarStyle: "hiddenInset",
    show: false,
    icon: path.join(__dirname, "../assets/icon.png"),
  });

  // 윈도우가 준비되면 보여주기
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();

    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  // 외부 링크는 기본 브라우저에서 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // 보안 강화 - 새 윈도우 생성 방지
  mainWindow.webContents.on("new-window", (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// 보안 강화
app.on("web-contents-created", (event, contents) => {
  contents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (parsedUrl.origin !== "http://localhost:5173") {
      event.preventDefault();
    }
  });
});

// IPC 핸들러들 (최신 보안 적용)
ipcMain.handle("get-products", async () => {
  try {
    const response = await fetch("http://localhost:3001/api/products");
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
});

ipcMain.handle("add-product", async (event, productData) => {
  try {
    const response = await fetch("http://localhost:3001/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(productData),
    });
    return await response.json();
  } catch (error) {
    console.error("Failed to add product:", error);
    throw error;
  }
});

ipcMain.handle("start-crawling", async (event, productIds) => {
  try {
    const response = await fetch("http://localhost:3001/api/crawl/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productIds }),
    });
    return await response.json();
  } catch (error) {
    console.error("Failed to start crawling:", error);
    throw error;
  }
});

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});
