import type { Player, ItemRecommendation, ChampionStats } from '../types';
import { getChampClass } from '../data/championClasses';
import { profileDamage } from './damageProfiler';
import { playerHasGW } from '../data/antihealItems';
import { isHealingChamp } from '../data/healingChamps';

interface SuggestedItem {
  name: string;
  reason: string;
  priority: ItemRecommendation['priority'];
  counters: string;
}

export function recommendItems(
  enemies: Player[],
  self: Player,
  selfStats: ChampionStats
): ItemRecommendation[] {
  const suggestions: SuggestedItem[] = [];
  const dmg = profileDamage(enemies);
  const selfClass = getChampClass(self.championName);
  const selfItemNames = self.items.map((i) => i.name);
  const has = (name: string) => selfItemNames.some((n) => n.includes(name));

  // ── Anti-heal ──────────────────────────────────────────────────────────────
  const healers = enemies.filter((p) => isHealingChamp(p.championName));
  if (healers.length >= 2 && !playerHasGW(self.items.map((i) => i.id))) {
    const item = selfClass === 'Mage' ? 'Morellonomicon'
      : selfClass === 'Marksman'      ? 'Mortal Reminder'
      : selfClass === 'Tank'          ? 'Thornmail'
      : 'Chempunk Chainsword';
    suggestions.push({
      name: item, priority: 'high',
      reason: `Enemy has ${healers.map((p) => p.championName).join(', ')} — buy anti-heal`,
      counters: healers.map((p) => p.championName).join(', '),
    });
  }

  // ── Armour vs heavy AD ─────────────────────────────────────────────────────
  if (dmg.adPercent >= 60 && selfStats.armor < 80) {
    const item = selfClass === 'Mage' ? 'Zhonya\'s Hourglass'
      : selfClass === 'Marksman'      ? 'Randuin\'s Omen'
      : 'Thornmail';
    if (!has('Zhonya') && !has('Thornmail') && !has('Randuin')) {
      suggestions.push({
        name: item, priority: 'high',
        reason: `${dmg.adPercent}% AD damage — your armor is low (${selfStats.armor})`,
        counters: dmg.adChamps.join(', '),
      });
    }
  }

  // ── MR vs heavy AP ────────────────────────────────────────────────────────
  if (dmg.apPercent >= 60 && selfStats.mr < 80) {
    const item = selfClass === 'Marksman' ? 'Maw of Malmortius'
      : selfClass === 'Fighter'           ? 'Spirit Visage'
      : 'Force of Nature';
    if (!has('Maw') && !has('Spirit Visage') && !has('Force of Nature')) {
      suggestions.push({
        name: item, priority: 'high',
        reason: `${dmg.apPercent}% AP damage — your MR is low (${selfStats.mr})`,
        counters: dmg.apChamps.join(', '),
      });
    }
  }

  // ── Armor pen vs tanks ────────────────────────────────────────────────────
  const enemyTankCount = enemies.filter((p) => getChampClass(p.championName) === 'Tank').length;
  if (enemyTankCount >= 2 && (selfClass === 'Marksman' || selfClass === 'Fighter' || selfClass === 'Assassin')) {
    if (!has('Lord Dominik') && !has('Black Cleaver') && !has('Serylda')) {
      const item = selfClass === 'Marksman' ? 'Lord Dominik\'s Regards' : 'Black Cleaver';
      suggestions.push({
        name: item, priority: 'medium',
        reason: `${enemyTankCount} tanks — get armor penetration`,
        counters: 'Tanks',
      });
    }
  }

  // ── Magic pen vs MR stackers ──────────────────────────────────────────────
  const enemyFrontline = enemies.filter((p) => {
    const c = getChampClass(p.championName);
    return c === 'Tank' || c === 'Fighter';
  }).length;
  if (selfClass === 'Mage' && enemyFrontline >= 2 && !has('Void Staff') && !has('Shadowflame')) {
    suggestions.push({
      name: 'Void Staff', priority: 'medium',
      reason: `${enemyFrontline} bruisers/tanks — magic pen helps`,
      counters: 'Tanks/Fighters',
    });
  }

  // ── Survivability ─────────────────────────────────────────────────────────
  const feedKillers = enemies.filter((p) => p.kills >= 5 && getChampClass(p.championName) === 'Assassin');
  if (feedKillers.length > 0 && !has('Zhonya') && !has('Guardian Angel') && !has('Sterak')) {
    const item = selfClass === 'Mage' ? 'Zhonya\'s Hourglass'
      : selfClass === 'Marksman'      ? 'Guardian Angel'
      : 'Sterak\'s Gage';
    suggestions.push({
      name: item, priority: 'high',
      reason: `${feedKillers[0].championName} (${feedKillers[0].kills} kills) can burst you`,
      counters: feedKillers.map((p) => p.championName).join(', '),
    });
  }

  return suggestions.slice(0, 4);
}
