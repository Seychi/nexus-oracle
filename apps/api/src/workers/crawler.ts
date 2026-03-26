import 'dotenv/config';

import { prisma } from '../lib/db.js';
import { redis } from '../lib/redis.js';
import { riotClient } from '../lib/riotClient.js';
import { Queue } from 'bullmq';

const TARGET_QUEUE = Number(process.env.TARGET_QUEUE || 420);
const TARGET_REGION = process.env.TARGET_REGION || 'euw1';

const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
const isTLS = redisUrl.protocol === 'rediss:';

const matchQueue = new Queue('match-ingestion', {
  connection: {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    password: redisUrl.password || undefined,
    username: redisUrl.username || undefined,
    tls: isTLS ? {} : undefined,
  },
});

// ── Seed top players from ALL high-elo tiers ─────────────────────────────────
async function seedTier(tier: string, fetchFn: () => Promise<{ entries: Array<{ puuid?: string; summonerId?: string; leaguePoints: number }> }>): Promise<number> {
  console.log(`[Crawler] Fetching ${tier} ladder...`);
  try {
    const league = await fetchFn();
    const entries = league.entries
      .filter((e) => (e as { puuid?: string }).puuid)
      .sort((a, b) => b.leaguePoints - a.leaguePoints);

    let seeded = 0;
    for (const entry of entries) {
      const puuid = (entry as { puuid?: string }).puuid;
      if (!puuid) continue;

      await prisma.crawlSeed.upsert({
        where: { puuid },
        update: { tier, region: TARGET_REGION },
        create: { puuid, tier, region: TARGET_REGION },
      });
      seeded++;
    }
    console.log(`[Crawler] ${tier}: seeded ${seeded} players`);
    return seeded;
  } catch (err) {
    console.error(`[Crawler] Error fetching ${tier}:`, (err as Error).message);
    return 0;
  }
}

async function seedAllTiers(): Promise<void> {
  let total = 0;

  // Challenger
  total += await seedTier('CHALLENGER', () => riotClient.getChallengerLeague('RANKED_SOLO_5x5'));

  // Grandmaster
  total += await seedTier('GRANDMASTER', async () => {
    const res = await fetch(
      `${process.env.RIOT_PLATFORM_BASE}/lol/league/v4/grandmasterleagues/by-queue/RANKED_SOLO_5x5`,
      { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY || '' } },
    );
    return res.json();
  });

  // Master
  total += await seedTier('MASTER', async () => {
    const res = await fetch(
      `${process.env.RIOT_PLATFORM_BASE}/lol/league/v4/masterleagues/by-queue/RANKED_SOLO_5x5`,
      { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY || '' } },
    );
    return res.json();
  });

  console.log(`[Crawler] Total seeded across all tiers: ${total}`);
}

// ── Crawl match IDs (100 per player) ─────────────────────────────────────────
async function crawlMatchIds(batchSize = 100): Promise<void> {
  console.log('[Crawler] Crawling match IDs from seeds...');

  const staleThreshold = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4h

  const seeds = await prisma.crawlSeed.findMany({
    where: {
      OR: [
        { lastCrawled: null },
        { lastCrawled: { lt: staleThreshold } },
      ],
    },
    take: batchSize,
    orderBy: { lastCrawled: 'asc' },
  });

  console.log(`[Crawler] Processing ${seeds.length} seeds`);

  let totalNew = 0;

  for (const seed of seeds) {
    try {
      // Fetch up to 100 recent ranked matches
      const matchIds = await riotClient.getMatchIdsByPuuid(seed.puuid, {
        queue: TARGET_QUEUE,
        count: 100,
      });

      // Check which are already in DB
      const existing = await prisma.match.findMany({
        where: { id: { in: matchIds } },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((m: { id: string }) => m.id));
      const newIds = matchIds.filter((id) => !existingIds.has(id));

      // Queue new ones
      for (const matchId of newIds) {
        const alreadyQueued = await redis.get(`queued:${matchId}`);
        if (!alreadyQueued) {
          await matchQueue.add('ingest-match', { matchId }, {
            jobId: matchId,
            attempts: 5,
            backoff: { type: 'exponential', delay: 10000 },
          });
          await redis.set(`queued:${matchId}`, '1', 'EX', 86400);
          totalNew++;
        }
      }

      await prisma.crawlSeed.update({
        where: { puuid: seed.puuid },
        data: { lastCrawled: new Date() },
      });

      console.log(`[Crawler] ${seed.tier} ${seed.puuid.slice(0, 8)}... => ${newIds.length} new (${matchIds.length} total)`);
    } catch (err) {
      const error = err as Error & { status?: number };
      if (error.status === 404) continue;
      console.error(`[Crawler] Error: ${(err as Error).message}`);
    }
  }

  console.log(`[Crawler] Crawl batch done. Queued ${totalNew} new matches`);
}

// ── Continuous crawl loop ────────────────────────────────────────────────────
async function continuousCrawl(): Promise<void> {
  console.log('[Crawler] Starting continuous crawl...');

  // First seed all tiers
  await seedAllTiers();

  // Then crawl in batches until all seeds are done
  const totalSeeds = await prisma.crawlSeed.count();
  console.log(`[Crawler] Total seeds in DB: ${totalSeeds}`);

  let round = 1;
  while (true) {
    const uncrawled = await prisma.crawlSeed.count({
      where: {
        OR: [
          { lastCrawled: null },
          { lastCrawled: { lt: new Date(Date.now() - 4 * 60 * 60 * 1000) } },
        ],
      },
    });

    if (uncrawled === 0) {
      console.log('[Crawler] All seeds crawled! Done.');
      break;
    }

    console.log(`[Crawler] === Round ${round} — ${uncrawled} seeds remaining ===`);
    await crawlMatchIds(50);
    round++;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  try {
    await continuousCrawl();
  } catch (err) {
    console.error('[Crawler] Fatal error:', err);
  } finally {
    await matchQueue.close();
    await redis.quit();
    await prisma.$disconnect();
    process.exit(0);
  }
}

const isMainModule = process.argv[1]?.replace(/\\/g, '/').includes('crawler');
if (isMainModule) {
  main();
}

export { seedAllTiers as seedTopPlayers, crawlMatchIds };
