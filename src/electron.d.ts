export {};

declare global {
  interface Window {
    electronAPI: {
      onStatus:    (cb: (s: string)    => void) => void;
      onGameData:  (cb: (d: unknown)   => void) => void;
      onAnalysis:  (cb: (t: string)    => void) => void;
      onAnalysing: (cb: (v: boolean)   => void) => void;
      requestAnalysis: (prompt: string) => void;
      setApiKey:       (key: string)    => void;
      setClickThrough: (on: boolean)    => void;
    };
  }
}
