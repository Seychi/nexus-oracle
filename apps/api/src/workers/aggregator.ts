import 'dotenv/config';

import { prisma } from '../lib/db.js';
import { redis } from '../lib/redis.js';
import { aggregateChampionStats } from '../aggregations/championStats.js';
import { aggregateBuildStats } from '../aggregations/buildStats.js';
import { aggregateMatchups } from '../aggregations/matchupStats.js';

interface ChampionRoleCombo {
  championId: number;
  teamPosition: string;
}

async function runFullAggregation(): Promise<void> {
  const patch = process.env.TARGET_PATCH || '14.24';
  const queueId = Number(process.env.TARGET_QUEUE || 420);

  console.log('[Aggregator] Starting full aggregation...');
  console.log(`[Aggregator] Patch: ${patch}, Queue: ${queueId}`);

  const startTime = Date.now();

  console.log('[Aggregator] Step 1/3: Aggregating champion stats...');
  await aggregateChampionStats();

  console.log('[Aggregator] Step 2/3: Finding champion/role combinations...');
  const combos = await prisma.$queryRawUnsafe(
    `SELECT DISTINCT "championId", "teamPosition"
     FROM "Participant"
     WHERE "patch" = $1
       AND "queueId" = $2
       AND "teamPosition" != ''
       AND "teamPosition" != 'UNKNOWN'
     ORDER BY "championId", "teamPosition"`,
    patch,
    queueId
  ) as ChampionRoleCombo[];

  console.log(`[Aggregator] Found ${combos.length} champion/role combinations`);

  let processed = 0;
  for (const combo of combos) {
    try {
      await aggregateBuildStats(combo.championId, combo.teamPosition);
      await aggregateMatchups(combo.championId, combo.teamPosition);

      processed++;
      if (processed % 25 === 0) {
        console.log(`[Aggregator] Progress: ${processed}/${combos.length} combinations processed`);
      }
    } catch (err) {
      const error = err as Error;
      console.error(
        `[Aggregator] Error processing champion ${combo.championId} ${combo.teamPosition}:`,
        error.message
      );
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`[Aggregator] Full aggregation complete. Processed ${processed}/${combos.length} combos in ${elapsed}s`);
}

async function main(): Promise<void> {
  try {
    await runFullAggregation();
  } catch (err) {
    console.error('[Aggregator] Fatal error:', err);
  } finally {
    await redis.quit();
    await prisma.$disconnect();
    process.exit(0);
  }
}

const isMainModule = process.argv[1]?.replace(/\\/g, '/').includes('aggregator');
if (isMainModule) {
  main();
}

export { runFullAggregation };
