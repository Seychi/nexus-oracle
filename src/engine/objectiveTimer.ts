import type { GameEvent, ObjectiveStatus } from '../types';

// League respawn timers
const DRAGON_FIRST_SPAWN  = 5 * 60;
const DRAGON_RESPAWN      = 5 * 60;
const BARON_FIRST_SPAWN   = 20 * 60;
const BARON_RESPAWN       = 6 * 60;
const HERALD_FIRST_SPAWN  = 8 * 60;
const HERALD_RESPAWN      = 0; // only spawns twice total

export function computeObjectives(events: GameEvent[], gameTime: number): ObjectiveStatus {
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
      killCount:     dragonKills.length,
      types:         dragonTypes,
      nextSpawnTime: dragonAlive ? null : dragonSpawn,
      isAlive:       dragonAlive,
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

export function formatTimer(spawnTime: number, currentTime: number): string {
  const remaining = Math.max(0, spawnTime - currentTime);
  if (remaining === 0) return 'UP NOW';
  const m = Math.floor(remaining / 60);
  const s = Math.floor(remaining % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
