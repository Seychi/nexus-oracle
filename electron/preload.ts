import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onStatus:    (cb: (s: string) => void)  => ipcRenderer.on('game:status',    (_, v) => cb(v)),
  onGameData:  (cb: (d: unknown) => void) => ipcRenderer.on('game:data',      (_, v) => cb(v)),
  onAnalysis:  (cb: (t: string) => void)  => ipcRenderer.on('game:analysis',  (_, v) => cb(v)),
  onAnalysing: (cb: (v: boolean) => void) => ipcRenderer.on('game:analysing', (_, v) => cb(v)),

  requestAnalysis: (prompt: string) => ipcRenderer.send('analysis:request', prompt),
  setApiKey:       (key: string)    => ipcRenderer.send('api:set-key', key),
  setClickThrough: (on: boolean)    => ipcRenderer.send('overlay:click-through', on),
});
