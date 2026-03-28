import { Router, Request, Response } from 'express';
import { prisma } from '../lib/db.js';

const router = Router();

/* ---------- General overview stats ---------- */

router.get('/overview', async (req: Request, res: Response): Promise<void> => {
  try {
    const { patch, queue, role } = req.query;

    const where: Record<string, unknown> = {};
    if (patch) where.patch = String(patch);
    if (queue) where.queueId = Number(queue);
    if (role) where.teamPosition = String(role).toUpperCase();

    const [totalMatches, totalParticipants, aggregated, winCount] = await Promise.all([
      prisma.match.count({ where: patch || queue ? { ...(patch ? { patch: String(patch) } : {}), ...(queue ? { queueId: Number(queue) } : {}) } : {} }),
      prisma.participant.count({ where }),
      prisma.participant.aggregate({
        where,
        _avg: {
          kills: true,
          deaths: true,
          assists: true,
          totalDamageDealtToChampions: true,
          totalDamageTaken: true,
          goldEarned: true,
          totalMinionsKilled: true,
          neutralMinionsKilled: true,
          visionScore: true,
          wardsPlaced: true,
          wardsKilled: true,
          timePlayed: true,
        },
        _sum: {
          kills: true,
          deaths: true,
          assists: true,
        },
      }),
      prisma.participant.count({ where: { ...where, win: true } }),
    ]);

    const avgGameDuration = await prisma.match.aggregate({
      where: patch || queue ? { ...(patch ? { patch: String(patch) } : {}), ...(queue ? { queueId: Number(queue) } : {}) } : {},
      _avg: { gameDuration: true },
    });

    const uniquePlayers = await prisma.participant.groupBy({
      by: ['puuid'],
      where,
    });

    res.json({
      data: {
        totalMatches,
        totalParticipants,
        uniquePlayers: uniquePlayers.length,
        avgGameDuration: Math.round(avgGameDuration._avg.gameDuration || 0),
        winRate: totalParticipants > 0 ? Math.round((winCount / totalParticipants) * 10000) / 100 : 50,
        averages: {
          kills: Math.round((aggregated._avg.kills || 0) * 100) / 100,
          deaths: Math.round((aggregated._avg.deaths || 0) * 100) / 100,
          assists: Math.round((aggregated._avg.assists || 0) * 100) / 100,
          damage: Math.round(aggregated._avg.totalDamageDealtToChampions || 0),
          damageTaken: Math.round(aggregated._avg.totalDamageTaken || 0),
          gold: Math.round(aggregated._avg.goldEarned || 0),
          cs: Math.round(((aggregated._avg.totalMinionsKilled || 0) + (aggregated._avg.neutralMinionsKilled || 0)) * 10) / 10,
          vision: Math.round((aggregated._avg.visionScore || 0) * 10) / 10,
          wardsPlaced: Math.round((aggregated._avg.wardsPlaced || 0) * 10) / 10,
          wardsKilled: Math.round((aggregated._avg.wardsKilled || 0) * 10) / 10,
          gameDuration: Math.round(aggregated._avg.timePlayed || 0),
        },
        totals: {
          kills: aggregated._sum.kills || 0,
          deaths: aggregated._sum.deaths || 0,
          assists: aggregated._sum.assists || 0,
        },
      },
    });
  } catch (err) {
    const error = err as Error;
    console.error('[Stats] Overview error:', error.message);
    res.status(500).json({ error: 'Failed to fetch overview stats' });
  }
});

/* ---------- Champion stats for data studio ---------- */

router.get('/champions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, patch, queue, sort, order, limit } = req.query;
    const take = Math.min(Number(limit || 200), 200);

    const where: Record<string, unknown> = {};
    if (role && role !== 'all') where.teamPosition = String(role).toUpperCase();
    if (patch) where.patch = String(patch);
    if (queue) where.queueId = Number(queue);

    const champions = await prisma.participant.groupBy({
      by: ['championId', 'championName'],
      where,
      _count: { _all: true },
      _avg: {
        kills: true,
        deaths: true,
        assists: true,
        totalDamageDealtToChampions: true,
        totalDamageTaken: true,
        goldEarned: true,
        totalMinionsKilled: true,
        neutralMinionsKilled: true,
        visionScore: true,
        wardsPlaced: true,
        wardsKilled: true,
        timePlayed: true,
      },
      _sum: {
        kills: true,
        deaths: true,
        assists: true,
        totalDamageDealtToChampions: true,
        goldEarned: true,
      },
    });

    // Get win counts per champion
    const winCounts = await prisma.participant.groupBy({
      by: ['championId'],
      where: { ...where, win: true },
      _count: { _all: true },
    });
    const winMap = new Map(winCounts.map((w) => [w.championId, w._count._all]));

    // Total games for pick rate
    const totalGames = await prisma.participant.count({ where });

    const data = champions.map((c) => {
      const games = c._count._all;
      const wins = winMap.get(c.championId) || 0;
      const avgD = c._avg.deaths || 0;
      const avgK = c._avg.kills || 0;
      const avgA = c._avg.assists || 0;
      const kda = avgD > 0 ? (avgK + avgA) / avgD : avgK + avgA;

      return {
        championId: c.championId,
        championName: c.championName,
        games,
        wins,
        winRate: Math.round((wins / games) * 10000) / 100,
        pickRate: Math.round((games / (totalGames / 10)) * 10000) / 100, // per 10 participants per game
        kda: Math.round(kda * 100) / 100,
        avgKills: Math.round(avgK * 100) / 100,
        avgDeaths: Math.round(avgD * 100) / 100,
        avgAssists: Math.round(avgA * 100) / 100,
        avgDamage: Math.round(c._avg.totalDamageDealtToChampions || 0),
        avgDamageTaken: Math.round(c._avg.totalDamageTaken || 0),
        avgGold: Math.round(c._avg.goldEarned || 0),
        avgCs: Math.round(((c._avg.totalMinionsKilled || 0) + (c._avg.neutralMinionsKilled || 0)) * 10) / 10,
        avgVision: Math.round((c._avg.visionScore || 0) * 10) / 10,
        avgWardsPlaced: Math.round((c._avg.wardsPlaced || 0) * 10) / 10,
        avgWardsKilled: Math.round((c._avg.wardsKilled || 0) * 10) / 10,
        totalKills: c._sum.kills || 0,
        totalDeaths: c._sum.deaths || 0,
        totalAssists: c._sum.assists || 0,
        totalDamage: c._sum.totalDamageDealtToChampions || 0,
        totalGold: c._sum.goldEarned || 0,
      };
    });

    // Sort
    const sortField = String(sort || 'games');
    const sortOrder = String(order || 'desc');
    data.sort((a: any, b: any) => {
      const va = a[sortField] ?? 0;
      const vb = b[sortField] ?? 0;
      return sortOrder === 'asc' ? va - vb : vb - va;
    });

    res.json({ data: data.slice(0, take), total: data.length });
  } catch (err) {
    const error = err as Error;
    console.error('[Stats] Champions error:', error.message);
    res.status(500).json({ error: 'Failed to fetch champion stats' });
  }
});

/* ---------- Role-level stats ---------- */

router.get('/roles', async (req: Request, res: Response): Promise<void> => {
  try {
    const { patch, queue } = req.query;
    const where: Record<string, unknown> = {};
    if (patch) where.patch = String(patch);
    if (queue) where.queueId = Number(queue);

    const roles = await prisma.participant.groupBy({
      by: ['teamPosition'],
      where,
      _count: { _all: true },
      _avg: {
        kills: true,
        deaths: true,
        assists: true,
        totalDamageDealtToChampions: true,
        totalDamageTaken: true,
        goldEarned: true,
        totalMinionsKilled: true,
        neutralMinionsKilled: true,
        visionScore: true,
      },
    });

    const winCounts = await prisma.participant.groupBy({
      by: ['teamPosition'],
      where: { ...where, win: true },
      _count: { _all: true },
    });
    const winMap = new Map(winCounts.map((w) => [w.teamPosition, w._count._all]));

    const data = roles
      .filter((r) => r.teamPosition && r.teamPosition !== '')
      .map((r) => {
        const games = r._count._all;
        const wins = winMap.get(r.teamPosition) || 0;
        return {
          role: r.teamPosition,
          games,
          wins,
          winRate: Math.round((wins / games) * 10000) / 100,
          avgKills: Math.round((r._avg.kills || 0) * 100) / 100,
          avgDeaths: Math.round((r._avg.deaths || 0) * 100) / 100,
          avgAssists: Math.round((r._avg.assists || 0) * 100) / 100,
          avgDamage: Math.round(r._avg.totalDamageDealtToChampions || 0),
          avgDamageTaken: Math.round(r._avg.totalDamageTaken || 0),
          avgGold: Math.round(r._avg.goldEarned || 0),
          avgCs: Math.round(((r._avg.totalMinionsKilled || 0) + (r._avg.neutralMinionsKilled || 0)) * 10) / 10,
          avgVision: Math.round((r._avg.visionScore || 0) * 10) / 10,
        };
      });

    res.json({ data });
  } catch (err) {
    const error = err as Error;
    console.error('[Stats] Roles error:', error.message);
    res.status(500).json({ error: 'Failed to fetch role stats' });
  }
});

/* ---------- Item popularity and win rates ---------- */

router.get('/items', async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, patch, queue, limit } = req.query;
    const take = Math.min(Number(limit || 50), 100);

    const where: Record<string, unknown> = {};
    if (role) where.teamPosition = String(role).toUpperCase();
    if (patch) where.patch = String(patch);
    if (queue) where.queueId = Number(queue);

    // Get all participants with items
    const participants = await prisma.participant.findMany({
      where,
      select: { item0: true, item1: true, item2: true, item3: true, item4: true, item5: true, item6: true, win: true },
      take: 10000, // sample
    });

    // Count item appearances and wins
    const itemStats = new Map<number, { count: number; wins: number }>();
    for (const p of participants) {
      const items = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6];
      const seen = new Set<number>();
      for (const itemId of items) {
        if (itemId <= 0 || seen.has(itemId)) continue;
        seen.add(itemId);
        const entry = itemStats.get(itemId) || { count: 0, wins: 0 };
        entry.count++;
        if (p.win) entry.wins++;
        itemStats.set(itemId, entry);
      }
    }

    const totalGames = participants.length;
    const data = [...itemStats.entries()]
      .map(([itemId, stats]) => ({
        itemId,
        games: stats.count,
        wins: stats.wins,
        winRate: Math.round((stats.wins / stats.count) * 10000) / 100,
        pickRate: Math.round((stats.count / totalGames) * 10000) / 100,
      }))
      .filter((d) => d.games >= 10)
      .sort((a, b) => b.games - a.games)
      .slice(0, take);

    res.json({ data, totalGames });
  } catch (err) {
    const error = err as Error;
    console.error('[Stats] Items error:', error.message);
    res.status(500).json({ error: 'Failed to fetch item stats' });
  }
});

export default router;
