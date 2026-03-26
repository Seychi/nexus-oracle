import type { ChampionStats, Item, RecallAdvice } from '../types';

interface BuyOption { name: string; cost: number }

const AD_COMPONENTS: BuyOption[] = [
  { name: 'B.F. Sword', cost: 1300 },
  { name: 'Pickaxe', cost: 875 },
  { name: 'Long Sword', cost: 350 },
];

const AP_COMPONENTS: BuyOption[] = [
  { name: 'Needlessly Large Rod', cost: 1250 },
  { name: 'Blasting Wand', cost: 850 },
  { name: 'Amplifying Tome', cost: 435 },
];

const DEFENCE: BuyOption[] = [
  { name: 'Chain Vest', cost: 800 },
  { name: 'Null-Magic Mantle', cost: 450 },
  { name: 'Cloth Armor', cost: 300 },
];

export function adviseRecall(gold: number, selfStats: ChampionStats, items: Item[]): RecallAdvice {
  const isAP      = selfStats.ap > selfStats.ad + 20;
  const hasBoots  = items.some((i) => i.name.toLowerCase().includes('boots'));
  const pool      = isAP ? AP_COMPONENTS : AD_COMPONENTS;
  const canAfford: string[] = [];

  if (!hasBoots && gold >= 300) canAfford.push('Boots (300g)');

  for (const opt of pool) {
    if (gold >= opt.cost) { canAfford.push(`${opt.name} (${opt.cost}g)`); break; }
  }
  for (const opt of DEFENCE) {
    if (gold >= opt.cost) { canAfford.push(`${opt.name} (${opt.cost}g)`); break; }
  }

  // Control wards
  if (gold >= 75) canAfford.push('Control Ward (75g)');

  const bigBuy    = gold >= 875;
  const shouldBack = bigBuy;
  const reason     = bigBuy
    ? `${gold}g — good back timing, can buy a component`
    : `${gold}g — stay and farm ${875 - gold}g more if safe`;

  return { gold, canAfford: canAfford.slice(0, 4), shouldBack, reason };
}
