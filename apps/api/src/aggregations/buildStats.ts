import { prisma } from '../lib/db.js';
import { redis } from '../lib/redis.js';

const BOOTS_IDS = [3006, 3009, 3020, 3047, 3111, 3117, 3158, 3005];

interface CoreBuildRow {
  items: string;
  games: bigint;
  wins: bigint;
}

interface BootsRow {
  boot_id: number;
  games: bigint;
  wins: bigint;
}

interface StarterRow {
  item0: number;
  games: bigint;
  wins: bigint;
}

interface RuneRow {
  primaryRune: number;
  secondaryRune: number;
  games: bigint;
  wins: bigint;
}

export async function aggregateBuildStats(championId: number, role: string): Promise<void> {
  const patch = process.env.TARGET_PATCH || '14.24';
  const queueId = Number(process.env.TARGET_QUEUE || 420);

  console.log(`[BuildStats] Aggregating builds for champion ${championId}, role ${role}`);

  const totalGamesResult = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) as count FROM "Participant"
     WHERE "championId" = $1 AND "teamPosition" = $2 AND "patch" = $3 AND "queueId" = $4`,
    championId,
    role,
    patch,
    queueId
  ) as [{ count: bigint }];
  const totalGames = Number(totalGamesResult[0]?.count || 0);

  if (totalGames === 0) {
    console.log(`[BuildStats] No games found for champion ${championId} ${role}, skipping`);
    return;
  }

  await prisma.buildStats.deleteMany({
    where: { championId, role, patch, queueId },
  });

  const bootsIdList = BOOTS_IDS.join(',');

  const coreBuilds = await prisma.$queryRawUnsafe(
    `WITH items_array AS (
      SELECT
        "matchId",
        "win",
        ARRAY(
          SELECT unnest
          FROM unnest(ARRAY["item0","item1","item2","item3","item4","item5"])
          WHERE unnest > 0
            AND unnest NOT IN (${bootsIdList})
          ORDER BY unnest
          LIMIT 3
        ) as core_items
      FROM "Participant"
      WHERE "championId" = $1
        AND "teamPosition" = $2
        AND "patch" = $3
        AND "queueId" = $4
    )
    SELECT
      array_to_string(core_items, ',') as items,
      COUNT(*) as games,
      SUM(CASE WHEN "win" = true THEN 1 ELSE 0 END) as wins
    FROM items_array
    WHERE array_length(core_items, 1) = 3
    GROUP BY core_items
    HAVING COUNT(*) >= 5
    ORDER BY COUNT(*) DESC
    LIMIT 10`,
    championId,
    role,
    patch,
    queueId
  ) as CoreBuildRow[];

  let rank = 1;
  for (const build of coreBuilds) {
    const games = Number(build.games);
    const wins = Number(build.wins);
    const items = build.items.split(',').map(Number);

    await prisma.buildStats.create({
      data: {
        championId,
        championName: '',
        role,
        patch,
        queueId,
        buildType: 'core',
        items,
        games,
        wins,
        winRate: Math.round((wins / games) * 10000) / 10000,
        pickRate: Math.round((games / totalGames) * 10000) / 10000,
        rank: rank++,
      },
    });
  }

  const boots = await prisma.$queryRawUnsafe(
    `SELECT
      item_id as boot_id,
      COUNT(*) as games,
      SUM(CASE WHEN "win" = true THEN 1 ELSE 0 END) as wins
    FROM "Participant",
    LATERAL (
      SELECT unnest(ARRAY["item0","item1","item2","item3","item4","item5","item6"]) as item_id
    ) items
    WHERE "championId" = $1
      AND "teamPosition" = $2
      AND "patch" = $3
      AND "queueId" = $4
      AND item_id IN (${bootsIdList})
    GROUP BY item_id
    HAVING COUNT(*) >= 5
    ORDER BY COUNT(*) DESC
    LIMIT 5`,
    championId,
    role,
    patch,
    queueId
  ) as BootsRow[];

  rank = 1;
  for (const boot of boots) {
    const games = Number(boot.games);
    const wins = Number(boot.wins);

    await prisma.buildStats.create({
      data: {
        championId,
        championName: '',
        role,
        patch,
        queueId,
        buildType: 'boots',
        items: [boot.boot_id],
        games,
        wins,
        winRate: Math.round((wins / games) * 10000) / 10000,
        pickRate: Math.round((games / totalGames) * 10000) / 10000,
        rank: rank++,
      },
    });
  }

  const starters = await prisma.$queryRawUnsafe(
    `SELECT
      "item0",
      COUNT(*) as games,
      SUM(CASE WHEN "win" = true THEN 1 ELSE 0 END) as wins
    FROM "Participant"
    WHERE "championId" = $1
      AND "teamPosition" = $2
      AND "patch" = $3
      AND "queueId" = $4
      AND "item0" > 0
    GROUP BY "item0"
    HAVING COUNT(*) >= 5
    ORDER BY COUNT(*) DESC
    LIMIT 5`,
    championId,
    role,
    patch,
    queueId
  ) as StarterRow[];

  rank = 1;
  for (const starter of starters) {
    const games = Number(starter.games);
    const wins = Number(starter.wins);

    await prisma.buildStats.create({
      data: {
        championId,
        championName: '',
        role,
        patch,
        queueId,
        buildType: 'starter',
        items: [starter.item0],
        games,
        wins,
        winRate: Math.round((wins / games) * 10000) / 10000,
        pickRate: Math.round((games / totalGames) * 10000) / 10000,
        rank: rank++,
      },
    });
  }

  const runes = await prisma.$queryRawUnsafe(
    `SELECT
      "primaryRune",
      "secondaryRune",
      COUNT(*) as games,
      SUM(CASE WHEN "win" = true THEN 1 ELSE 0 END) as wins
    FROM "Participant"
    WHERE "championId" = $1
      AND "teamPosition" = $2
      AND "patch" = $3
      AND "queueId" = $4
      AND "primaryRune" > 0
    GROUP BY "primaryRune", "secondaryRune"
    HAVING COUNT(*) >= 5
    ORDER BY COUNT(*) DESC
    LIMIT 5`,
    championId,
    role,
    patch,
    queueId
  ) as RuneRow[];

  rank = 1;
  for (const rune of runes) {
    const games = Number(rune.games);
    const wins = Number(rune.wins);

    await prisma.buildStats.create({
      data: {
        championId,
        championName: '',
        role,
        patch,
        queueId,
        buildType: 'runes',
        items: [rune.primaryRune, rune.secondaryRune],
        games,
        wins,
        winRate: Math.round((wins / games) * 10000) / 10000,
        pickRate: Math.round((games / totalGames) * 10000) / 10000,
        rank: rank++,
      },
    });
  }

  const allBuilds = await prisma.buildStats.findMany({
    where: { championId, role, patch, queueId },
    orderBy: { rank: 'asc' },
  });

  const cacheKey = `build-stats:${championId}:${role}:${patch}:${queueId}`;
  await redis.set(cacheKey, JSON.stringify(allBuilds), 'EX', 3600);

  console.log(`[BuildStats] Aggregation complete for champion ${championId} ${role}: ${allBuilds.length} builds`);
}
