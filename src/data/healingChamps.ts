// Champions with significant sustain/healing that warrant Grievous Wounds
// Keyed by normalised champion name
export const HEALING_CHAMPS = new Set([
  'aatrox',        // passive healing scales with missing HP
  'drmundo',       // mundo — R gives massive regen
  'warwick',       // Q + passive lifesteal
  'soraka',        // Q + W heals
  'nami',          // W single target heal
  'sona',          // W aura heals
  'seraphine',     // W aura heal
  'yuumi',         // W/E attached healing
  'vladimir',      // Q + W pool sustain
  'swain',         // W + R drain
  'sylas',         // E lifedrain
  'kayn',          // rhaast form Q drain
  'viego',         // passive: possessing heals to partial HP
  'sett',          // no direct heal but shield
  'olaf',          // passive AS grants lifesteal
  'tahm kench',    // passive
  'tahmkench',
  'shen',          // Q drain (ki burst)
  'gwen',          // Q drain
  'renekton',      // W heals when hitting multiple
  'irelia',        // passive lifesteal stacks
  'fiora',         // W vital heals
  'samira',        // passive heals on style S
  'nilah',         // passive amplifies heals
]);

export function isHealingChamp(championName: string): boolean {
  const key = championName.toLowerCase().replace(/[\s'\-&.]/g, '');
  return HEALING_CHAMPS.has(key);
}

export function countHealers(championNames: string[]): number {
  return championNames.filter(isHealingChamp).length;
}
