import type { Player } from '../types';
import { isSplitPusher } from '../data/splitpushChamps';
import { getChampClass } from '../data/championClasses';

export function getSplitAdvice(self: Player, enemies: Player[], gameTime: number): string | null {
  const selfClass = getChampClass(self.championName);
  const canSplit  = isSplitPusher(self.championName);

  // Count dead enemies (free split window)
  const deadEnemies = enemies.filter((e) => e.isDead).length;

  if (canSplit && gameTime > 20 * 60) {
    if (deadEnemies >= 2) {
      return `Split push now — ${deadEnemies} enemies are dead. Push a side lane and force a response.`;
    }
    const shen = enemies.find((e) => e.championName === 'Shen');
    if (shen && !shen.isDead) {
      return `Be careful splitting — enemy Shen can R to join any fight instantly. Communicate with your team.`;
    }
    return `You have strong 1v1 potential. Split side lanes to force enemy to send 1-2 to answer, freeing up your team.`;
  }

  if (!canSplit && selfClass === 'Marksman') {
    return `Group with your team. As ADC your damage is most effective in 5v5 teamfights.`;
  }

  return null;
}
