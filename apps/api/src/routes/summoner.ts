import { Router, Request, Response } from 'express';
import { prisma } from '../lib/db.js';
import { riotClient } from '../lib/riotClient.js';

const router = Router();

router.get('/by-name/:gameName/:tagLine', async (req: Request, res: Response): Promise<void> => {
  try {
    const { gameName, tagLine } = req.params;

    if (!gameName || !tagLine) {
      res.status(400).json({ error: 'gameName and tagLine are required' });
      return;
    }

    const account = await riotClient.getAccountByRiotId(gameName, tagLine);
    const summoner = await riotClient.getSummonerByPuuid(account.puuid);
    const leagueEntries = await riotClient.getLeagueEntries(account.puuid);

    const rankedSolo = leagueEntries.find((e) => e.queueType === 'RANKED_SOLO_5x5');
    const rankedFlex = leagueEntries.find((e) => e.queueType === 'RANKED_FLEX_SR');

    const profile = {
      puuid: account.puuid,
      gameName: account.gameName,
      tagLine: account.tagLine,
      summonerLevel: summoner.summonerLevel,
      profileIconId: summoner.profileIconId,
      rankedSolo: rankedSolo
        ? {
            tier: rankedSolo.tier,
            rank: rankedSolo.rank,
            leaguePoints: rankedSolo.leaguePoints,
            wins: rankedSolo.wins,
            losses: rankedSolo.losses,
            winRate: Math.round((rankedSolo.wins / (rankedSolo.wins + rankedSolo.losses)) * 10000) / 10000,
            hotStreak: rankedSolo.hotStreak,
            veteran: rankedSolo.veteran,
          }
        : null,
      rankedFlex: rankedFlex
        ? {
            tier: rankedFlex.tier,
            rank: rankedFlex.rank,
            leaguePoints: rankedFlex.leaguePoints,
            wins: rankedFlex.wins,
            losses: rankedFlex.losses,
            winRate: Math.round((rankedFlex.wins / (rankedFlex.wins + rankedFlex.losses)) * 10000) / 10000,
          }
        : null,
    };

    res.json({ data: profile });
  } catch (err) {
    const error = err as Error & { status?: number };
    if (error.status === 404) {
      res.status(404).json({ error: 'Summoner not found' });
      return;
    }
    console.error('[Summoner] Error fetching profile:', error.message);
    res.status(500).json({ error: 'Failed to fetch summoner profile' });
  }
});

router.get('/:puuid/matches', async (req: Request, res: Response): Promise<void> => {
  try {
    const { puuid } = req.params;
    const { limit, offset } = req.query;

    if (!puuid) {
      res.status(400).json({ error: 'puuid is required' });
      return;
    }

    const take = Math.min(Number(limit || 20), 50);
    const skip = Number(offset || 0);

    const participants = await prisma.participant.findMany({
      where: { puuid },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        match: {
          select: {
            id: true,
            patch: true,
            gameDuration: true,
            gameStartTimestamp: true,
            queueId: true,
          },
        },
      },
    });

    const matches = participants.map((p: typeof participants[number]) => ({
      matchId: p.match.id,
      patch: p.match.patch,
      gameDuration: p.match.gameDuration,
      gameStartTimestamp: p.match.gameStartTimestamp.toString(),
      queueId: p.match.queueId,
      championId: p.championId,
      championName: p.championName,
      teamPosition: p.teamPosition,
      win: p.win,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      totalDamageDealtToChampions: p.totalDamageDealtToChampions,
      goldEarned: p.goldEarned,
      totalMinionsKilled: p.totalMinionsKilled,
      neutralMinionsKilled: p.neutralMinionsKilled,
      visionScore: p.visionScore,
      items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6],
      primaryRune: p.primaryRune,
      secondaryRune: p.secondaryRune,
      summoner1Id: p.summoner1Id,
      summoner2Id: p.summoner2Id,
    }));

    const totalCount = await prisma.participant.count({
      where: { puuid },
    });

    res.json({
      data: matches,
      total: totalCount,
      limit: take,
      offset: skip,
    });
  } catch (err) {
    const error = err as Error;
    console.error('[Summoner] Error fetching matches:', error.message);
    res.status(500).json({ error: 'Failed to fetch match history' });
  }
});

router.get('/:puuid/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const { puuid } = req.params;
    const { patch, queue } = req.query;

    if (!puuid) {
      res.status(400).json({ error: 'puuid is required' });
      return;
    }

    const where: Record<string, unknown> = { puuid };

    if (patch) {
      where.patch = String(patch);
    }
    if (queue) {
      where.queueId = Number(queue);
    }

    const totalGames = await prisma.participant.count({ where });

    if (totalGames === 0) {
      res.json({
        data: {
          puuid,
          totalGames: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          avgKills: 0,
          avgDeaths: 0,
          avgAssists: 0,
          avgCs: 0,
          avgDamage: 0,
          avgGold: 0,
          avgVisionScore: 0,
          mostPlayedChampions: [],
          roleDistribution: [],
        },
      });
      return;
    }

    const aggregated = await prisma.participant.aggregate({
      where,
      _count: { win: true },
      _sum: { kills: true, deaths: true, assists: true },
      _avg: {
        kills: true,
        deaths: true,
        assists: true,
        totalDamageDealtToChampions: true,
        goldEarned: true,
        totalMinionsKilled: true,
        neutralMinionsKilled: true,
        visionScore: true,
      },
    });

    const winsCount = await prisma.participant.count({
      where: { ...where, win: true },
    });

    const mostPlayed = await prisma.participant.groupBy({
      by: ['championId', 'championName'],
      where,
      _count: { _all: true },
      orderBy: { _count: { championId: 'desc' } },
      take: 10,
    });

    const mostPlayedWithWins = await Promise.all(
      mostPlayed.map(async (champ: typeof mostPlayed[number]) => {
        const champWins = await prisma.participant.count({
          where: { ...where, championId: champ.championId, win: true },
        });
        return {
          championId: champ.championId,
          championName: champ.championName,
          games: champ._count._all,
          wins: champWins,
          winRate: champ._count._all > 0
            ? Math.round((champWins / champ._count._all) * 10000) / 10000
            : 0,
        };
      })
    );

    const roleDistribution = await prisma.participant.groupBy({
      by: ['teamPosition'],
      where,
      _count: { _all: true },
      orderBy: { _count: { teamPosition: 'desc' } },
    });

    const avgCs =
      (aggregated._avg.totalMinionsKilled || 0) +
      (aggregated._avg.neutralMinionsKilled || 0);

    const response = {
      puuid,
      totalGames,
      wins: winsCount,
      losses: totalGames - winsCount,
      winRate: Math.round((winsCount / totalGames) * 10000) / 10000,
      avgKills: Math.round((aggregated._avg.kills || 0) * 100) / 100,
      avgDeaths: Math.round((aggregated._avg.deaths || 0) * 100) / 100,
      avgAssists: Math.round((aggregated._avg.assists || 0) * 100) / 100,
      avgCs: Math.round(avgCs * 10) / 10,
      avgDamage: Math.round(aggregated._avg.totalDamageDealtToChampions || 0),
      avgGold: Math.round(aggregated._avg.goldEarned || 0),
      avgVisionScore: Math.round((aggregated._avg.visionScore || 0) * 10) / 10,
      mostPlayedChampions: mostPlayedWithWins,
      roleDistribution: roleDistribution.map((r: typeof roleDistribution[number]) => ({
        role: r.teamPosition,
        games: r._count._all,
        percentage: Math.round((r._count._all / totalGames) * 10000) / 10000,
      })),
    };

    res.json({ data: response });
  } catch (err) {
    const error = err as Error;
    console.error('[Summoner] Error fetching stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch summoner stats' });
  }
});

export default router;
