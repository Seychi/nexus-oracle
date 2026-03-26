import type { Player, LaneState } from '../types';

const POSITIONS = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const;
const POSITION_LABELS: Record<string, string> = {
  TOP: 'Top', JUNGLE: 'Jg', MIDDLE: 'Mid', BOTTOM: 'Bot', UTILITY: 'Sup',
};
const INDEX_LABELS = ['Top', 'Jg', 'Mid', 'Bot', 'Sup'];

function calcState(csDiff: number, killDiff: number): LaneState['state'] {
  return csDiff > 15 || killDiff > 2 ? 'winning'
    : csDiff < -15 || killDiff < -2 ? 'losing'
    : 'even';
}

function makeLane(position: string, ally: Player | null, enemy: Player | null): LaneState {
  const csDiff    = (ally?.cs ?? 0) - (enemy?.cs ?? 0);
  const killDiff  = ((ally?.kills ?? 0) + (ally?.assists ?? 0) * 0.5)
                  - ((enemy?.kills ?? 0) + (enemy?.assists ?? 0) * 0.5);
  const levelDiff = (ally?.level ?? 0) - (enemy?.level ?? 0);
  return { position, ally, enemy, csDiff, killDiff, levelDiff, state: calcState(csDiff, killDiff) };
}

export function trackLanes(allies: Player[], enemies: Player[]): LaneState[] {
  // Check if the API populated positions
  const allyHasPos  = allies.some((p) => p.position !== '');
  const enemyHasPos = enemies.some((p) => p.position !== '');

  if (allyHasPos && enemyHasPos) {
    return POSITIONS
      .map((pos) => makeLane(
        POSITION_LABELS[pos] ?? pos,
        allies.find((p) => p.position === pos) ?? null,
        enemies.find((p) => p.position === pos) ?? null,
      ))
      .filter((l) => l.ally !== null || l.enemy !== null);
  }

  // Fallback: pair by index (API returns players in role order)
  const count = Math.min(allies.length, enemies.length, 5);
  return Array.from({ length: count }, (_, i) =>
    makeLane(INDEX_LABELS[i] ?? `L${i + 1}`, allies[i] ?? null, enemies[i] ?? null),
  );
}
