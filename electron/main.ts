/* global MAIN_WINDOW_VITE_DEV_SERVER_URL, MAIN_WINDOW_VITE_NAME */
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

import { app, BrowserWindow, ipcMain, screen, globalShortcut } from 'electron';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';

// ── Load API key ──────────────────────────────────────────────────────────────
function loadEnv(): void {
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

// ── HTTP helpers ──────────────────────────────────────────────────────────────
const SSL_AGENT = new https.Agent({ rejectUnauthorized: false });
const POLL_MS   = 1500;

function fetchLocal(url: string, headers?: Record<string, string>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { agent: SSL_AGENT, headers }, (res) => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    req.setTimeout(2000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function fetchExternal(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function fetchLiveData(): Promise<unknown> {
  return fetchLocal('https://127.0.0.1:2999/liveclientdata/allgamedata');
}

// ── Champion ID → Name mapping (from Data Dragon) ────────────────────────────
let champIdMap: Record<number, string> = {};
let ddVersion = '14.24.1';

async function loadChampionIdMap(): Promise<void> {
  try {
    const versions = await fetchExternal('https://ddragon.leagueoflegends.com/api/versions.json') as string[];
    ddVersion = versions[0] ?? ddVersion;
    const champData = await fetchExternal(
      `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/data/en_US/champion.json`,
    ) as { data: Record<string, { key: string; name: string }> };
    for (const [, champ] of Object.entries(champData.data)) {
      champIdMap[parseInt(champ.key, 10)] = champ.name;
    }
  } catch { /* use empty map as fallback */ }
}

// ── LCU (League Client) API ──────────────────────────────────────────────────
const LOCKFILE_PATHS = [
  'C:/Riot Games/League of Legends/lockfile',
  'D:/Riot Games/League of Legends/lockfile',
  'C:/Program Files/Riot Games/League of Legends/lockfile',
  'C:/Program Files (x86)/Riot Games/League of Legends/lockfile',
];

interface LCUCreds { port: number; password: string }

function readLockfile(): LCUCreds | null {
  // Check env override first
  const custom = process.env.LEAGUE_DIR;
  const paths = custom ? [path.join(custom, 'lockfile'), ...LOCKFILE_PATHS] : LOCKFILE_PATHS;
  for (const p of paths) {
    try {
      const parts = fs.readFileSync(p, 'utf8').trim().split(':');
      if (parts.length >= 5) return { port: parseInt(parts[2], 10), password: parts[3] };
    } catch { /* try next */ }
  }
  return null;
}

function fetchLCU(creds: LCUCreds, endpoint: string): Promise<unknown> {
  const auth = Buffer.from(`riot:${creds.password}`).toString('base64');
  return fetchLocal(`https://127.0.0.1:${creds.port}${endpoint}`, { Authorization: `Basic ${auth}` });
}

// ── Player Profile lookup ────────────────────────────────────────────────────
interface ProfileData {
  summonerId: number; summonerName: string; summonerLevel: number;
  rank: string; tier: string; lp: number;
  wins: number; losses: number; winRate: number;
  topChampions: { name: string; mastery: number }[];
}

const profileCache = new Map<number, ProfileData>();
let profilesFetched = false;

async function fetchProfile(creds: LCUCreds, summonerId: number): Promise<ProfileData | null> {
  if (summonerId <= 0) return null;
  if (profileCache.has(summonerId)) return profileCache.get(summonerId)!;

  try {
    const s = await fetchLCU(creds, `/lol-summoner/v1/summoners/${summonerId}`) as {
      displayName: string; summonerLevel: number; puuid: string;
    };

    let rank = 'Unranked'; let tier = ''; let lp = 0; let wins = 0; let losses = 0;
    try {
      const r = await fetchLCU(creds, `/lol-ranked/v1/ranked-stats/${s.puuid}`) as {
        queues?: Array<{ queueType: string; tier: string; rank: string; leaguePoints: number; wins: number; losses: number }>;
      };
      const solo = r.queues?.find((q) => q.queueType === 'RANKED_SOLO_5x5');
      if (solo?.tier) {
        tier = solo.tier;
        rank = `${solo.tier[0]}${solo.tier.slice(1).toLowerCase()} ${solo.rank}`;
        lp = solo.leaguePoints; wins = solo.wins; losses = solo.losses;
      }
    } catch { /* unranked */ }

    const topChampions: { name: string; mastery: number }[] = [];
    try {
      const m = await fetchLCU(creds, `/lol-collections/v1/inventories/${summonerId}/champion-mastery/top?limit=3`) as
        Array<{ championId: number; championPoints: number }>;
      for (const c of (m ?? []).slice(0, 3)) {
        topChampions.push({ name: champIdMap[c.championId] ?? `#${c.championId}`, mastery: c.championPoints });
      }
    } catch { /* no mastery */ }

    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
    const profile: ProfileData = {
      summonerId, summonerName: s.displayName, summonerLevel: s.summonerLevel,
      rank, tier, lp, wins, losses, winRate, topChampions,
    };
    profileCache.set(summonerId, profile);
    return profile;
  } catch { return null; }
}

async function fetchProfiles(summonerIds: number[]): Promise<void> {
  const creds = readLockfile();
  if (!creds) return;
  const unique = [...new Set(summonerIds.filter((id) => id > 0))];
  const results = await Promise.allSettled(unique.map((id) => fetchProfile(creds, id)));
  const profiles = results
    .filter((r): r is PromiseFulfilledResult<ProfileData | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter(Boolean);
  if (profiles.length > 0) send('profile:data', profiles);
}

// ── Champ Select polling ─────────────────────────────────────────────────────
let lastCSHash = '';

async function tryPollChampSelect(): Promise<boolean> {
  const creds = readLockfile();
  if (!creds) return false;

  try {
    const raw = await fetchLCU(creds, '/lol-champ-select/v1/session') as Record<string, unknown>;

    const localCellId = raw.localPlayerCellId as number;
    const mapPlayer = (p: Record<string, unknown>, isMyTeam: boolean) => ({
      cellId:           p.cellId as number,
      championId:       p.championId as number,
      championName:     champIdMap[p.championId as number] ?? (p.championId ? `#${p.championId}` : ''),
      assignedPosition: (p.assignedPosition as string ?? '').toUpperCase(),
      spell1Id:         p.spell1Id as number,
      spell2Id:         p.spell2Id as number,
      team:             p.team as number,
      isLocalPlayer:    isMyTeam && (p.cellId as number) === localCellId,
      summonerId:       (p.summonerId as number) ?? 0,
    });

    const myTeam   = ((raw.myTeam   as unknown[]) ?? []).map((p) => mapPlayer(p as Record<string, unknown>, true));
    const theirTeam = ((raw.theirTeam as unknown[]) ?? []).map((p) => mapPlayer(p as Record<string, unknown>, false));

    const timer    = raw.timer as Record<string, unknown> | undefined;
    const local    = myTeam.find((p) => p.isLocalPlayer);

    const state = {
      myTeam,
      theirTeam,
      phase:                timer?.phase as string ?? 'UNKNOWN',
      timeLeft:             Math.max(0, Math.floor(((timer?.adjustedTimeLeftInPhase as number) ?? 0) / 1000)),
      localPlayerChampion:  local?.championName ?? '',
      localPlayerPosition:  local?.assignedPosition ?? '',
    };

    send('game:status', 'champ-select');
    send('champselect:data', state);

    // Fetch player profiles (teammates)
    if (!profilesFetched) {
      profilesFetched = true;
      const ids = myTeam.map((p) => p.summonerId).filter((id) => id > 0);
      if (ids.length > 0) fetchProfiles(ids);
    }

    // Fetch stats API data for champ select
    fetchChampSelectStats(state);

    // Auto-trigger rune analysis when matchup changes
    const hash = `${local?.championId}:${theirTeam.map((p) => p.championId).join(',')}`;
    if (hash !== lastCSHash && local && local.championId > 0) {
      lastCSHash = hash;
      const enemyLaner = theirTeam.find(
        (p) => p.assignedPosition === local.assignedPosition && p.championId > 0,
      );
      if (enemyLaner || theirTeam.some((p) => p.championId > 0)) {
        autoRuneAnalysis(state);
      }
    }

    return true;
  } catch {
    return false;
  }
}

// ── Claude analysis ───────────────────────────────────────────────────────────
const CLAUDE_COOLDOWN_MS = 90_000;
let lastClaudeAt = 0;
let isAnalysing  = false;

async function callClaude(prompt: string, maxTokens: number, channel: string): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { send(channel, '**No API key.** Click ⚙️ to enter your Anthropic key.'); return; }

  isAnalysing = true;
  send('game:analysing', true);

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });
    lastClaudeAt = Date.now();
    send(channel, (msg.content[0] as { text: string }).text);
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    send(channel, `Analysis error: ${err}`);
  } finally {
    isAnalysing = false;
    send('game:analysing', false);
  }
}

async function runClaudeAnalysis(prompt: string): Promise<void> {
  await callClaude(prompt, 700, 'game:analysis');
}

function autoRuneAnalysis(state: Record<string, unknown>): void {
  if (isAnalysing || !process.env.ANTHROPIC_API_KEY) return;

  const myTeam   = state.myTeam as Array<{ championName: string; assignedPosition: string; isLocalPlayer: boolean }>;
  const theirTeam = state.theirTeam as Array<{ championName: string; assignedPosition: string }>;
  const local     = myTeam.find((p) => p.isLocalPlayer);
  if (!local || !local.championName) return;

  const enemyLaner = theirTeam.find((p) => p.assignedPosition === local.assignedPosition && p.championName);
  const enemyPicks = theirTeam.filter((p) => p.championName).map((p) => `${p.championName} (${p.assignedPosition || '?'})`).join(', ');
  const allyPicks  = myTeam.filter((p) => p.championName).map((p) => `${p.championName} (${p.assignedPosition || '?'})`).join(', ');

  const prompt = `You are a Diamond+ League of Legends coach in champ select.

I'm playing **${local.championName}** ${local.assignedPosition || ''}.${enemyLaner ? `\nMy lane opponent: **${enemyLaner.championName}**.` : ''}

My team: ${allyPicks || 'drafting'}
Enemy team: ${enemyPicks || 'drafting'}

Give me the **optimal rune page and first 3 items** for this specific matchup. Be concise:

### Runes
**Primary: [Tree]**
- Keystone: [name] — [one reason]
- [slot1]
- [slot2]
- [slot3]

**Secondary: [Tree]**
- [name] — [reason]
- [name] — [reason]

**Shards:** [offense] / [flex] / [defense]

### Starting Items
[item + pots]

### Core Build (first 3 items in order)
1. [item] — [reason]
2. [item] — [reason]
3. [item] — [reason]

### Matchup Tips
- 3 concise tips for laning phase vs this specific matchup`;

  callClaude(prompt, 1000, 'champselect:runes');
}

// ── Stats API bridge ─────────────────────────────────────────────────────────
const STATS_API_BASE = 'http://localhost:3001';
let statsApiAvailable = false;

function fetchStatsApi(endpoint: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    http.get(`${STATS_API_BASE}${endpoint}`, (res) => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function checkStatsApi(): Promise<void> {
  try {
    await fetchStatsApi('/health');
    if (!statsApiAvailable) console.log('[Main] Stats API connected at', STATS_API_BASE);
    statsApiAvailable = true;
  } catch { statsApiAvailable = false; }
}

// Reverse-lookup: champion name → championId from Data Dragon
let champNameToId: Record<string, number> = {};
function buildChampNameIndex(): void {
  for (const [id, name] of Object.entries(champIdMap)) {
    champNameToId[name.toLowerCase()] = parseInt(id, 10);
  }
}

// When champ select changes, fetch builds from stats API
let lastStatsFetchHash = '';

async function fetchChampSelectStats(state: Record<string, unknown>): Promise<void> {
  if (!statsApiAvailable) return;
  const myTeam  = state.myTeam as Array<{ championName: string; assignedPosition: string; isLocalPlayer: boolean; championId: number }>;
  const theirTeam = state.theirTeam as Array<{ championName: string; assignedPosition: string; championId: number }>;
  const local    = myTeam.find((p) => p.isLocalPlayer);
  if (!local || !local.championName) return;

  const hash = `stats:${local.championId}:${local.assignedPosition}`;
  if (hash === lastStatsFetchHash) return;
  lastStatsFetchHash = hash;

  const champId = local.championId || champNameToId[local.championName.toLowerCase()];
  if (!champId) return;

  const posMap: Record<string, string> = { TOP: 'TOP', JUNGLE: 'JUNGLE', MIDDLE: 'MIDDLE', BOTTOM: 'BOTTOM', UTILITY: 'UTILITY' };
  const role = posMap[local.assignedPosition] ?? '';

  try {
    const [champData, matchupData] = await Promise.allSettled([
      fetchStatsApi(`/api/champions/${champId}?role=${role}`),
      fetchStatsApi(`/api/matchups/${champId}?role=${role}`),
    ]);
    const result: Record<string, unknown> = {};
    if (champData.status === 'fulfilled') result.champion = champData.value;
    if (matchupData.status === 'fulfilled') result.matchups = matchupData.value;

    // Find specific matchup for lane opponent
    const enemyLaner = theirTeam.find((p) => p.assignedPosition === local.assignedPosition && p.championId > 0);
    if (enemyLaner) {
      const enemyId = enemyLaner.championId || champNameToId[enemyLaner.championName.toLowerCase()];
      if (enemyId && matchupData.status === 'fulfilled') {
        const matchups = matchupData.value as { matchups?: Array<{ opponentId: number }> };
        const specific = (matchups.matchups ?? matchups as unknown as Array<{ opponentId: number }>);
        if (Array.isArray(specific)) {
          result.laneMatchup = specific.find((m: { opponentId: number }) => m.opponentId === enemyId) ?? null;
        }
      }
    }

    send('champselect:stats', result);
  } catch { /* stats API not available or no data */ }
}

// In-game: fetch builds for active player
let lastInGameStatsFetch = '';

async function fetchInGameStats(raw: unknown): Promise<void> {
  if (!statsApiAvailable) return;
  const activePlayer = (raw as { activePlayer?: { championName?: string } })?.activePlayer;
  const allPlayers   = (raw as { allPlayers?: Array<{ championName: string; team: string; position?: string }> })?.allPlayers;
  if (!activePlayer?.championName || !allPlayers) return;

  const champName = activePlayer.championName;
  const self = allPlayers.find((p) => p.championName === champName);
  const position = self?.position ?? '';
  const hash = `ingame:${champName}:${position}`;
  if (hash === lastInGameStatsFetch) return;
  lastInGameStatsFetch = hash;

  const champId = champNameToId[champName.toLowerCase()];
  if (!champId) return;

  try {
    const data = await fetchStatsApi(`/api/champions/${champId}?role=${position}`);
    send('game:stats', data);
  } catch { /* no stats available */ }
}

// ── IPC ───────────────────────────────────────────────────────────────────────
ipcMain.on('analysis:request', (_e, prompt: string) => {
  if (!isAnalysing) runClaudeAnalysis(prompt);
});

ipcMain.on('champselect:request-runes', () => {
  if (lastCSHash) {
    // Re-trigger with current state
    lastCSHash = '';
  }
});

ipcMain.handle('stats:champion', async (_e, championId: number, role: string) => {
  if (!statsApiAvailable) return null;
  try { return await fetchStatsApi(`/api/champions/${championId}?role=${role}`); } catch { return null; }
});

ipcMain.handle('stats:builds', async (_e, championId: number, role: string) => {
  if (!statsApiAvailable) return null;
  try { return await fetchStatsApi(`/api/builds/${championId}?role=${role}`); } catch { return null; }
});

ipcMain.handle('stats:matchups', async (_e, championId: number, role: string) => {
  if (!statsApiAvailable) return null;
  try { return await fetchStatsApi(`/api/matchups/${championId}?role=${role}`); } catch { return null; }
});

ipcMain.handle('stats:available', () => statsApiAvailable);

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

// ── Auto-analysis trigger ─────────────────────────────────────────────────────
let lastEventId = -1;
let lastAutoAt  = 0;
const AUTO_MIN_INTERVAL_MS = 3 * 60_000;

interface RawEvent { EventID: number; EventName: string }
const AUTO_TRIGGERS = new Set(['FirstBlood', 'DragonKill', 'BaronKill', 'HeraldKill']);

function checkAutoAnalysis(raw: unknown): void {
  if (isAnalysing) return;
  if (!process.env.ANTHROPIC_API_KEY) return;
  if (Date.now() - lastClaudeAt < CLAUDE_COOLDOWN_MS) return;
  if (Date.now() - lastAutoAt < AUTO_MIN_INTERVAL_MS) return;

  const events: RawEvent[] =
    (raw as { events?: { Events?: RawEvent[] } })?.events?.Events ?? [];
  const newEvents = events.filter((e) => e.EventID > lastEventId);
  if (events.length > 0) lastEventId = Math.max(...events.map((e) => e.EventID));

  const hasObjective = newEvents.some((e) => AUTO_TRIGGERS.has(e.EventName));
  const champKills   = newEvents.filter((e) => e.EventName === 'ChampionKill').length;

  if (hasObjective || champKills >= 2) {
    lastAutoAt = Date.now();
    send('game:trigger-analysis', null);
  }
}

// ── Polling loop ──────────────────────────────────────────────────────────────
let pollTimer: ReturnType<typeof setInterval> | null = null;

async function poll(): Promise<void> {
  // Priority 1: active game
  try {
    const raw = await fetchLiveData();
    send('game:status', 'in-game');
    send('game:data', raw);
    checkAutoAnalysis(raw);
    fetchInGameStats(raw);
    lastCSHash = '';       // reset so next champ select re-triggers analysis
    lastStatsFetchHash = ''; // reset for next champ select
    profilesFetched = false; // reset profile cache for next champ select
    return;
  } catch { /* not in game */ }

  // Priority 2: champ select
  const inCS = await tryPollChampSelect();
  if (inCS) return;

  // Neither
  send('game:status', 'waiting');
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
app.whenReady().then(async () => {
  createWindow();
  registerHotkey();
  await loadChampionIdMap();
  buildChampNameIndex();
  await checkStatsApi();
  setInterval(checkStatsApi, 30_000); // re-check every 30s
  pollTimer = setInterval(poll, POLL_MS);
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (pollTimer) clearInterval(pollTimer);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
