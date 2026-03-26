import type { Player, AntihealStatus } from '../types';
import { isHealingChamp } from '../data/healingChamps';
import { playerHasGW, GW_RECOMMENDATIONS } from '../data/antihealItems';
import { getChampClass } from '../data/championClasses';

export function auditAntiheal(enemies: Player[], allies: Player[], self: Player): AntihealStatus {
  const enemyHealers = enemies.filter((p) => isHealingChamp(p.championName)).map((p) => p.championName);

  const selfHasGW   = playerHasGW(self.items.map((i) => i.id));
  const allyGWCount = allies.filter((p) => playerHasGW(p.items.map((i) => i.id))).length;

  let urgency: AntihealStatus['urgency'] = 'none';
  if (enemyHealers.length === 1) urgency = 'consider';
  if (enemyHealers.length === 2) urgency = 'recommended';
  if (enemyHealers.length >= 3)  urgency = 'urgent';

  // Suggest item based on self's champion class
  const cls = getChampClass(self.championName);
  let suggestedItem: string | null = null;
  if (urgency !== 'none' && !selfHasGW) {
    if (cls === 'Marksman')                          suggestedItem = GW_RECOMMENDATIONS.ad.name;
    else if (cls === 'Mage' || cls === 'Enchanter')  suggestedItem = GW_RECOMMENDATIONS.mage.name;
    else if (cls === 'Tank')                         suggestedItem = GW_RECOMMENDATIONS.tank.name;
    else if (cls === 'Support')                      suggestedItem = GW_RECOMMENDATIONS.support.name;
    else                                             suggestedItem = GW_RECOMMENDATIONS.fighter.name;
  }

  return { enemyHealers, selfHasGW, allyGWCount, urgency, suggestedItem };
}
