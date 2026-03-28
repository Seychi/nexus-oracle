import { Router, Request, Response } from 'express';
import { prisma } from '../lib/db.js';

const router = Router();

/* ---------- Top players by aggregated stats ---------- */

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { metric, role, patch, queue, limit, offset } = req.query;

    const take = Math.min(Number(limit || 50), 100);
    const skip = Number(offset || 0);
    const sortMetric = String(metric || 'winrate');

    const where: Record<string, unknown> = {};
    if (role) where.teamPosition = String(role).toUpperCase();
    if (patch) where.patch = String(patch);
    if (queue) where.queueId = Number(queue);

    // Aggregate player stats (minimum 5 games to qualify)
    const players = await prisma.participant.groupBy({
      by: ['puuid', 'summonerName'],
      where,
      _count: { _all: true },
      _sum: { kills: true, deaths: true, assists: true, goldEarned: true, totalDamageDealtToChampions: true, visionScore: true, totalMinionsKilled: true, neutralMinionsKilled: true },
      _avg: { kills: true, deaths: true, assists: true, goldEarned: true, totalDamageDealtToChampions: true, visionScore: true },
      having: { puuid: { _count: { gte: 5 } } },
    });

    // Compute win counts
    const winCounts = await prisma.participant.groupBy({
      by: ['puuid'],
      where: { ...where, win: true },
      _count: { _all: true },
    });
    const winMap = new Map(winCounts.map((w) => [w.puuid, w._count._all]));

    // Build ranked list
    const ranked = players.map((p) => {
      const games = p._count._all;
      const wins = winMap.get(p.puuid) || 0;
      const winRate = games > 0 ? wins / games : 0;
      const avgKills = p._avg.kills || 0;
      const avgDeaths = p._avg.deaths || 0;
      const avgAssists = p._avg.assists || 0;
      const kda = avgDeaths > 0 ? (avgKills + avgAssists) / avgDeaths : avgKills + avgAssists;
      const avgDamage = p._avg.totalDamageDealtToChampions || 0;
      const avgGold = p._avg.goldEarned || 0;
      const avgVision = p._avg.visionScore || 0;
      const avgCs = ((p._sum.totalMinionsKilled || 0) + (p._sum.neutralMinionsKilled || 0)) / games;

      return {
        puuid: p.puuid,
        summonerName: p.summonerName,
        games,
        wins,
        losses: games - wins,
        winRate: Math.round(winRate * 10000) / 100,
        avgKills: Math.round(avgKills * 100) / 100,
        avgDeaths: Math.round(avgDeaths * 100) / 100,
        avgAssists: Math.round(avgAssists * 100) / 100,
        kda: Math.round(kda * 100) / 100,
        avgDamage: Math.round(avgDamage),
        avgGold: Math.round(avgGold),
        avgVision: Math.round(avgVision * 10) / 10,
        avgCs: Math.round(avgCs * 10) / 10,
        totalKills: p._sum.kills || 0,
        totalDeaths: p._sum.deaths || 0,
        totalAssists: p._sum.assists || 0,
      };
    });

    // Sort
    switch (sortMetric) {
      case 'kda':
        ranked.sort((a, b) => b.kda - a.kda);
        break;
      case 'damage':
        ranked.sort((a, b) => b.avgDamage - a.avgDamage);
        break;
      case 'gold':
        ranked.sort((a, b) => b.avgGold - a.avgGold);
        break;
      case 'vision':
        ranked.sort((a, b) => b.avgVision - a.avgVision);
        break;
      case 'cs':
        ranked.sort((a, b) => b.avgCs - a.avgCs);
        break;
      case 'games':
        ranked.sort((a, b) => b.games - a.games);
        break;
      case 'kills':
        ranked.sort((a, b) => b.avgKills - a.avgKills);
        break;
      case 'winrate':
      default:
        ranked.sort((a, b) => b.winRate - a.winRate || b.games - a.games);
        break;
    }

    const total = ranked.length;
    const page = ranked.slice(skip, skip + take);

    res.json({ data: page, total, limit: take, offset: skip, metric: sortMetric });
  } catch (err) {
    const error = err as Error;
    console.error('[Leaderboards] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch leaderboards' });
  }
});

/* ---------- Top champion mains (OTPs) ---------- */

router.get('/champions/:championId', async (req: Request, res: Response): Promise<void> => {
  try {
    const championId = Number(req.params.championId);
    const { role, limit } = req.query;
    const take = Math.min(Number(limit || 20), 50);

    const where: Record<string, unknown> = { championId };
    if (role) where.teamPosition = String(role).toUpperCase();

    const players = await prisma.participant.groupBy({
      by: ['puuid', 'summonerName'],
      where,
      _count: { _all: true },
      _avg: { kills: true, deaths: true, assists: true, totalDamageDealtToChampions: true, goldEarned: true },
      having: { puuid: { _count: { gte: 3 } } },
    });

    const winCounts = await prisma.participant.groupBy({
      by: ['puuid'],
      where: { ...where, win: true },
      _count: { _all: true },
    });
    const winMap = new Map(winCounts.map((w) => [w.puuid, w._count._all]));

    const ranked = players.map((p) => {
      const games = p._count._all;
      const wins = winMap.get(p.puuid) || 0;
      const avgD = p._avg.deaths || 0;
      const kda = avgD > 0 ? ((p._avg.kills || 0) + (p._avg.assists || 0)) / avgD : (p._avg.kills || 0) + (p._avg.assists || 0);
      return {
        puuid: p.puuid,
        summonerName: p.summonerName,
        games,
        wins,
        winRate: Math.round((wins / games) * 10000) / 100,
        kda: Math.round(kda * 100) / 100,
        avgKills: Math.round((p._avg.kills || 0) * 100) / 100,
        avgDeaths: Math.round((p._avg.deaths || 0) * 100) / 100,
        avgAssists: Math.round((p._avg.assists || 0) * 100) / 100,
        avgDamage: Math.round(p._avg.totalDamageDealtToChampions || 0),
      };
    });

    ranked.sort((a, b) => b.winRate - a.winRate || b.games - a.games);

    res.json({ data: ranked.slice(0, take), championId });
  } catch (err) {
    const error = err as Error;
    console.error('[Leaderboards] Champion leaderboard error:', error.message);
    res.status(500).json({ error: 'Failed to fetch champion leaderboard' });
  }
});

export default router;
