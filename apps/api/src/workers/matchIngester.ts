import 'dotenv/config';

import { Worker, Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { riotClient, type MatchDto, type MatchParticipantDto } from '../lib/riotClient.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redisUrl = new URL(REDIS_URL);
const isTLS = redisUrl.protocol === 'rediss:';

interface IngestionJob {
  matchId: string;
}

function extractPatch(gameVersion: string): string {
  const parts = gameVersion.split('.');
  return `${parts[0]}.${parts[1]}`;
}

function extractSkillOrder(participant: MatchParticipantDto): number[] {
  if (participant.skillOrder && Array.isArray(participant.skillOrder)) {
    return participant.skillOrder;
  }
  return [];
}

function extractPrimaryRune(participant: MatchParticipantDto): number {
  if (
    participant.perks &&
    participant.perks.styles &&
    participant.perks.styles.length > 0
  ) {
    const primaryStyle = participant.perks.styles.find(
      (s) => s.description === 'primaryStyle'
    );
    if (primaryStyle && primaryStyle.selections && primaryStyle.selections.length > 0) {
      return primaryStyle.selections[0].perk;
    }
    return participant.perks.styles[0].style;
  }
  return 0;
}

function extractSecondaryRune(participant: MatchParticipantDto): number {
  if (
    participant.perks &&
    participant.perks.styles &&
    participant.perks.styles.length > 1
  ) {
    const secondaryStyle = participant.perks.styles.find(
      (s) => s.description === 'subStyle'
    );
    if (secondaryStyle) {
      return secondaryStyle.style;
    }
    return participant.perks.styles[1].style;
  }
  return 0;
}

async function processMatch(job: Job<IngestionJob>): Promise<void> {
  const { matchId } = job.data;

  console.log(`[Ingester] Processing match ${matchId}`);

  const existing = await prisma.match.findUnique({
    where: { id: matchId },
    select: { ingested: true },
  });

  if (existing?.ingested) {
    console.log(`[Ingester] Match ${matchId} already ingested, skipping`);
    return;
  }

  let matchData: MatchDto;
  try {
    matchData = await riotClient.getMatch(matchId);
  } catch (err) {
    const error = err as Error & { status?: number };
    if (error.status === 404) {
      console.warn(`[Ingester] Match ${matchId} not found on Riot API, skipping`);
      return;
    }
    throw err;
  }

  const { info, metadata } = matchData;

  if (!info || !info.participants || info.participants.length === 0) {
    console.warn(`[Ingester] Match ${matchId} has no participants, skipping`);
    return;
  }

  if (info.gameDuration < 300) {
    console.log(`[Ingester] Match ${matchId} too short (${info.gameDuration}s), skipping remake`);
    return;
  }

  const patch = extractPatch(info.gameVersion);

  const participantData = info.participants.map((p: MatchParticipantDto) => ({
    puuid: p.puuid,
    summonerName: p.riotIdGameName || p.summonerName || 'Unknown',
    championId: p.championId,
    championName: p.championName,
    teamPosition: p.teamPosition || p.individualPosition || 'UNKNOWN',
    win: p.win,
    patch,
    queueId: info.queueId,
    rankTier: null,
    item0: p.item0 || 0,
    item1: p.item1 || 0,
    item2: p.item2 || 0,
    item3: p.item3 || 0,
    item4: p.item4 || 0,
    item5: p.item5 || 0,
    item6: p.item6 || 0,
    primaryRune: extractPrimaryRune(p),
    secondaryRune: extractSecondaryRune(p),
    perks: p.perks as object,
    summoner1Id: p.summoner1Id || 0,
    summoner2Id: p.summoner2Id || 0,
    skillOrder: extractSkillOrder(p),
    kills: p.kills || 0,
    deaths: p.deaths || 0,
    assists: p.assists || 0,
    totalDamageDealtToChampions: p.totalDamageDealtToChampions || 0,
    totalDamageTaken: p.totalDamageTaken || 0,
    goldEarned: p.goldEarned || 0,
    totalMinionsKilled: p.totalMinionsKilled || 0,
    neutralMinionsKilled: p.neutralMinionsKilled || 0,
    visionScore: p.visionScore || 0,
    wardsPlaced: p.wardsPlaced || 0,
    wardsKilled: p.wardsKilled || 0,
    timePlayed: p.timePlayed || info.gameDuration,
  }));

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.match.upsert({
      where: { id: metadata.matchId },
      update: {
        rawJson: matchData as unknown as object,
        ingested: true,
      },
      create: {
        id: metadata.matchId,
        queueId: info.queueId,
        patch,
        gameDuration: info.gameDuration,
        gameStartTimestamp: BigInt(info.gameStartTimestamp),
        rawJson: matchData as unknown as object,
        ingested: true,
      },
    });

    await tx.participant.deleteMany({
      where: { matchId: metadata.matchId },
    });

    await tx.participant.createMany({
      data: participantData.map((p) => ({
        ...p,
        matchId: metadata.matchId,
      })),
    });
  });

  console.log(`[Ingester] Successfully ingested match ${matchId} (${patch}, ${participantData.length} participants)`);
}

// Concurrency 1 — the Riot client's Bottleneck handles rate limiting,
// so we process one at a time and let riotFetch retry on 429s
const worker = new Worker<IngestionJob>('match-ingestion', processMatch, {
  connection: {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    password: redisUrl.password || undefined,
    username: redisUrl.username || undefined,
    tls: isTLS ? {} : undefined,
  },
  concurrency: 1,
});

worker.on('completed', (job) => {
  console.log(`[Ingester] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Ingester] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('[Ingester] Worker error:', err);
});

console.log('[Ingester] Match ingestion worker started. Waiting for jobs...');

async function shutdown(): Promise<void> {
  console.log('[Ingester] Shutting down...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
