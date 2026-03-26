export {};

declare global {
  interface Window {
    electronAPI: {
      onStatus:    (cb: (s: string)    => void) => void;
      onGameData:  (cb: (d: unknown)   => void) => void;
      onAnalysis:  (cb: (t: string)    => void) => void;
      onAnalysing: (cb: (v: boolean)   => void) => void;
      onTriggerAnalysis: (cb: ()        => void) => void;

      // Champ select
      onChampSelectData: (cb: (d: unknown)  => void) => void;
      onRuneAdvice:      (cb: (t: string)   => void) => void;
      onPlayerProfiles:  (cb: (d: unknown)  => void) => void;

      // Stats API data (pushed from main)
      onChampSelectStats: (cb: (d: unknown) => void) => void;
      onGameStats:        (cb: (d: unknown) => void) => void;

      // Stats API queries (async)
      getChampionStats:   (championId: number, role: string) => Promise<unknown>;
      getChampionBuilds:  (championId: number, role: string) => Promise<unknown>;
      getChampionMatchups:(championId: number, role: string) => Promise<unknown>;
      isStatsApiAvailable: () => Promise<boolean>;

      requestAnalysis:     (prompt: string) => void;
      requestRuneAnalysis: ()               => void;
      setApiKey:           (key: string)    => void;
      setClickThrough:     (on: boolean)    => void;
    };
  }
}
