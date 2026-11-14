const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const { spawn, execSync } = require('child_process');

let mainWindow = null;
let backendProcess = null;
let frontendProcess = null;
const BACKEND_PORT = 8000;
const FRONTEND_PORT = 5173;

function checkHealth(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForService(url, maxAttempts = 35) {
  for (let i = 0; i < maxAttempts; i++) {
    const isHealthy = await checkHealth(url);
    if (isHealthy) return true;
    await new Promise((res) => setTimeout(res, 500));
  }
  return false;
}

function startBackend() {
  const rootDir = path.join(__dirname, '..');
  const pythonExe = process.platform === 'win32'
    ? path.join(rootDir, 'backend', 'venv', 'Scripts', 'python.exe')
    : path.join(rootDir, 'backend', 'venv', 'bin', 'python');

  const backendCwd = path.join(rootDir, 'backend');

  console.log('[Electron] Launching FastAPI backend from:', pythonExe);
  try {
    backendProcess = spawn(pythonExe, [
      '-m', 'uvicorn',
      'app.main:app',
      '--host', '127.0.0.1',
      '--port', String(BACKEND_PORT)
    ], {
      cwd: backendCwd,
      stdio: 'pipe',
      windowsHide: true,
      env: { ...process.env, PYTHONPATH: backendCwd }
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`[FastAPI] ${data.toString().trim()}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`[FastAPI Error] ${data.toString().trim()}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`[FastAPI] Process exited with code ${code}`);
    });
  } catch (err) {
    console.error('[Electron] Failed to spawn FastAPI process:', err);
  }
}

function startFrontend() {
  const rootDir = path.join(__dirname, '..');
  const frontendCwd = path.join(rootDir, 'frontend');

  console.log('[Electron] Launching React Vite dev server...');
  try {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    frontendProcess = spawn(npmCmd, ['run', 'dev'], {
      cwd: frontendCwd,
      stdio: 'pipe',
      windowsHide: true
    });

    frontendProcess.stdout.on('data', (data) => {
      console.log(`[Vite] ${data.toString().trim()}`);
    });

    frontendProcess.stderr.on('data', (data) => {
      console.error(`[Vite Error] ${data.toString().trim()}`);
    });
  } catch (err) {
    console.error('[Electron] Failed to spawn Frontend process:', err);
  }
}

function killServices() {
  if (backendProcess && backendProcess.pid) {
    console.log('[Electron] Terminating background FastAPI backend...');
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${backendProcess.pid} /T /F`);
      } else {
        backendProcess.kill('SIGTERM');
      }
    } catch {}
    backendProcess = null;
  }
  if (frontendProcess && frontendProcess.pid) {
    console.log('[Electron] Terminating background Vite frontend...');
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${frontendProcess.pid} /T /F`);
      } else {
        frontendProcess.kill('SIGTERM');
      }
    } catch {}
    frontendProcess = null;
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    title: 'CareerLens AI - Autonomous Career Intelligence',
    icon: path.join(__dirname, '..', 'careerlens.ico'),
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Native window IPC
  ipcMain.on('window-minimize', () => mainWindow?.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow?.close());

  // Show window once content is ready to prevent blank white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // In development, load the Vite dev server URL
  const devUrl = `http://localhost:${FRONTEND_PORT}`;
  const isDevHealthy = await checkHealth(devUrl);

  if (isDevHealthy || process.env.NODE_ENV !== 'production') {
    mainWindow.loadURL(devUrl);
  } else {
    // In production, serve the built frontend dist
    mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Check if backend is already running on port 8000
  const isBackendRunning = await checkHealth(`http://127.0.0.1:${BACKEND_PORT}/health`);
  if (!isBackendRunning) {
    startBackend();
    await waitForService(`http://127.0.0.1:${BACKEND_PORT}/health`);
  }

  // Check if frontend is already running on port 5173
  const isFrontendRunning = await checkHealth(`http://localhost:${FRONTEND_PORT}`);
  if (!isFrontendRunning && process.env.NODE_ENV !== 'production') {
    startFrontend();
    await waitForService(`http://localhost:${FRONTEND_PORT}`);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  killServices();
});

app.on('window-all-closed', () => {
  killServices();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
