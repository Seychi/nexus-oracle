import React from 'react';
import { useStore } from '../../store/gameStore';
import PlayerCard from '../shared/PlayerCard';

function WinProbability() {
  const { analysis } = useStore();
  if (!analysis) return null;
  const { probability, factors } = analysis.winPrediction;
  const color = probability >= 60 ? 'text-lol-green' : probability <= 40 ? 'text-lol-enemy' : 'text-lol-gold';
  const barColor = probability >= 60 ? 'bg-lol-green' : probability <= 40 ? 'bg-lol-enemy' : 'bg-lol-gold';

  return (
    <div className="px-2 py-1.5 bg-lol-card border-b border-white/[0.07]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-lol-dim uppercase tracking-widest">Win Probability</span>
        <span className={`text-[13px] font-bold ${color}`}>{probability}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden mb-1.5">
        <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${probability}%` }} />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {factors.map((f) => (
          <span key={f.name} className={`text-[8px] ${
            f.impact === 'positive' ? 'text-lol-green' : f.impact === 'negative' ? 'text-lol-enemy' : 'text-lol-dim'
          }`}>
            {f.name}: {f.value}
          </span>
        ))}
      </div>
    </div>
  );
}

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

function LaneStates() {
  const { analysis } = useStore();
  if (!analysis?.laneStates.length) return null;
  const lanes = analysis.laneStates.filter((l) => l.ally || l.enemy);
  if (lanes.length === 0) return null;

  const diffColor = (d: number) => d > 0 ? 'text-lol-green' : d < 0 ? 'text-lol-enemy' : 'text-lol-dim';
  const fmt = (d: number) => (d > 0 ? '+' : '') + d;

  return (
    <div className="px-2 py-1.5">
      <div className="text-[9px] font-bold text-lol-gold uppercase tracking-widest mb-1">Lane Matchups</div>
      <div className="flex flex-col gap-0.5">
        {lanes.map((lane) => (
          <div key={lane.position} className="flex items-center text-[9px] gap-1">
            <span className="w-6 text-lol-dim font-bold">{lane.position}</span>
            <span className="flex-1 text-lol-ally truncate">{lane.ally?.championName ?? '—'}</span>
            <span className={`w-8 text-center font-bold ${diffColor(lane.csDiff)}`}>{fmt(lane.csDiff)}</span>
            <span className="text-[7px] text-lol-dim w-4">CS</span>
            <span className={`w-6 text-center font-bold ${diffColor(lane.levelDiff)}`}>{fmt(lane.levelDiff)}</span>
            <span className="text-[7px] text-lol-dim w-4">Lv</span>
            <span className="flex-1 text-lol-enemy truncate text-right">{lane.enemy?.championName ?? '—'}</span>
          </div>
        ))}
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

export default function OverviewTab() {
  const { game } = useStore();
  if (!game) return null;

  const allyKills  = game.allies.reduce((s, p) => s + p.kills, 0);
  const enemyKills = game.enemies.reduce((s, p) => s + p.kills, 0);

  return (
    <div className="flex flex-col gap-0 overflow-y-auto">
      <WinProbability />
      <GoldBar />
      <LaneStates />
      <AlertFeed />

      {/* Teams side by side */}
      <div className="flex gap-1.5 px-2 py-1.5">
        <div className="flex-1 flex flex-col gap-1">
          <div className="text-[9px] font-bold text-lol-ally uppercase tracking-widest">Allies</div>
          {game.allies.map((p) => <PlayerCard key={p.summonerName} player={p} accent="ally" teamKills={allyKills} />)}
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="text-[9px] font-bold text-lol-enemy uppercase tracking-widest">Enemies</div>
          {game.enemies.map((p) => <PlayerCard key={p.summonerName} player={p} accent="enemy" teamKills={enemyKills} />)}
        </div>
      </div>

    </div>
  );
}
