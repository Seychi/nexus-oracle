import React from 'react';
import type { Player } from '../../types';
import { DDImg, champUrl, itemUrl, spellUrl } from './ChampIcon';

interface Props { player: Player; accent: 'ally' | 'enemy'; compact?: boolean; }

export default function PlayerCard({ player: p, accent, compact }: Props) {
  const borderColor = p.isSelf ? 'border-l-lol-gold' : accent === 'ally' ? 'border-l-lol-ally' : 'border-l-lol-enemy';

  return (
    <div className={`bg-lol-card border border-white/[0.07] border-l-2 ${borderColor} rounded p-1.5 flex flex-col gap-1 ${p.isDead ? 'opacity-40' : ''}`}>
      {/* Top row */}
      <div className="flex items-start gap-1.5">
        <DDImg src={champUrl(p.ddKey)} alt={p.championName} className="w-8 h-8 rounded object-cover flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-2xs font-bold text-lol-text truncate">{p.championName}</span>
            {p.isDead && <span className="text-[9px] text-lol-enemy">☠ {Math.ceil(p.respawnTimer)}s</span>}
          </div>
          <div className="text-[9px] text-lol-dim truncate">{p.summonerName}</div>
          <div className="flex gap-1.5 mt-0.5 text-[9px]">
            <span className="text-lol-text">{p.kills}/{p.deaths}/{p.assists}</span>
            <span className="text-lol-dim">{p.cs}cs</span>
            <span className="text-lol-gold">Lv.{p.level}</span>
          </div>
        </div>

        {/* Summoner spells */}
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          {p.summonerSpells.map((spell, i) => {
            const url = spellUrl(spell);
            return url
              ? <DDImg key={i} src={url} alt={spell} className="w-4 h-4 rounded" />
              : <div key={i} className="w-4 h-4 bg-lol-card2 rounded text-[7px] flex items-center justify-center text-lol-dim">{spell[0]}</div>;
          })}
        </div>
      </div>

      {/* Runes */}
      {!compact && (
        <div className="flex gap-1 flex-wrap">
          <span className="text-[8px] bg-lol-gold/10 border border-lol-gold/20 text-lol-gold px-1 rounded-full whitespace-nowrap">{p.keystone}</span>
          <span className="text-[8px] bg-white/[0.04] border border-white/[0.07] text-lol-dim px-1 rounded-full whitespace-nowrap">{p.secondaryTree}</span>
        </div>
      )}

      {/* Items */}
      <div className="flex gap-0.5">
        {p.items.map((item) => (
          <DDImg key={item.slot} src={itemUrl(item.id)} alt={item.name} className="w-5 h-5 rounded" />
        ))}
        {Array.from({ length: Math.max(0, 6 - p.items.length) }).map((_, i) => (
          <div key={`e${i}`} className="w-5 h-5 rounded bg-white/[0.03] border border-white/[0.05]" />
        ))}
      </div>
    </div>
  );
}
