import React, { useEffect, useState } from 'react';
import { useStore } from './store/gameStore';
import { normaliseGame } from './api/liveClient';
import type { RawLiveData } from './types';
import Header from './components/layout/Header';
import TabNav from './components/layout/TabNav';
import Settings from './components/layout/Settings';
import OverviewTab from './components/overview/OverviewTab';
import TeamfightTab from './components/teamfight/TeamfightTab';
import ItemsTab from './components/items/ItemsTab';
import MacroTab from './components/macro/MacroTab';

export default function App() {
  const { status, activeTab, setStatus, setGame, setClaudeAnalysis, setAnalysing } = useStore();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const api = window.electronAPI;
    api.onStatus((s)    => setStatus(s as 'waiting' | 'in-game'));
    api.onGameData((raw) => {
      try { setGame(normaliseGame(raw as RawLiveData)); } catch { /* bad frame */ }
    });
    api.onAnalysis((text) => setClaudeAnalysis(text));
    api.onAnalysing((v)   => setAnalysing(v));
  }, []);

  return (
    <div className="flex flex-col h-screen bg-transparent overflow-hidden relative">
      <Header onSettings={() => setShowSettings((v) => !v)} />

      {status === 'waiting' ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-lol-dark/90 rounded-b">
          <span className="text-4xl">⚔️</span>
          <p className="text-xs text-lol-dim">Waiting for a game to start…</p>
          <p className="text-[10px] text-lol-dim/60">Launch League and enter a match.</p>
          <p className="text-[9px] text-lol-dim/40 mt-2">Ctrl+Shift+O to toggle overlay</p>
        </div>
      ) : (
        <>
          <TabNav />
          <div className="flex-1 overflow-hidden relative bg-lol-dark/90">
            {activeTab === 'overview'  && <OverviewTab />}
            {activeTab === 'teamfight' && <TeamfightTab />}
            {activeTab === 'items'     && <ItemsTab />}
            {activeTab === 'macro'     && <MacroTab />}
          </div>
        </>
      )}

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}
