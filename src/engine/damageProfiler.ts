import type { Player, DamageProfile, DamageType } from '../types';
import { getChampClass } from '../data/championClasses';

// Items that switch a champ's damage type
const AP_ITEM_NAMES = ['Luden\'s', 'Shadowflame', 'Rabadon', 'Void Staff', 'Zhonya', 'Rylai', 'Liandry', 'Nashor', 'Riftmaker'];
const AD_ITEM_NAMES = ['Infinity Edge', 'Trinity Force', 'Eclipse', 'Duskblade', 'Youmuu', 'Black Cleaver', 'Stridebreaker'];

function hasAPItems(p: Player): boolean {
  return p.items.some((i) => AP_ITEM_NAMES.some((n) => i.name.includes(n)));
}
function hasADItems(p: Player): boolean {
  return p.items.some((i) => AD_ITEM_NAMES.some((n) => i.name.includes(n)));
}

function getDamageType(p: Player): DamageType {
  const cls = getChampClass(p.championName);
  const apItems = hasAPItems(p);
  const adItems = hasADItems(p);

  if (cls === 'Mage' || cls === 'Enchanter') return 'AP';
  if (cls === 'Marksman') return 'AD';
  // Fighters/supports can go either way
  if (apItems && !adItems) return 'AP';
  if (adItems && !apItems) return 'AD';
  if (apItems && adItems)  return 'Mixed';
  // Default by class
  if (cls === 'Assassin' || cls === 'Fighter' || cls === 'Tank') return 'AD';
  return 'Mixed';
}

export function profileDamage(enemies: Player[]): DamageProfile {
  const adChamps: string[] = [];
  const apChamps: string[] = [];
  const mixedChamps: string[] = [];

  for (const p of enemies) {
    const type = getDamageType(p);
    if (type === 'AD')    adChamps.push(p.championName);
    else if (type === 'AP') apChamps.push(p.championName);
    else                   mixedChamps.push(p.championName);
  }

  const total = enemies.length || 1;
  const adPercent    = Math.round((adChamps.length    / total) * 100);
  const apPercent    = Math.round((apChamps.length    / total) * 100);
  const mixedPercent = Math.round((mixedChamps.length / total) * 100);

  const primaryType: DamageType = adPercent >= apPercent && adPercent >= mixedPercent ? 'AD'
    : apPercent >= adPercent && apPercent >= mixedPercent ? 'AP' : 'Mixed';

  return { adPercent, apPercent, mixedPercent, primaryType, adChamps, apChamps };
}
