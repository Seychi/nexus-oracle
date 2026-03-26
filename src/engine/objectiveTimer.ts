import type { GameEvent, ObjectiveStatus, Player, BuffStatus } from '../types';

// League respawn timers
const DRAGON_FIRST_SPAWN  = 5 * 60;
const DRAGON_RESPAWN      = 5 * 60;
const BARON_FIRST_SPAWN   = 20 * 60;
const BARON_RESPAWN       = 6 * 60;
const HERALD_FIRST_SPAWN  = 8 * 60;
const BARON_BUFF_DURATION = 180; // 3 minutes
const ELDER_BUFF_DURATION = 150; // 2.5 minutes

function isAllyKiller(killerName: string | undefined, allies: Player[]): boolean {
  if (!killerName) return false;
  const lower = killerName.toLowerCase();
  return allies.some((p) =>
    p.summonerName.toLowerCase() === lower ||
    p.championName.toLowerCase() === lower
  );
}

function getSoulType(types: string[]): string | null {
  const nonElder = types.filter((t) => t !== 'Elder');
  const counts: Record<string, number> = {};
  for (const t of nonElder) counts[t] = (counts[t] ?? 0) + 1;
  for (const [type, count] of Object.entries(counts)) {
    if (count >= 3) return type;
  }
  return null;
}

export function computeObjectives(
  events: GameEvent[], gameTime: number, allies: Player[], enemies: Player[],
): ObjectiveStatus {
  const dragonKills: GameEvent[] = [];
  const baronKills:  GameEvent[] = [];
  const heraldKills: GameEvent[] = [];

  for (const e of events) {
    if (e.EventName === 'DragonKill')  dragonKills.push(e);
    if (e.EventName === 'BaronKill')   baronKills.push(e);
    if (e.EventName === 'HeraldKill')  heraldKills.push(e);
  }

  // Dragon
  const lastDragon    = dragonKills[dragonKills.length - 1];
  const dragonAlive   = !lastDragon || (gameTime - lastDragon.EventTime) >= DRAGON_RESPAWN;
  const dragonSpawn   = dragonKills.length === 0
    ? DRAGON_FIRST_SPAWN
    : lastDragon.EventTime + DRAGON_RESPAWN;
  const dragonTypes   = dragonKills.map((e) => e.DragonType ?? 'Elder').filter(Boolean);

  // Per-team dragon tracking
  const allyDrakeTypes: string[] = [];
  const enemyDrakeTypes: string[] = [];
  for (const e of dragonKills) {
    const type = e.DragonType ?? 'Elder';
    if (isAllyKiller(e.KillerName, allies)) {
      allyDrakeTypes.push(type);
    } else {
      enemyDrakeTypes.push(type);
    }
  }

  // Baron
  const lastBaron     = baronKills[baronKills.length - 1];
  const baronAlive    = !lastBaron || (gameTime - lastBaron.EventTime) >= BARON_RESPAWN;
  const baronSpawn    = baronKills.length === 0
    ? BARON_FIRST_SPAWN
    : lastBaron.EventTime + BARON_RESPAWN;
  const baronAvailable = gameTime >= BARON_FIRST_SPAWN;

  // Herald (spawns at 8min, dies once used, can respawn once at ~13min30s)
  const heraldKilled  = heraldKills.length > 0;
  const heraldAvailable = gameTime >= HERALD_FIRST_SPAWN && gameTime < 20 * 60;

  return {
    dragon: {
      killCount:      dragonKills.length,
      types:          dragonTypes,
      nextSpawnTime:  dragonAlive ? null : dragonSpawn,
      isAlive:        dragonAlive,
      allySoulCount:  allyDrakeTypes.length,
      enemySoulCount: enemyDrakeTypes.length,
      allyDrakeTypes,
      enemyDrakeTypes,
      allySoulType:   getSoulType(allyDrakeTypes),
      enemySoulType:  getSoulType(enemyDrakeTypes),
      enemyAtSoul:    enemyDrakeTypes.filter((t) => t !== 'Elder').length >= 3,
    },
    baron: {
      killCount:     baronKills.length,
      nextSpawnTime: baronAvailable ? (baronAlive ? null : baronSpawn) : BARON_FIRST_SPAWN,
      isAlive:       baronAvailable && baronAlive,
    },
    herald: {
      killed:        heraldKilled,
      nextSpawnTime: heraldAvailable ? null : null,
      isAlive:       heraldAvailable && !heraldKilled,
    },
  };
}

export function computeBuffs(
  events: GameEvent[], gameTime: number, allies: Player[],
): BuffStatus {
  let baronBuff: BuffStatus['baronBuff'] = null;
  let elderBuff: BuffStatus['elderBuff'] = null;

  for (const e of events) {
    if (e.EventName === 'BaronKill' && isAllyKiller(e.KillerName, allies)) {
      const remaining = (e.EventTime + BARON_BUFF_DURATION) - gameTime;
      if (remaining > 0) baronBuff = { remaining };
    }
    if (e.EventName === 'DragonKill' && (e.DragonType === 'Elder') && isAllyKiller(e.KillerName, allies)) {
      const remaining = (e.EventTime + ELDER_BUFF_DURATION) - gameTime;
      if (remaining > 0) elderBuff = { remaining };
    }
  }
  return { baronBuff, elderBuff };
}

export function formatTimer(spawnTime: number, currentTime: number): string {
  const remaining = Math.max(0, spawnTime - currentTime);
  if (remaining === 0) return 'UP NOW';
  const m = Math.floor(remaining / 60);
  const s = Math.floor(remaining % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
