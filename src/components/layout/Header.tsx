import React, { useState } from 'react';
import { useStore } from '../../store/gameStore';
import { buildPrompt } from '../../api/claudeAnalysis';

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

interface Props { onSettings: () => void; }

export default function Header({ onSettings }: Props) {
  const { status, game, analysis } = useStore();
  const [locked, setLocked] = useState(false);

  const toggleLock = () => {
    const next = !locked;
    setLocked(next);
    window.electronAPI.setClickThrough(next);
  };

  const requestAnalysis = () => {
    if (!game) return;
    window.electronAPI.requestAnalysis(buildPrompt(game));
  };

  const isAnalysing = analysis?.isAnalysing ?? false;

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-lol-bg/95 border-b border-white/[0.07] select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      {/* Left: status */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status === 'in-game' ? 'bg-lol-green shadow-[0_0_5px_#4dba87]' : 'bg-lol-dim'}`} />
        <span className="text-2xs text-lol-dim font-medium tracking-wide">
          {status === 'in-game'
            ? `${game?.gameMode ?? 'CLASSIC'} · ${fmt(game?.gameTime ?? 0)}`
            : 'NEXUS ORACLE · Waiting…'}
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {status === 'in-game' && (
          <button
            onClick={requestAnalysis}
            disabled={isAnalysing}
            title="Get Claude AI analysis (Ctrl+Shift+O to toggle overlay)"
            className="px-2 py-0.5 text-2xs rounded bg-lol-gold/10 border border-lol-gold/30 text-lol-gold hover:bg-lol-gold/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isAnalysing ? '⏳' : '🧠 Analyse'}
          </button>
        )}
        <button
          onClick={toggleLock}
          title={locked ? 'Click-through ON — overlay is locked' : 'Click-through OFF'}
          className={`w-6 h-6 text-xs rounded flex items-center justify-center transition-colors ${locked ? 'bg-lol-gold/20 text-lol-gold' : 'hover:bg-white/5 text-lol-dim'}`}
        >
          {locked ? '🔒' : '🔓'}
        </button>
        <button
          onClick={onSettings}
          title="Settings"
          className="w-6 h-6 text-xs rounded hover:bg-white/5 text-lol-dim flex items-center justify-center"
        >
          ⚙️
        </button>
      </div>
    </div>
  );
}
