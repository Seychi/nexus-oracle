import { Router, Request, Response } from 'express';
import { prisma } from '../lib/db.js';
import { redis } from '../lib/redis.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      role,
      sortBy = 'winRate',
      order = 'desc',
      patch,
      queue,
      rankFilter = 'all',
      limit,
      offset,
    } = req.query;

    const targetPatch = (patch as string) || process.env.TARGET_PATCH || '14.24';
    const targetQueue = Number(queue || process.env.TARGET_QUEUE || 420);
    const sortField = String(sortBy);
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    const cacheKey = `api:champions:${targetPatch}:${targetQueue}:${rankFilter}:${role || 'all'}:${sortField}:${sortOrder}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      const data = JSON.parse(cached);
      res.json({ data, cached: true });
      return;
    }

    const where: Record<string, unknown> = {
      patch: targetPatch,
      queueId: targetQueue,
      rankFilter: String(rankFilter),
    };

    if (role && role !== 'all') {
      where.role = String(role).toUpperCase();
    }

    const validSortFields = ['winRate', 'pickRate', 'banRate', 'games', 'avgKills', 'avgDeaths', 'avgAssists', 'avgDamage', 'avgGold', 'avgCs', 'tier', 'championName'];
    const orderByField = validSortFields.includes(sortField) ? sortField : 'winRate';

    const take = limit ? Math.min(Number(limit), 200) : undefined;
    const skip = offset ? Number(offset) : undefined;

    const stats = await prisma.championStats.findMany({
      where,
      orderBy: { [orderByField]: sortOrder },
      take,
      skip,
    });

    await redis.set(cacheKey, JSON.stringify(stats), 'EX', 1800);

    res.json({ data: stats, cached: false });
  } catch (err) {
    const error = err as Error;
    console.error('[Champions] Error fetching tier list:', error.message);
    res.status(500).json({ error: 'Failed to fetch champion stats' });
  }
});

router.get('/:championId', async (req: Request, res: Response): Promise<void> => {
  try {
    const championId = Number(req.params.championId);
    const {
      role,
      patch,
      queue,
      rankFilter = 'all',
    } = req.query;

    if (isNaN(championId)) {
      res.status(400).json({ error: 'Invalid championId' });
      return;
    }

    const targetPatch = (patch as string) || process.env.TARGET_PATCH || '14.24';
    const targetQueue = Number(queue || process.env.TARGET_QUEUE || 420);

    const cacheKey = `api:champion:${championId}:${role || 'all'}:${targetPatch}:${targetQueue}:${rankFilter}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      const data = JSON.parse(cached);
      res.json({ ...data, cached: true });
      return;
    }

    const statsWhere: Record<string, unknown> = {
      championId,
      patch: targetPatch,
      queueId: targetQueue,
      rankFilter: String(rankFilter),
    };

    if (role && role !== 'all') {
      statsWhere.role = String(role).toUpperCase();
    }

    const stats = await prisma.championStats.findMany({
      where: statsWhere,
      orderBy: { games: 'desc' },
    });

    const effectiveRole = role
      ? String(role).toUpperCase()
      : stats.length > 0
        ? stats[0].role
        : undefined;

    const buildsWhere: Record<string, unknown> = {
      championId,
      patch: targetPatch,
      queueId: targetQueue,
    };

    const matchupsWhere: Record<string, unknown> = {
      championId,
      patch: targetPatch,
      queueId: targetQueue,
    };

    if (effectiveRole) {
      buildsWhere.role = effectiveRole;
      matchupsWhere.role = effectiveRole;
    }

    const [builds, matchups] = await Promise.all([
      prisma.buildStats.findMany({
        where: buildsWhere,
        orderBy: [{ buildType: 'asc' }, { rank: 'asc' }],
      }),
      prisma.matchupStats.findMany({
        where: matchupsWhere,
        orderBy: { winRate: 'desc' },
      }),
    ]);

    const buildsByType: Record<string, typeof builds> = {};
    for (const build of builds) {
      if (!buildsByType[build.buildType]) {
        buildsByType[build.buildType] = [];
      }
      buildsByType[build.buildType].push(build);
    }

    const response = {
      stats,
      builds: buildsByType,
      matchups,
      cached: false,
    };

    await redis.set(cacheKey, JSON.stringify(response), 'EX', 1800);

    res.json(response);
  } catch (err) {
    const error = err as Error;
    console.error('[Champions] Error fetching champion data:', error.message);
    res.status(500).json({ error: 'Failed to fetch champion data' });
  }
});

export default router;
