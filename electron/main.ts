/* global MAIN_WINDOW_VITE_DEV_SERVER_URL, MAIN_WINDOW_VITE_NAME */
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

import { app, BrowserWindow, ipcMain, screen, globalShortcut } from 'electron';
import * as path from 'path';
import * as https from 'https';
import * as fs from 'fs';

// ── Load API key ──────────────────────────────────────────────────────────────
function loadEnv(): void {
  // dev: __dirname = .vite/build/ → go up 2 levels to project root
  const candidates = [
    path.join(__dirname, '..', '..', 'api.env'),
    path.join(app.getPath('userData'), 'api.env'),
  ];
  for (const p of candidates) {
    try {
      for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
      }
      break;
    } catch { /* try next */ }
  }
}
loadEnv();

// ── Live Client polling ───────────────────────────────────────────────────────
const SSL_AGENT = new https.Agent({ rejectUnauthorized: false });
const POLL_MS   = 1500;

function fetchLiveData(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      'https://127.0.0.1:2999/liveclientdata/allgamedata',
      { agent: SSL_AGENT },
      (res) => {
        if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
      }
    );
    req.setTimeout(2000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

// ── Claude analysis ───────────────────────────────────────────────────────────
const CLAUDE_COOLDOWN_MS = 90_000;
let lastClaudeAt = 0;
let isAnalysing  = false;

async function runClaudeAnalysis(prompt: string): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { send('game:analysis', '**No API key.** Click ⚙️ to enter your Anthropic key.'); return; }

  isAnalysing = true;
  send('game:analysing', true);

  try {
    // Dynamic import so it's not bundled at build time
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    });
    lastClaudeAt = Date.now();
    send('game:analysis', (msg.content[0] as { text: string }).text);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    send('game:analysis', `Analysis error: ${msg}`);
  } finally {
    isAnalysing = false;
    send('game:analysing', false);
  }
}

// ── IPC ───────────────────────────────────────────────────────────────────────
ipcMain.on('analysis:request', (_e, prompt: string) => {
  if (!isAnalysing) runClaudeAnalysis(prompt);
});

ipcMain.on('api:set-key', (_e, key: string) => {
  process.env.ANTHROPIC_API_KEY = key.trim();
});

ipcMain.on('overlay:click-through', (_e, enabled: boolean) => {
  mainWindow?.setIgnoreMouseEvents(enabled, { forward: true });
});

// ── Window ────────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;

function send(channel: string, data: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width:  460,
    height: Math.min(height - 40, 920),
    x: width - 480,
    y: 20,
    transparent: true,
    frame:       false,
    hasShadow:   false,
    show:        false,
    alwaysOnTop: true,
    resizable:   true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  setTimeout(() => { if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) mainWindow.show(); }, 4000);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Polling loop ──────────────────────────────────────────────────────────────
let pollTimer: ReturnType<typeof setInterval> | null = null;

async function poll(): Promise<void> {
  try {
    const raw = await fetchLiveData();
    send('game:status', 'in-game');
    send('game:data', raw);
  } catch {
    send('game:status', 'waiting');
  }
}

// ── Hotkey ────────────────────────────────────────────────────────────────────
const HOTKEY = 'CmdOrCtrl+Shift+O';

function registerHotkey(): void {
  globalShortcut.register(HOTKEY, () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  registerHotkey();
  pollTimer = setInterval(poll, POLL_MS);
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (pollTimer) clearInterval(pollTimer);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
