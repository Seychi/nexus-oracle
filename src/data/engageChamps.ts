// Champions with reliable hard engage (CC + gap close that initiates fights)
export const ENGAGE_CHAMPS = new Set([
  'malphite', 'amumu', 'leona', 'nautilus', 'alistar', 'rakan',
  'sejuani', 'jarvaniv', 'wukong', 'zac', 'vi', 'hecarim',
  'rammus', 'galio', 'rell', 'ornn', 'maokai', 'sion',
  'blitzcrank', 'thresh', 'braum', 'poppy', 'volibear',
  'diana', 'nocturne', 'jarvan', 'chogath',
]);

export function isEngageChamp(championName: string): boolean {
  return ENGAGE_CHAMPS.has(championName.toLowerCase().replace(/[\s'\-&.]/g, '').replace(/jarvaniv/, 'jarvaniv'));
}

// Champions with poke / long-range harass
export const POKE_CHAMPS = new Set([
  'jayce', 'ezreal', 'xerath', 'varus', 'lux', 'morgana',
  'ziggs', 'zoe', 'velkoz', 'caitlyn', 'missfortune',
  'karma', 'brand', 'anivia', 'taliyah', 'corki',
]);

export function isPokeChamp(championName: string): boolean {
  return POKE_CHAMPS.has(championName.toLowerCase().replace(/[\s'\-&.]/g, ''));
}
