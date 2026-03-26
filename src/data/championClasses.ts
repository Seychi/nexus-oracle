import type { ChampClass } from '../types';

// Keys are normalised champion names (no spaces, no apostrophes, lowercase)
// Maps to primary class for the analysis engine
const CLASS_MAP: Record<string, ChampClass> = {
  // ── Tanks ──────────────────────────────────────────────────────────────────
  malphite: 'Tank', maokai: 'Tank', ornn: 'Tank', sion: 'Tank',
  chogath: 'Tank', amumu: 'Tank', sejuani: 'Tank', zac: 'Tank',
  rammus: 'Tank', ksante: 'Tank', tahmkench: 'Tank', blitzcrank: 'Tank',
  nunu: 'Tank', nunuwillump: 'Tank', ziliean: 'Tank',

  // ── Fighters ───────────────────────────────────────────────────────────────
  darius: 'Fighter', garen: 'Fighter', fiora: 'Fighter', jax: 'Fighter',
  renekton: 'Fighter', riven: 'Fighter', tryndamere: 'Fighter', olaf: 'Fighter',
  aatrox: 'Fighter', camille: 'Fighter', wukong: 'Fighter', trundle: 'Fighter',
  illaoi: 'Fighter', nasus: 'Fighter', yorick: 'Fighter', mordekaiser: 'Fighter',
  irelia: 'Fighter', sett: 'Fighter', urgot: 'Fighter', warwick: 'Fighter',
  vi: 'Fighter', kled: 'Fighter', xinzhao: 'Fighter', jarvaniv: 'Fighter',
  volibear: 'Fighter', hecarim: 'Fighter', pantheon: 'Fighter', poppy: 'Fighter',
  jayce: 'Fighter', gwen: 'Fighter', drmundo: 'Fighter',
  mundo: 'Fighter', gangplank: 'Fighter', udyr: 'Fighter', skarner: 'Fighter',
  monkeyking: 'Fighter', briar: 'Fighter', ambessa: 'Fighter',

  // ── Assassins ──────────────────────────────────────────────────────────────
  zed: 'Assassin', talon: 'Assassin', katarina: 'Assassin', akali: 'Assassin',
  leblanc: 'Assassin', ekko: 'Assassin', fizz: 'Assassin', kassadin: 'Assassin',
  khazix: 'Assassin', shaco: 'Assassin', qiyana: 'Assassin', evelynn: 'Assassin',
  nocturne: 'Assassin', nidalee: 'Assassin', diana: 'Assassin', elise: 'Assassin',
  rengar: 'Assassin', pyke: 'Assassin', naafiri: 'Assassin', kayn: 'Assassin',
  masteryi: 'Assassin', twitch: 'Assassin', yone: 'Assassin',

  // ── Mages ──────────────────────────────────────────────────────────────────
  lux: 'Mage', syndra: 'Mage', orianna: 'Mage', viktor: 'Mage',
  xerath: 'Mage', zoe: 'Mage', veigar: 'Mage', brand: 'Mage',
  annie: 'Mage', malzahar: 'Mage', azir: 'Mage', cassiopeia: 'Mage',
  velkoz: 'Mage', ryze: 'Mage', twistedfate: 'Mage', lissandra: 'Mage',
  anivia: 'Mage', taliyah: 'Mage', neeko: 'Mage', swain: 'Mage',
  vladimir: 'Mage', aurelionsol: 'Mage', vex: 'Mage', hwei: 'Mage',
  morgana: 'Mage', zyra: 'Mage', karma: 'Mage', zilean: 'Mage',
  heimerdinger: 'Mage', corki: 'Mage', galio: 'Mage', karthus: 'Mage',
  sylas: 'Mage', rumble: 'Mage', lillia: 'Mage', varus: 'Mage',

  // ── Marksmen ───────────────────────────────────────────────────────────────
  jinx: 'Marksman', caitlyn: 'Marksman', jhin: 'Marksman', ashe: 'Marksman',
  sivir: 'Marksman', missfortune: 'Marksman', tristana: 'Marksman', vayne: 'Marksman',
  draven: 'Marksman', kogmaw: 'Marksman', lucian: 'Marksman', ezreal: 'Marksman',
  xayah: 'Marksman', aphelios: 'Marksman', samira: 'Marksman', kalista: 'Marksman',
  quinn: 'Marksman', kindred: 'Marksman', zeri: 'Marksman', nilah: 'Marksman',
  smolder: 'Marksman', senna: 'Marksman',

  // ── Enchanters ─────────────────────────────────────────────────────────────
  lulu: 'Enchanter', janna: 'Enchanter', soraka: 'Enchanter', nami: 'Enchanter',
  yuumi: 'Enchanter', sona: 'Enchanter', renata: 'Enchanter', renataglasc: 'Enchanter',
  milio: 'Enchanter', seraphine: 'Enchanter',

  // ── Supports ───────────────────────────────────────────────────────────────
  thresh: 'Support', nautilus: 'Support', leona: 'Support', alistar: 'Support',
  braum: 'Support', rell: 'Support', rakan: 'Support', bard: 'Support',
  taric: 'Support', lux2: 'Support', // lux handled as mage above
};

function normalize(name: string): string {
  return name.toLowerCase().replace(/[\s'\-&.]/g, '').replace(/nunu.*/, 'nunu');
}

export function getChampClass(championName: string): ChampClass {
  return CLASS_MAP[normalize(championName)] ?? 'Unknown';
}

// Damage type by class
export function isDamageAP(cls: ChampClass): boolean {
  return cls === 'Mage' || cls === 'Enchanter';
}
export function isDamageAD(cls: ChampClass): boolean {
  return cls === 'Marksman' || cls === 'Assassin' || cls === 'Fighter' || cls === 'Tank' || cls === 'Support';
}
