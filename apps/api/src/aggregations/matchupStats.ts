import { prisma } from '../lib/db.js';
import { redis } from '../lib/redis.js';

interface RawMatchupRow {
  opponentId: number;
  opponentName: string;
  games: bigint;
  wins: bigint;
  avgGoldDiff: number;
  avgCsDiff: number;
}

export async function aggregateMatchups(championId: number, role: string): Promise<void> {
  const patch = process.env.TARGET_PATCH || '14.24';
  const queueId = Number(process.env.TARGET_QUEUE || 420);

  console.log(`[MatchupStats] Aggregating matchups for champion ${championId}, role ${role}`);

  const rows = await prisma.$queryRawUnsafe(
    `SELECT
      opp."championId" as "opponentId",
      opp."championName" as "opponentName",
      COUNT(*) as games,
      SUM(CASE WHEN p."win" = true THEN 1 ELSE 0 END) as wins,
      AVG(p."goldEarned" - opp."goldEarned") as "avgGoldDiff",
      AVG(
        (p."totalMinionsKilled" + p."neutralMinionsKilled")
        - (opp."totalMinionsKilled" + opp."neutralMinionsKilled")
      ) as "avgCsDiff"
    FROM "Participant" p
    INNER JOIN "Participant" opp
      ON p."matchId" = opp."matchId"
      AND p."teamPosition" = opp."teamPosition"
      AND p."puuid" != opp."puuid"
      AND p."win" != opp."win"
    WHERE p."championId" = $1
      AND p."teamPosition" = $2
      AND p."patch" = $3
      AND p."queueId" = $4
    GROUP BY opp."championId", opp."championName"
    HAVING COUNT(*) >= 3
    ORDER BY COUNT(*) DESC`,
    championId,
    role,
    patch,
    queueId
  ) as RawMatchupRow[];

  console.log(`[MatchupStats] Found ${rows.length} matchups for champion ${championId} ${role}`);

  for (const row of rows) {
    const games = Number(row.games);
    const wins = Number(row.wins);
    const winRate = games > 0 ? wins / games : 0;

    await prisma.matchupStats.upsert({
      where: {
        championId_opponentId_role_patch_queueId: {
          championId,
          opponentId: row.opponentId,
          role,
          patch,
          queueId,
        },
      },
      update: {
        games,
        wins,
        winRate: Math.round(winRate * 10000) / 10000,
        avgGoldDiff15: Math.round(row.avgGoldDiff),
        avgCsDiff15: Math.round(row.avgCsDiff * 10) / 10,
      },
      create: {
        championId,
        opponentId: row.opponentId,
        role,
        patch,
        queueId,
        games,
        wins,
        winRate: Math.round(winRate * 10000) / 10000,
        avgGoldDiff15: Math.round(row.avgGoldDiff),
        avgCsDiff15: Math.round(row.avgCsDiff * 10) / 10,
      },
    });
  }

  const allMatchups = await prisma.matchupStats.findMany({
    where: { championId, role, patch, queueId },
    orderBy: { winRate: 'desc' },
  });

  const cacheKey = `matchup-stats:${championId}:${role}:${patch}:${queueId}`;
  await redis.set(cacheKey, JSON.stringify(allMatchups), 'EX', 3600);

  console.log(`[MatchupStats] Aggregation complete for champion ${championId} ${role}: ${allMatchups.length} matchups`);
}
