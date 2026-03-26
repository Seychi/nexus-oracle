import type { RawLiveData, NormalisedGame, Player, ChampionStats, Ability, Team } from '../types';

function ddKey(raw: string): string {
  if (!raw) return '';
  return raw.split('_').pop() ?? '';
}

function normalisePlayer(
  p: RawLiveData['allPlayers'][0],
  selfName: string
): Player {
  return {
    summonerName: p.summonerName,
    championName: p.championName,
    ddKey:        ddKey(p.rawChampionName),
    team:         (p.team === 'ORDER' ? 'ORDER' : 'CHAOS') as Team,
    level:        p.level,
    isDead:       p.isDead,
    respawnTimer: p.respawnTimer ?? 0,
    items:        (p.items ?? []).sort((a, b) => a.slot - b.slot).map((i) => ({
      id: i.itemID, name: i.displayName, slot: i.slot,
    })),
    keystone:     p.runes?.keystone?.displayName     ?? '—',
    primaryTree:  p.runes?.primaryRuneTree?.displayName  ?? '—',
    secondaryTree: p.runes?.secondaryRuneTree?.displayName ?? '—',
    kills:        p.scores?.kills   ?? 0,
    deaths:       p.scores?.deaths  ?? 0,
    assists:      p.scores?.assists ?? 0,
    cs:           p.scores?.creepScore ?? 0,
    wardScore:    p.scores?.wardScore  ?? 0,
    summonerSpells: [
      p.summonerSpells?.summonerSpellOne?.displayName ?? '—',
      p.summonerSpells?.summonerSpellTwo?.displayName ?? '—',
    ],
    position: p.position ?? '',
    isSelf:   p.summonerName === selfName,
  };
}

function normaliseStats(raw: Record<string, number>): ChampionStats {
  return {
    ad:             Math.round(raw.attackDamage         ?? 0),
    ap:             Math.round(raw.abilityPower         ?? 0),
    armor:          Math.round(raw.armor               ?? 0),
    mr:             Math.round(raw.magicResist          ?? 0),
    abilityHaste:   Math.round(raw.abilityHaste         ?? 0),
    crit:           Math.round((raw.critChance          ?? 0) * 100),
    attackSpeed:    +((raw.attackSpeed                  ?? 0).toFixed(2)),
    moveSpeed:      Math.round(raw.moveSpeed            ?? 0),
    currentHp:      Math.round(raw.currentHealth        ?? 0),
    maxHp:          Math.round(raw.maxHealth            ?? 0),
    currentMana:    Math.round(raw.resourceValue        ?? 0),
    maxMana:        Math.round(raw.resourceMax          ?? 0),
    lifeSteal:      Math.round((raw.lifeSteal           ?? 0) * 100),
    lethality:      Math.round(raw.physicalLethality    ?? 0),
    magicPen:       Math.round(raw.magicPenetrationFlat ?? 0),
    magicPenPercent:Math.round((raw.bonusMagicPenetrationPercent ?? 0) * 100),
    armorPenPercent:Math.round((raw.bonusArmorPenetrationPercent ?? 0) * 100),
    tenacity:       Math.round((raw.tenacity            ?? 0) * 100),
    omnivamp:       Math.round((raw.omnivamp            ?? 0) * 100),
  };
}

export function normaliseGame(raw: RawLiveData): NormalisedGame {
  const { activePlayer, allPlayers, events, gameData } = raw;
  const selfName = activePlayer.summonerName;

  const self = allPlayers.find((p) => p.summonerName === selfName) ?? allPlayers[0];
  const selfTeam: Team = (self?.team === 'ORDER' ? 'ORDER' : 'CHAOS');

  const players    = allPlayers.map((p) => normalisePlayer(p, selfName));
  const allies     = players.filter((p) => p.team === selfTeam);
  const enemies    = players.filter((p) => p.team !== selfTeam);

  const selfAbilities: Ability[] = (['Q','W','E','R'] as const).map((key) => ({
    key,
    name:  activePlayer.abilities?.[key]?.displayName  ?? key,
    level: activePlayer.abilities?.[key]?.abilityLevel ?? 0,
  }));

  return {
    gameTime:   gameData?.gameTime   ?? 0,
    gameMode:   gameData?.gameMode   ?? 'CLASSIC',
    mapTerrain: gameData?.mapTerrain ?? 'Default',
    selfTeam,
    allies,
    enemies,
    selfStats:      normaliseStats(activePlayer.championStats ?? {}),
    selfAbilities,
    gold:           Math.round(activePlayer.currentGold ?? 0),
    events:         events?.Events ?? [],
  };
}
