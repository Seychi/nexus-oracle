import React from 'react';
import { useStore } from '../../store/gameStore';
import PlayerCard from '../shared/PlayerCard';
import Markdown from 'react-markdown';

function GoldBar() {
  const { analysis } = useStore();
  if (!analysis) return null;
  const { gold } = analysis;
  const total = gold.allyEstimate + gold.enemyEstimate || 1;
  const allyPct = Math.round((gold.allyEstimate / total) * 100);
  const diffStr = Math.abs(gold.diff) >= 1000
    ? `${gold.diff > 0 ? '+' : ''}${(gold.diff / 1000).toFixed(1)}k`
    : `${gold.diff > 0 ? '+' : ''}${gold.diff}`;

  return (
    <div className="px-2 py-1.5 bg-lol-card border-b border-white/[0.07]">
      <div className="flex justify-between text-[9px] text-lol-dim mb-1">
        <span className="text-lol-ally font-semibold">{(gold.allyEstimate / 1000).toFixed(1)}k</span>
        <span className={`font-bold ${gold.leading === 'ally' ? 'text-lol-green' : gold.leading === 'enemy' ? 'text-lol-enemy' : 'text-lol-dim'}`}>
          {diffStr} gold
        </span>
        <span className="text-lol-enemy font-semibold">{(gold.enemyEstimate / 1000).toFixed(1)}k</span>
      </div>
      <div className="h-1.5 rounded-full bg-lol-enemy/40 overflow-hidden">
        <div className="h-full bg-lol-ally rounded-full transition-all duration-500" style={{ width: `${allyPct}%` }} />
      </div>
    </div>
  );
}

function AlertFeed() {
  const { analysis } = useStore();
  if (!analysis?.alerts.length) return null;

  const colors: Record<string, string> = {
    danger:  'border-lol-enemy bg-lol-enemy/10 text-lol-enemy',
    warning: 'border-lol-orange bg-lol-orange/10 text-lol-orange',
    info:    'border-lol-ally bg-lol-ally/10 text-lol-ally',
    success: 'border-lol-green bg-lol-green/10 text-lol-green',
  };

  return (
    <div className="px-2 py-1.5 flex flex-col gap-1">
      {analysis.alerts.map((a) => (
        <div key={a.id} className={`text-[10px] px-2 py-1 rounded border-l-2 ${colors[a.type] ?? colors.info}`}>
          {a.message}
        </div>
      ))}
    </div>
  );
}

function ClaudePanel() {
  const { analysis } = useStore();
  if (!analysis) return null;

  if (analysis.isAnalysing) return (
    <div className="flex items-center gap-2 px-3 py-3 text-lol-dim text-xs">
      <div className="w-4 h-4 border-2 border-lol-gold/30 border-t-lol-gold rounded-full animate-spin" />
      Analysing with Claude…
    </div>
  );

  if (!analysis.claudeAnalysis) return (
    <div className="px-3 py-2 text-[10px] text-lol-dim text-center">
      Press <span className="text-lol-gold">🧠 Analyse</span> for AI advice
    </div>
  );

  return (
    <div className="px-2 pb-2">
      <div className="text-[9px] text-lol-gold font-bold uppercase tracking-widest mb-1 px-1">AI Insights</div>
      <div className="text-[10px] text-lol-text leading-relaxed prose prose-invert max-w-none
        [&_h3]:text-[10px] [&_h3]:font-bold [&_h3]:text-lol-gold [&_h3]:mt-2 [&_h3]:mb-0.5
        [&_ul]:pl-3 [&_li]:mb-0.5 [&_strong]:text-white [&_p]:mb-1">
        <Markdown>{analysis.claudeAnalysis}</Markdown>
      </div>
    </div>
  );
}

export default function OverviewTab() {
  const { game } = useStore();
  if (!game) return null;

  return (
    <div className="flex flex-col gap-0 overflow-y-auto">
      <GoldBar />
      <AlertFeed />

      {/* Teams side by side */}
      <div className="flex gap-1.5 px-2 py-1.5">
        <div className="flex-1 flex flex-col gap-1">
          <div className="text-[9px] font-bold text-lol-ally uppercase tracking-widest">Allies</div>
          {game.allies.map((p) => <PlayerCard key={p.summonerName} player={p} accent="ally" />)}
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="text-[9px] font-bold text-lol-enemy uppercase tracking-widest">Enemies</div>
          {game.enemies.map((p) => <PlayerCard key={p.summonerName} player={p} accent="enemy" />)}
        </div>
      </div>

      <ClaudePanel />
    </div>
  );
}
