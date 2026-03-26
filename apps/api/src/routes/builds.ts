import { Router, Request, Response } from 'express';
import { prisma } from '../lib/db.js';
import { redis } from '../lib/redis.js';

const router = Router();

router.get('/:championId', async (req: Request, res: Response): Promise<void> => {
  try {
    const championId = Number(req.params.championId);
    const {
      role,
      sortBy = 'games',
      buildType,
      patch,
      queue,
    } = req.query;

    if (isNaN(championId)) {
      res.status(400).json({ error: 'Invalid championId' });
      return;
    }

    const targetPatch = (patch as string) || process.env.TARGET_PATCH || '14.24';
    const targetQueue = Number(queue || process.env.TARGET_QUEUE || 420);
    const sortField = String(sortBy);

    const cacheKey = `api:builds:${championId}:${role || 'all'}:${buildType || 'all'}:${sortField}:${targetPatch}:${targetQueue}`;
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

    if (buildType && buildType !== 'all') {
      where.buildType = String(buildType);
    }

    const validSortFields = ['games', 'winRate', 'pickRate', 'rank'];
    const orderByField = validSortFields.includes(sortField) ? sortField : 'games';
    const orderDirection = sortField === 'rank' ? 'asc' as const : 'desc' as const;

    const builds = await prisma.buildStats.findMany({
      where,
      orderBy: [
        { buildType: 'asc' },
        { [orderByField]: orderDirection },
      ],
    });

    const grouped: Record<string, typeof builds> = {};
    for (const build of builds) {
      if (!grouped[build.buildType]) {
        grouped[build.buildType] = [];
      }
      grouped[build.buildType].push(build);
    }

    const response = {
      championId,
      role: role || 'all',
      patch: targetPatch,
      builds: grouped,
      totalBuilds: builds.length,
      cached: false,
    };

    await redis.set(cacheKey, JSON.stringify(response), 'EX', 1800);

    res.json(response);
  } catch (err) {
    const error = err as Error;
    console.error('[Builds] Error fetching builds:', error.message);
    res.status(500).json({ error: 'Failed to fetch build data' });
  }
});

export default router;
