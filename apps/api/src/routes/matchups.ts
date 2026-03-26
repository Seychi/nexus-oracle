import { Router, Request, Response } from 'express';
import { prisma } from '../lib/db.js';
import { redis } from '../lib/redis.js';

const router = Router();

router.get('/:championId', async (req: Request, res: Response): Promise<void> => {
  try {
    const championId = Number(req.params.championId);
    const {
      role,
      patch,
      queue,
    } = req.query;

    if (isNaN(championId)) {
      res.status(400).json({ error: 'Invalid championId' });
      return;
    }

    const targetPatch = (patch as string) || process.env.TARGET_PATCH || '14.24';
    const targetQueue = Number(queue || process.env.TARGET_QUEUE || 420);

    const cacheKey = `api:matchups:${championId}:${role || 'all'}:${targetPatch}:${targetQueue}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      const data = JSON.parse(cached);
      res.json({ ...data, cached: true });
      return;
    }

    const where: Record<string, unknown> = {
      championId,
      patch: targetPatch,
      queueId: targetQueue,
    };

    if (role && role !== 'all') {
      where.role = String(role).toUpperCase();
    }

    const matchups = await prisma.matchupStats.findMany({
      where,
      orderBy: { winRate: 'desc' },
    });

    const best = matchups.slice(0, 10);
    const worst = [...matchups].sort((a, b) => a.winRate - b.winRate).slice(0, 10);

    const response = {
      championId,
      role: role || 'all',
      patch: targetPatch,
      matchups,
      best,
      worst,
      totalMatchups: matchups.length,
      cached: false,
    };

    await redis.set(cacheKey, JSON.stringify(response), 'EX', 1800);

    res.json(response);
  } catch (err) {
    const error = err as Error;
    console.error('[Matchups] Error fetching matchups:', error.message);
    res.status(500).json({ error: 'Failed to fetch matchup data' });
  }
});

export default router;
