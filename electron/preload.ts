import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onStatus:    (cb: (s: string) => void)  => ipcRenderer.on('game:status',    (_, v) => cb(v)),
  onGameData:  (cb: (d: unknown) => void) => ipcRenderer.on('game:data',      (_, v) => cb(v)),
  onAnalysis:  (cb: (t: string) => void)  => ipcRenderer.on('game:analysis',  (_, v) => cb(v)),
  onAnalysing: (cb: (v: boolean) => void) => ipcRenderer.on('game:analysing', (_, v) => cb(v)),
  onTriggerAnalysis: (cb: () => void)     => ipcRenderer.on('game:trigger-analysis', () => cb()),

  // Champ select
  onChampSelectData: (cb: (d: unknown) => void) => ipcRenderer.on('champselect:data',  (_, v) => cb(v)),
  onRuneAdvice:      (cb: (t: string) => void)  => ipcRenderer.on('champselect:runes', (_, v) => cb(v)),
  onPlayerProfiles:  (cb: (d: unknown) => void) => ipcRenderer.on('profile:data',      (_, v) => cb(v)),

  // Stats API data (pushed from main)
  onChampSelectStats: (cb: (d: unknown) => void) => ipcRenderer.on('champselect:stats', (_, v) => cb(v)),
  onGameStats:        (cb: (d: unknown) => void) => ipcRenderer.on('game:stats',        (_, v) => cb(v)),

  // Stats API queries (invoke = async response)
  getChampionStats: (championId: number, role: string) => ipcRenderer.invoke('stats:champion', championId, role),
  getChampionBuilds: (championId: number, role: string) => ipcRenderer.invoke('stats:builds', championId, role),
  getChampionMatchups: (championId: number, role: string) => ipcRenderer.invoke('stats:matchups', championId, role),
  isStatsApiAvailable: () => ipcRenderer.invoke('stats:available'),

  requestAnalysis:     (prompt: string) => ipcRenderer.send('analysis:request', prompt),
  requestRuneAnalysis: ()               => ipcRenderer.send('champselect:request-runes'),
  setApiKey:           (key: string)    => ipcRenderer.send('api:set-key', key),
  setClickThrough:     (on: boolean)    => ipcRenderer.send('overlay:click-through', on),
});
