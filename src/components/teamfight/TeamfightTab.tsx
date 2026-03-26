import React from 'react';
import { useStore } from '../../store/gameStore';
import { getTeamfightAdvice } from '../../engine/teamfightCoach';
import { DDImg, champUrl } from '../shared/ChampIcon';
import type { ThreatEntry } from '../../types';

const PRIORITY_STYLES: Record<string, string> = {
  extreme: 'bg-lol-enemy/20 border-lol-enemy text-lol-enemy',
  high:    'bg-lol-orange/20 border-lol-orange text-lol-orange',
  medium:  'bg-lol-gold/10 border-lol-gold text-lol-gold',
  low:     'bg-white/5 border-white/10 text-lol-dim',
};

function ThreatCard({ entry, rank }: { entry: ThreatEntry; rank: number }) {
  const style = PRIORITY_STYLES[entry.priority];
  return (
    <div className={`flex items-start gap-2 p-2 rounded border ${style}`}>
      <span className="text-xs font-black w-4 text-center">{rank}</span>
      <DDImg src={champUrl(entry.player.ddKey)} alt={entry.player.championName} className="w-7 h-7 rounded object-cover flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold">{entry.player.championName}</span>
          <span className="text-[9px] opacity-70">{entry.player.kills}/{entry.player.deaths}/{entry.player.assists}</span>
          <span className="text-[8px] uppercase font-semibold tracking-wide opacity-60">{entry.champClass}</span>
        </div>
        <div className="text-[9px] opacity-80 mt-0.5">{entry.reasons.slice(0, 2).join(' · ')}</div>
      </div>
      <span className="text-[8px] font-bold uppercase">{entry.priority}</span>
    </div>
  );
}

function AdviceBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-lol-card border border-white/[0.07] rounded p-2">
      <div className="text-[9px] font-bold text-lol-gold uppercase tracking-widest mb-1">{title}</div>
      <p className="text-[10px] text-lol-text leading-relaxed">{text}</p>
    </div>
  );
}

export default function TeamfightTab() {
  const { game, analysis } = useStore();
  if (!game || !analysis) return null;

  const self     = game.allies.find((p) => p.isSelf) ?? game.allies[0];
  const advice   = self ? getTeamfightAdvice(self) : null;
  const { comp } = analysis;

  const engageColor = comp.engageAdvantage === 'ally' ? 'text-lol-green'
    : comp.engageAdvantage === 'enemy' ? 'text-lol-enemy' : 'text-lol-dim';

  return (
    <div className="flex flex-col gap-2 p-2 overflow-y-auto">
      {/* Engage advantage */}
      <div className="flex items-center justify-between bg-lol-card border border-white/[0.07] rounded p-2">
        <span className="text-[9px] text-lol-dim uppercase tracking-widest">Engage advantage</span>
        <span className={`text-xs font-bold uppercase ${engageColor}`}>{comp.engageAdvantage}</span>
      </div>

      {/* Archetypes */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-lol-card border border-lol-ally/20 rounded p-1.5 text-center">
          <div className="text-[8px] text-lol-ally uppercase tracking-widest mb-0.5">Your comp</div>
          <div className="text-[10px] font-bold text-lol-text">{comp.allyArchetype}</div>
        </div>
        <div className="bg-lol-card border border-lol-enemy/20 rounded p-1.5 text-center">
          <div className="text-[8px] text-lol-enemy uppercase tracking-widest mb-0.5">Enemy comp</div>
          <div className="text-[10px] font-bold text-lol-text">{comp.enemyArchetype}</div>
        </div>
      </div>

      {/* Threat ranking */}
      <div>
        <div className="text-[9px] font-bold text-lol-gold uppercase tracking-widest mb-1.5">Threat ranking</div>
        <div className="flex flex-col gap-1">
          {analysis.threats.map((t, i) => <ThreatCard key={t.player.summonerName} entry={t} rank={i + 1} />)}
        </div>
      </div>

      {/* Role advice */}
      {advice && (
        <div className="flex flex-col gap-1.5">
          <AdviceBlock title="Your role"        text={advice.roleAdvice} />
          <AdviceBlock title="Positioning"      text={advice.positioning} />
          <AdviceBlock title="Read the engage"  text={advice.engageRead} />
        </div>
      )}

      {/* Matchup warnings */}
      {comp.matchupWarnings.length > 0 && (
        <div className="flex flex-col gap-1">
          {comp.matchupWarnings.map((w, i) => (
            <div key={i} className="text-[10px] border-l-2 border-lol-orange bg-lol-orange/10 text-lol-orange px-2 py-1 rounded">
              {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
