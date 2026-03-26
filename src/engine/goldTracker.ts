import type { Player, GoldTracker } from '../types';

const CS_GOLD    = 22;   // average gold per CS
const KILL_GOLD  = 300;
const ASSIST_GOLD = 150;
const TURRET_GOLD = 250; // approximate per plate/turret contribution

function estimateGold(players: Player[]): number {
  return players.reduce((sum, p) => {
    return sum
      + p.cs      * CS_GOLD
      + p.kills   * KILL_GOLD
      + p.assists * ASSIST_GOLD;
  }, 0);
}

export function computeGold(allies: Player[], enemies: Player[]): GoldTracker {
  const allyEstimate  = estimateGold(allies);
  const enemyEstimate = estimateGold(enemies);
  const diff          = allyEstimate - enemyEstimate;

  return {
    allyEstimate,
    enemyEstimate,
    diff,
    leading: Math.abs(diff) < 500 ? 'even' : diff > 0 ? 'ally' : 'enemy',
  };
}

export function formatGold(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}
