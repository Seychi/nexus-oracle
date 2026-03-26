import type { Player, ThreatEntry, ThreatPriority, ChampionStats } from '../types';
import { getChampClass } from '../data/championClasses';

const CLASS_THREAT: Record<string, number> = {
  Assassin: 3, Mage: 2.5, Marksman: 2.5,
  Fighter: 1.8, Tank: 1, Enchanter: 0.8, Support: 1, Unknown: 1.5,
};

function kdaScore(p: Player): number {
  const deaths = Math.max(p.deaths, 1);
  return (p.kills * 2 + p.assists * 0.5) / deaths;
}

function itemScore(p: Player): number {
  return p.items.length * 1.5;
}

function levelScore(p: Player, selfLevel: number): number {
  return Math.max(0, p.level - selfLevel) * 0.5;
}

function priority(score: number): ThreatPriority {
  if (score >= 20) return 'extreme';
  if (score >= 12) return 'high';
  if (score >= 6)  return 'medium';
  return 'low';
}

export function rankThreats(enemies: Player[], selfStats: ChampionStats, selfLevel = 1): ThreatEntry[] {
  return enemies
    .map((p) => {
      const cls = getChampClass(p.championName);
      const classMultiplier = CLASS_THREAT[cls] ?? 1.5;
      const kda  = kdaScore(p);
      const items = itemScore(p);
      const lvl  = levelScore(p, selfLevel);
      const score = (kda * 4 + items + lvl) * classMultiplier;

      const reasons: string[] = [];
      if (p.kills >= 5)    reasons.push(`${p.kills} kills`);
      if (kda >= 3)        reasons.push(`${kda.toFixed(1)} KDA`);
      if (p.items.length >= 3) reasons.push(`${p.items.length} items`);
      if (cls === 'Assassin') reasons.push('Assassin — can one-shot');
      if (cls === 'Mage' && p.items.length >= 2) reasons.push('Mage with items — high burst');
      if (cls === 'Marksman' && p.items.length >= 2) reasons.push('ADC online — kite danger');

      // Stat-based threat
      if (selfStats.mr < 60 && cls === 'Mage')
        reasons.push(`Your MR ${selfStats.mr} — vulnerable to AP`);
      if (selfStats.armor < 60 && (cls === 'Assassin' || cls === 'Marksman'))
        reasons.push(`Your armor ${selfStats.armor} — vulnerable to AD`);

      return { player: p, score, reasons, champClass: cls, priority: priority(score) };
    })
    .sort((a, b) => b.score - a.score);
}
