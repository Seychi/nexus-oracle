import type { Player, CompAnalysis, ChampClass, TeamArchetype } from '../types';
import { getChampClass } from '../data/championClasses';
import { isEngageChamp, isPokeChamp } from '../data/engageChamps';
import { isHealingChamp } from '../data/healingChamps';
import { isSplitPusher } from '../data/splitpushChamps';

function classifyTeam(players: Player[]): Partial<Record<ChampClass, string[]>> {
  const map: Partial<Record<ChampClass, string[]>> = {};
  for (const p of players) {
    const cls = getChampClass(p.championName);
    if (!map[cls]) map[cls] = [];
    map[cls]!.push(p.championName);
  }
  return map;
}

function detectArchetype(players: Player[]): TeamArchetype {
  const engagers  = players.filter((p) => isEngageChamp(p.championName)).length;
  const pokers    = players.filter((p) => isPokeChamp(p.championName)).length;
  const enchanters = players.filter((p) => getChampClass(p.championName) === 'Enchanter').length;
  const marksmen  = players.filter((p) => getChampClass(p.championName) === 'Marksman').length;
  const spliters  = players.filter((p) => isSplitPusher(p.championName)).length;
  const assassins = players.filter((p) => getChampClass(p.championName) === 'Assassin').length;

  if (engagers >= 3)                         return 'Engage';
  if (pokers >= 3)                           return 'Poke';
  if (enchanters >= 2 && marksmen >= 1)      return 'Protect-the-carry';
  if (spliters >= 2)                         return 'Splitpush';
  if (assassins >= 3)                        return 'Pick';
  if (enchanters === 0 && engagers >= 1)     return 'Teamfight';
  return 'Balanced';
}

function engageAdvantage(
  allyEngagers: string[],
  enemyEngagers: string[]
): CompAnalysis['engageAdvantage'] {
  if (allyEngagers.length > enemyEngagers.length + 1) return 'ally';
  if (enemyEngagers.length > allyEngagers.length + 1)  return 'enemy';
  return 'even';
}

function matchupWarnings(allies: Player[], enemies: Player[]): string[] {
  const warnings: string[] = [];
  const allyClasses  = allies.map((p)  => getChampClass(p.championName));
  const enemyClasses = enemies.map((p) => getChampClass(p.championName));

  const allyTanks    = allyClasses.filter((c) => c === 'Tank').length;
  const enemyMages   = enemyClasses.filter((c) => c === 'Mage').length;
  const enemyAssassins = enemyClasses.filter((c) => c === 'Assassin').length;
  const allyEnchanters = allyClasses.filter((c) => c === 'Enchanter').length;
  const enemyMarksmen = enemyClasses.filter((c) => c === 'Marksman').length;

  if (enemyMages >= 3 && allyTanks === 0)
    warnings.push('Enemy has 3+ mages — build Magic Resist');
  if (enemyAssassins >= 2 && allyEnchanters === 0)
    warnings.push('Enemy has 2+ assassins — stay grouped, buy Zhonya\'s/GA');
  if (enemyMarksmen >= 2 && allyTanks === 0)
    warnings.push('No frontline — enemy ADCs will shred you; peel for your carries');
  if (allyEnchanters >= 2)
    warnings.push('You have a protect-the-carry comp — group around your ADC');

  return warnings;
}

export function analyzeComp(allies: Player[], enemies: Player[]): CompAnalysis {
  const allyEngagers  = allies.filter((p)  => isEngageChamp(p.championName)).map((p) => p.championName);
  const enemyEngagers = enemies.filter((p) => isEngageChamp(p.championName)).map((p) => p.championName);
  const enemyHealers  = enemies.filter((p) => isHealingChamp(p.championName)).map((p) => p.championName);

  return {
    enemyClasses:    classifyTeam(enemies),
    allyClasses:     classifyTeam(allies),
    enemyArchetype:  detectArchetype(enemies),
    allyArchetype:   detectArchetype(allies),
    engageAdvantage: engageAdvantage(allyEngagers, enemyEngagers),
    matchupWarnings: matchupWarnings(allies, enemies),
    enemyEngagers,
    allyEngagers,
    enemyHealers,
  };
}
