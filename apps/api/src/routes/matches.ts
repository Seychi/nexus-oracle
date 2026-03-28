import { Router, Request, Response } from 'express';
import { prisma } from '../lib/db.js';

const router = Router();

/* ---------- List all matches ---------- */

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit, offset, champion, role, queue, patch, sort } = req.query;

    const take = Math.min(Number(limit || 20), 50);
    const skip = Number(offset || 0);

    const where: Record<string, unknown> = {};

    if (patch) where.patch = String(patch);
    if (queue) where.queueId = Number(queue);

    // If filtering by champion or role, filter via participants
    const participantWhere: Record<string, unknown> = {};
    if (champion) participantWhere.championName = { contains: String(champion), mode: 'insensitive' };
    if (role) participantWhere.teamPosition = String(role).toUpperCase();

    const hasParticipantFilter = Object.keys(participantWhere).length > 0;

    // If we have participant filters, find matching match IDs first
    let matchIdFilter: string[] | undefined;
    if (hasParticipantFilter) {
      const matchingParticipants = await prisma.participant.findMany({
        where: participantWhere,
        select: { matchId: true },
        distinct: ['matchId'],
        take: take + skip + 50, // fetch a bit extra to account for pagination
      });
      matchIdFilter = matchingParticipants.map((p) => p.matchId);
      if (matchIdFilter.length === 0) {
        res.json({ data: [], total: 0, limit: take, offset: skip });
        return;
      }
      where.id = { in: matchIdFilter };
    }

    const orderBy = sort === 'duration'
      ? { gameDuration: 'desc' as const }
      : { gameStartTimestamp: 'desc' as const };

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        orderBy,
        take,
        skip,
        select: {
          id: true,
          queueId: true,
          patch: true,
          gameDuration: true,
          gameStartTimestamp: true,
          participants: {
            select: {
              summonerName: true,
              championId: true,
              championName: true,
              teamPosition: true,
              win: true,
              kills: true,
              deaths: true,
              assists: true,
              totalDamageDealtToChampions: true,
              goldEarned: true,
              totalMinionsKilled: true,
              neutralMinionsKilled: true,
              visionScore: true,
              item0: true,
              item1: true,
              item2: true,
              item3: true,
              item4: true,
              item5: true,
              item6: true,
              primaryRune: true,
              summoner1Id: true,
              summoner2Id: true,
            },
          },
        },
      }),
      prisma.match.count({ where }),
    ]);

    const data = matches.map((m) => {
      // Split participants into two teams based on win status
      const winners = m.participants.filter((p) => p.win);
      const losers = m.participants.filter((p) => !p.win);

      const mapParticipant = (p: typeof m.participants[number]) => ({
        summonerName: p.summonerName,
        championId: p.championId,
        championName: p.championName,
        teamPosition: p.teamPosition,
        win: p.win,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        totalDamageDealtToChampions: p.totalDamageDealtToChampions,
        goldEarned: p.goldEarned,
        cs: p.totalMinionsKilled + p.neutralMinionsKilled,
        visionScore: p.visionScore,
        items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6],
      });

      return {
        matchId: m.id,
        queueId: m.queueId,
        patch: m.patch,
        gameDuration: m.gameDuration,
        gameStartTimestamp: Number(m.gameStartTimestamp),
        blueTeam: winners.length <= 5 ? winners.map(mapParticipant) : losers.map(mapParticipant),
        redTeam: winners.length <= 5 ? losers.map(mapParticipant) : winners.map(mapParticipant),
        blueWin: winners.length <= 5,
      };
    });

    res.json({ data, total, limit: take, offset: skip });
  } catch (err) {
    const error = err as Error;
    console.error('[Matches] Error fetching matches:', error.message);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

/* ---------- Single match detail ---------- */

router.get('/:matchId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { matchId } = req.params;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        queueId: true,
        patch: true,
        gameDuration: true,
        gameStartTimestamp: true,
        participants: {
          select: {
            summonerName: true,
            puuid: true,
            championId: true,
            championName: true,
            teamPosition: true,
            win: true,
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
            item0: true,
            item1: true,
            item2: true,
            item3: true,
            item4: true,
            item5: true,
            item6: true,
            primaryRune: true,
            secondaryRune: true,
            summoner1Id: true,
            summoner2Id: true,
          },
        },
      },
    });

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    const mapParticipant = (p: typeof match.participants[number]) => ({
      summonerName: p.summonerName,
      puuid: p.puuid,
      championId: p.championId,
      championName: p.championName,
      teamPosition: p.teamPosition,
      win: p.win,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      totalDamageDealtToChampions: p.totalDamageDealtToChampions,
      totalDamageTaken: p.totalDamageTaken,
      goldEarned: p.goldEarned,
      cs: p.totalMinionsKilled + p.neutralMinionsKilled,
      visionScore: p.visionScore,
      wardsPlaced: p.wardsPlaced,
      wardsKilled: p.wardsKilled,
      items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6],
      primaryRune: p.primaryRune,
      secondaryRune: p.secondaryRune,
      summoner1Id: p.summoner1Id,
      summoner2Id: p.summoner2Id,
    });

    const winners = match.participants.filter((p) => p.win);
    const losers = match.participants.filter((p) => !p.win);

    res.json({
      data: {
        matchId: match.id,
        queueId: match.queueId,
        patch: match.patch,
        gameDuration: match.gameDuration,
        gameStartTimestamp: Number(match.gameStartTimestamp),
        blueTeam: winners.length <= 5 ? winners.map(mapParticipant) : losers.map(mapParticipant),
        redTeam: winners.length <= 5 ? losers.map(mapParticipant) : winners.map(mapParticipant),
        blueWin: winners.length <= 5,
      },
    });
  } catch (err) {
    const error = err as Error;
    console.error('[Matches] Error fetching match:', error.message);
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

export default router;
