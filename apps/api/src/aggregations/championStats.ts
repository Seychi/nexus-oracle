import { prisma } from '../lib/db.js';
import { redis } from '../lib/redis.js';

interface RawChampionRow {
  championId: number;
  championName: string;
  teamPosition: string;
  games: bigint;
  wins: bigint;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgDamage: number;
  avgGold: number;
  avgCs: number;
}

function calculateTier(winRate: number, pickRate: number): string {
  if (winRate >= 0.535 && pickRate >= 0.05) return 'S+';
  if (winRate >= 0.52) return 'S';
  if (winRate >= 0.505) return 'A';
  if (winRate >= 0.49) return 'B';
  return 'C';
}

export async function aggregateChampionStats(): Promise<void> {
  const patch = process.env.TARGET_PATCH || '14.24';
  const queueId = Number(process.env.TARGET_QUEUE || 420);
  const rankFilter = 'all';

  console.log(`[Aggregator] Aggregating champion stats for patch ${patch}, queue ${queueId}`);

  const totalGamesResult = await prisma.$queryRawUnsafe(
    `SELECT COUNT(DISTINCT "matchId") as count FROM "Participant" WHERE "patch" = $1 AND "queueId" = $2`,
    patch,
    queueId
  ) as [{ count: bigint }];

  const totalGames = Number(totalGamesResult[0]?.count || 0);

  if (totalGames === 0) {
    console.log('[Aggregator] No games found for this patch/queue, skipping');
    return;
  }

  console.log(`[Aggregator] Total games in dataset: ${totalGames}`);

  const rows = await prisma.$queryRawUnsafe(
    `SELECT
      "championId",
      "championName",
      "teamPosition",
      COUNT(*) as games,
      SUM(CASE WHEN "win" = true THEN 1 ELSE 0 END) as wins,
      AVG("kills") as "avgKills",
      AVG("deaths") as "avgDeaths",
      AVG("assists") as "avgAssists",
      AVG("totalDamageDealtToChampions") as "avgDamage",
      AVG("goldEarned") as "avgGold",
      AVG("totalMinionsKilled" + "neutralMinionsKilled") as "avgCs"
    FROM "Participant"
    WHERE "patch" = $1
      AND "queueId" = $2
      AND "teamPosition" != ''
      AND "teamPosition" != 'UNKNOWN'
    GROUP BY "championId", "championName", "teamPosition"
    HAVING COUNT(*) >= 3
    ORDER BY COUNT(*) DESC`,
    patch,
    queueId
  ) as RawChampionRow[];

  console.log(`[Aggregator] Found ${rows.length} champion/role combinations`);

  const banRate = 0;

  for (const row of rows) {
    const games = Number(row.games);
    const wins = Number(row.wins);
    const winRate = games > 0 ? wins / games : 0;
    const pickRate = totalGames > 0 ? games / totalGames : 0;
    const tier = calculateTier(winRate, pickRate);

    await prisma.championStats.upsert({
      where: {
        championId_role_patch_queueId_rankFilter: {
          championId: row.championId,
          role: row.teamPosition,
          patch,
          queueId,
          rankFilter,
        },
      },
      update: {
        championName: row.championName,
        games,
        wins,
        winRate: Math.round(winRate * 10000) / 10000,
        pickRate: Math.round(pickRate * 10000) / 10000,
        banRate,
        avgKills: Math.round(row.avgKills * 100) / 100,
        avgDeaths: Math.round(row.avgDeaths * 100) / 100,
        avgAssists: Math.round(row.avgAssists * 100) / 100,
        avgDamage: Math.round(row.avgDamage),
        avgGold: Math.round(row.avgGold),
        avgCs: Math.round(row.avgCs * 10) / 10,
        tier,
      },
      create: {
        championId: row.championId,
        championName: row.championName,
        role: row.teamPosition,
        patch,
        queueId,
        rankFilter,
        games,
        wins,
        winRate: Math.round(winRate * 10000) / 10000,
        pickRate: Math.round(pickRate * 10000) / 10000,
        banRate,
        avgKills: Math.round(row.avgKills * 100) / 100,
        avgDeaths: Math.round(row.avgDeaths * 100) / 100,
        avgAssists: Math.round(row.avgAssists * 100) / 100,
        avgDamage: Math.round(row.avgDamage),
        avgGold: Math.round(row.avgGold),
        avgCs: Math.round(row.avgCs * 10) / 10,
        tier,
      },
    });
  }

  const allStats = await prisma.championStats.findMany({
    where: { patch, queueId, rankFilter },
    orderBy: { winRate: 'desc' },
  });

  const cacheKey = `champion-stats:${patch}:${queueId}:${rankFilter}`;
  await redis.set(cacheKey, JSON.stringify(allStats), 'EX', 3600);

  const roleGroups = new Map<string, typeof allStats>();
  for (const stat of allStats) {
    const existing = roleGroups.get(stat.role) || [];
    existing.push(stat);
    roleGroups.set(stat.role, existing);
  }

  for (const [role, stats] of roleGroups) {
    const roleCacheKey = `champion-stats:${patch}:${queueId}:${rankFilter}:${role}`;
    await redis.set(roleCacheKey, JSON.stringify(stats), 'EX', 3600);
  }

  console.log(`[Aggregator] Champion stats aggregation complete. Processed ${rows.length} entries.`);
}
