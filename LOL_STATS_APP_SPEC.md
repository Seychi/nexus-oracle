# League of Legends Stats App — Claude Code Spec

## Overview
Build a full-stack League of Legends statistics platform similar to Mobalytics/OP.GG.
The app ingests match data from the Riot Games API, aggregates it into champion stats,
build stats (sorted by winrate, pickrate, etc.), matchup stats, and exposes everything
via a REST API + a React frontend.

---

## Tech Stack

- **Backend**: Node.js + TypeScript, Express
- **Database**: PostgreSQL (raw data + aggregated stats)
- **Cache**: Redis (serve pre-computed stats fast)
- **Queue**: BullMQ (rate-limited Riot API crawling)
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **ORM**: Prisma
- **Package manager**: pnpm (monorepo with `apps/api` and `apps/web`)

---

## Project Structure

```
lol-stats/
├── apps/
│   ├── api/                  # Express backend
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── champions.ts
│   │   │   │   ├── builds.ts
│   │   │   │   ├── matchups.ts
│   │   │   │   └── summoner.ts
│   │   │   ├── workers/
│   │   │   │   ├── crawler.ts        # Crawls match IDs from top players
│   │   │   │   ├── matchIngester.ts  # Fetches + stores raw match JSON
│   │   │   │   └── aggregator.ts     # Runs aggregation SQL jobs
│   │   │   ├── lib/
│   │   │   │   ├── riotClient.ts     # Riot API wrapper with rate limiting
│   │   │   │   ├── redis.ts
│   │   │   │   └── db.ts
│   │   │   ├── aggregations/
│   │   │   │   ├── championStats.ts
│   │   │   │   ├── buildStats.ts
│   │   │   │   ├── matchupStats.ts
│   │   │   │   └── runeStats.ts
│   │   │   └── index.ts
│   │   └── prisma/
│   │       └── schema.prisma
│   └── web/                  # React frontend
│       └── src/
│           ├── pages/
│           │   ├── ChampionPage.tsx   # Stats + builds for one champion
│           │   ├── TierList.tsx       # All champions ranked
│           │   └── SummonerPage.tsx   # Individual player profile
│           └── components/
├── package.json
└── .env.example
```

---

## Environment Variables (.env)

```env
# Riot API
RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# Use 'americas', 'europe', or 'asia' depending on target region
RIOT_REGIONAL_BASE=https://americas.api.riotgames.com
# Platform routing (na1, euw1, kr, etc.)
RIOT_PLATFORM_BASE=https://na1.api.riotgames.com

# Postgres
DATABASE_URL=postgresql://postgres:password@localhost:5432/lolstats

# Redis
REDIS_URL=redis://localhost:6379

# App
PORT=3001
TARGET_PATCH=14.24       # Update each patch
TARGET_REGION=na1
TARGET_QUEUE=420         # 420=Ranked Solo, 440=Flex, 450=ARAM
```

---

## Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Raw match storage
model Match {
  id          String   @id  // e.g. "NA1_1234567890"
  queueId     Int
  patch       String       // "14.24"
  gameDuration Int          // seconds
  gameStartTimestamp BigInt
  rawJson     Json         // full Riot API response
  ingested    Boolean  @default(false)
  createdAt   DateTime @default(now())

  participants Participant[]
}

// One row per player per match (flattened from raw JSON)
model Participant {
  id              String @id @default(cuid())
  matchId         String
  match           Match  @relation(fields: [matchId], references: [id])

  puuid           String
  summonerName    String
  championId      Int
  championName    String
  teamPosition    String   // "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY"
  win             Boolean
  patch           String
  queueId         Int
  rankTier        String?  // "GOLD" | "PLATINUM" | "DIAMOND" etc.

  // Items (0 = first completed, 1-5 = rest, 6 = trinket)
  item0 Int  @default(0)
  item1 Int  @default(0)
  item2 Int  @default(0)
  item3 Int  @default(0)
  item4 Int  @default(0)
  item5 Int  @default(0)
  item6 Int  @default(0)   // trinket

  // Runes
  primaryRune     Int   // keystone perk ID
  secondaryRune   Int   // secondary tree perk ID
  perks           Json  // full perks object

  // Summoner spells
  summoner1Id Int
  summoner2Id Int

  // Skill order (array of ability slots: "Q","W","E","R")
  skillOrder      Json   // e.g. ["Q","W","Q","E","Q","R","Q","E","E","R",...]

  // Stats
  kills           Int
  deaths          Int
  assists         Int
  totalDamageDealtToChampions Int
  totalDamageTaken Int
  goldEarned      Int
  totalMinionsKilled Int
  neutralMinionsKilled Int
  visionScore     Int
  wardsPlaced     Int
  wardsKilled     Int
  timePlayed      Int

  createdAt DateTime @default(now())

  @@index([championId, teamPosition, patch, queueId])
  @@index([puuid])
  @@index([patch, queueId])
}

// Pre-aggregated champion stats (refreshed hourly)
model ChampionStats {
  id            String @id @default(cuid())
  championId    Int
  championName  String
  role          String
  patch         String
  queueId       Int
  rankFilter    String   // "ALL" | "PLATINUM_PLUS" | "DIAMOND_PLUS"

  games         Int
  wins          Int
  winRate       Float    // 0.0 - 1.0
  pickRate      Float    // fraction of all games this champ appeared in this role
  banRate       Float    // fraction of games where this champ was banned
  avgKills      Float
  avgDeaths     Float
  avgAssists    Float
  avgDamage     Float
  avgGold       Float
  avgCs         Float

  tier          String?  // "S+" | "S" | "A" | "B" | "C" computed from winrate+pickrate

  updatedAt DateTime @updatedAt

  @@unique([championId, role, patch, queueId, rankFilter])
}

// Pre-aggregated build stats
model BuildStats {
  id            String @id @default(cuid())
  championId    Int
  championName  String
  role          String
  patch         String
  queueId       Int

  buildType     String   // "STARTER" | "CORE" | "FULL" | "BOOTS" | "RUNE"

  // For item builds: array of item IDs e.g. [3031, 3006, 3033]
  // For rune builds: array of perk IDs e.g. [8008, 9111, 9104, 8014, 8299, 5008]
  items         Int[]

  games         Int
  wins          Int
  winRate       Float
  pickRate      Float    // how often this specific build is used among all games for this champ/role

  rank          Int      // 1 = most popular, 2 = second most popular etc.

  updatedAt DateTime @updatedAt

  @@index([championId, role, patch, queueId, buildType])
}

// Pre-aggregated matchup stats
model MatchupStats {
  id              String @id @default(cuid())
  championId      Int    // the champion we're viewing
  opponentId      Int    // the opponent
  role            String
  patch           String
  queueId         Int

  games           Int
  wins            Int
  winRate         Float
  avgGoldDiff15   Float  // gold diff at 15 min (positive = ahead)
  avgCsDiff15     Float

  updatedAt DateTime @updatedAt

  @@unique([championId, opponentId, role, patch, queueId])
}

// Tracks which summoners have been seeded for crawling
model CrawlSeed {
  puuid       String @id
  region      String
  tier        String
  lastCrawled DateTime?
  createdAt   DateTime @default(now())
}
```

---

## Riot API Client (`src/lib/riotClient.ts`)

```typescript
// Rate-limit-aware Riot API wrapper
// Dev key: 20 req/s, 100 req/2min
// Production key: ~3000 req/10s

import Bottleneck from 'bottleneck'  // pnpm add bottleneck
import axios from 'axios'

const limiter = new Bottleneck({
  reservoir: 20,
  reservoirRefreshAmount: 20,
  reservoirRefreshInterval: 1000,  // 20/s
  maxConcurrent: 5,
})

const regionalClient = axios.create({
  baseURL: process.env.RIOT_REGIONAL_BASE,
  headers: { 'X-Riot-Token': process.env.RIOT_API_KEY },
})

const platformClient = axios.create({
  baseURL: process.env.RIOT_PLATFORM_BASE,
  headers: { 'X-Riot-Token': process.env.RIOT_API_KEY },
})

export const riotApi = {
  // Account
  getAccountByRiotId: (gameName: string, tagLine: string) =>
    limiter.schedule(() =>
      regionalClient.get(`/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`)
    ),

  // Summoner
  getSummonerByPuuid: (puuid: string) =>
    limiter.schedule(() =>
      platformClient.get(`/lol/summoner/v4/summoners/by-puuid/${puuid}`)
    ),

  // Ranked
  getLeagueEntries: (tier: string, division: string, page = 1) =>
    limiter.schedule(() =>
      platformClient.get(
        `/lol/league/v4/entries/RANKED_SOLO_5x5/${tier}/${division}?page=${page}`
      )
    ),

  getChallengerLeague: () =>
    limiter.schedule(() =>
      platformClient.get(`/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5`)
    ),

  // Match
  getMatchIdsByPuuid: (puuid: string, start = 0, count = 100) =>
    limiter.schedule(() =>
      regionalClient.get(
        `/lol/match/v5/matches/by-puuid/${puuid}/ids` +
        `?queue=${process.env.TARGET_QUEUE}&type=ranked&start=${start}&count=${count}`
      )
    ),

  getMatch: (matchId: string) =>
    limiter.schedule(() =>
      regionalClient.get(`/lol/match/v5/matches/${matchId}`)
    ),

  // Live game
  getLiveGame: (puuid: string) =>
    limiter.schedule(() =>
      platformClient.get(`/lol/spectator/v5/active-games/by-summoner/${puuid}`)
    ),
}
```

---

## Crawler Worker (`src/workers/crawler.ts`)

```typescript
// 1. Fetch top-ranked players (Challenger, Grandmaster, Master, Diamond)
// 2. Store their PUUIDs in CrawlSeed
// 3. For each unseeded/stale PUUID, fetch recent match IDs
// 4. Push match IDs into the ingestion queue

import { Queue } from 'bullmq'
import { prisma } from '../lib/db'
import { riotApi } from '../lib/riotClient'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL!)
export const matchQueue = new Queue('match-ingestion', { connection })

export async function seedTopPlayers() {
  // Pull Challenger ladder
  const { data: challenger } = await riotApi.getChallengerLeague()
  const entries = challenger.entries.slice(0, 300)  // top 300 players

  for (const entry of entries) {
    const summoner = await riotApi.getSummonerByPuuid(entry.summonerId)
    await prisma.crawlSeed.upsert({
      where: { puuid: summoner.data.puuid },
      update: { tier: 'CHALLENGER' },
      create: { puuid: summoner.data.puuid, region: process.env.TARGET_REGION!, tier: 'CHALLENGER' },
    })
  }
}

export async function crawlMatchIds() {
  const seeds = await prisma.crawlSeed.findMany({
    where: {
      OR: [
        { lastCrawled: null },
        { lastCrawled: { lt: new Date(Date.now() - 1000 * 60 * 60 * 6) } }  // 6h ago
      ]
    },
    take: 50
  })

  for (const seed of seeds) {
    const { data: matchIds } = await riotApi.getMatchIdsByPuuid(seed.puuid, 0, 100)

    // Only queue match IDs we haven't seen
    const existing = await prisma.match.findMany({
      where: { id: { in: matchIds } },
      select: { id: true }
    })
    const existingSet = new Set(existing.map(m => m.id))
    const newIds = matchIds.filter((id: string) => !existingSet.has(id))

    for (const matchId of newIds) {
      await matchQueue.add('ingest-match', { matchId }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      })
    }

    await prisma.crawlSeed.update({
      where: { puuid: seed.puuid },
      data: { lastCrawled: new Date() }
    })
  }
}
```

---

## Match Ingester Worker (`src/workers/matchIngester.ts`)

```typescript
// Consumes the match-ingestion queue
// Fetches full match JSON from Riot, stores raw + flattened participants

import { Worker } from 'bullmq'
import { prisma } from '../lib/db'
import { riotApi } from '../lib/riotClient'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL!)

function extractPatch(gameVersion: string): string {
  const parts = gameVersion.split('.')
  return `${parts[0]}.${parts[1]}`
}

function extractSkillOrder(timeline: any, participantId: number): string[] {
  if (!timeline?.info?.frames) return []
  const order: string[] = []
  const slotMap: Record<number, string> = { 1: 'Q', 2: 'W', 3: 'E', 4: 'R' }
  for (const frame of timeline.info.frames) {
    for (const event of (frame.events || [])) {
      if (event.type === 'SKILL_LEVEL_UP' && event.participantId === participantId) {
        const skill = slotMap[event.skillSlot]
        if (skill) order.push(skill)
      }
    }
  }
  return order
}

new Worker('match-ingestion', async (job) => {
  const { matchId } = job.data
  const { data: match } = await riotApi.getMatch(matchId)

  const patch = extractPatch(match.info.gameVersion)
  const queueId = match.info.queueId

  // Store raw match
  await prisma.match.upsert({
    where: { id: matchId },
    update: {},
    create: {
      id: matchId,
      queueId,
      patch,
      gameDuration: match.info.gameDuration,
      gameStartTimestamp: BigInt(match.info.gameStartTimestamp),
      rawJson: match,
    }
  })

  // Flatten participants
  for (const p of match.info.participants) {
    const perks = p.perks || {}
    const primaryStyle = perks.styles?.[0]
    const secondaryStyle = perks.styles?.[1]

    await prisma.participant.upsert({
      where: { id: `${matchId}_${p.participantId}` },
      update: {},
      create: {
        id: `${matchId}_${p.participantId}`,
        matchId,
        puuid: p.puuid,
        summonerName: p.summonerName || p.riotIdGameName || '',
        championId: p.championId,
        championName: p.championName,
        teamPosition: p.teamPosition || p.individualPosition || 'UNKNOWN',
        win: p.win,
        patch,
        queueId,

        item0: p.item0, item1: p.item1, item2: p.item2,
        item3: p.item3, item4: p.item4, item5: p.item5, item6: p.item6,

        primaryRune: primaryStyle?.selections?.[0]?.perk ?? 0,
        secondaryRune: secondaryStyle?.style ?? 0,
        perks,

        summoner1Id: p.summoner1Id,
        summoner2Id: p.summoner2Id,

        skillOrder: extractSkillOrder(null, p.participantId),  // requires timeline endpoint

        kills: p.kills, deaths: p.deaths, assists: p.assists,
        totalDamageDealtToChampions: p.totalDamageDealtToChampions,
        totalDamageTaken: p.totalDamageTaken,
        goldEarned: p.goldEarned,
        totalMinionsKilled: p.totalMinionsKilled,
        neutralMinionsKilled: p.neutralMinionsKilled,
        visionScore: p.visionScore,
        wardsPlaced: p.wardsPlaced,
        wardsKilled: p.wardsKilled,
        timePlayed: p.timePlayed,
      }
    })
  }
}, { connection, concurrency: 10 })

console.log('Match ingester worker started')
```

---

## Aggregation Jobs (`src/aggregations/buildStats.ts`)

This is the **core** of what Mobalytics does. Run these after ingestion or on a schedule.

```typescript
import { prisma } from '../lib/db'
import { redis } from '../lib/redis'

const PATCH = process.env.TARGET_PATCH!
const QUEUE = parseInt(process.env.TARGET_QUEUE!)

// ─────────────────────────────────────────
// CHAMPION STATS (winrate, pickrate, etc.)
// ─────────────────────────────────────────
export async function aggregateChampionStats() {
  // Total games in patch (for pickrate calculation)
  const totalGames = await prisma.match.count({
    where: { patch: PATCH, queueId: QUEUE }
  })

  // Group by champion + role
  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      "championId",
      "championName",
      "teamPosition"                              AS role,
      COUNT(*)::int                               AS games,
      SUM(CASE WHEN win THEN 1 ELSE 0 END)::int  AS wins,
      AVG(kills)                                  AS "avgKills",
      AVG(deaths)                                 AS "avgDeaths",
      AVG(assists)                                AS "avgAssists",
      AVG("totalDamageDealtToChampions")          AS "avgDamage",
      AVG("goldEarned")                           AS "avgGold",
      AVG("totalMinionsKilled" + "neutralMinionsKilled") AS "avgCs"
    FROM "Participant"
    WHERE patch = ${PATCH} AND "queueId" = ${QUEUE}
      AND "teamPosition" != 'UNKNOWN'
    GROUP BY "championId", "championName", "teamPosition"
    HAVING COUNT(*) >= 100
    ORDER BY games DESC
  `

  for (const row of rows) {
    const winRate = row.wins / row.games
    const pickRate = row.games / (totalGames * 2)  // 2 teams per game, ~1 champ/role

    // Compute tier based on winrate + pickrate
    const tier = computeTier(winRate, pickRate)

    await prisma.championStats.upsert({
      where: {
        championId_role_patch_queueId_rankFilter: {
          championId: row.championId,
          role: row.role,
          patch: PATCH,
          queueId: QUEUE,
          rankFilter: 'ALL'
        }
      },
      update: {
        games: row.games, wins: row.wins, winRate, pickRate, banRate: 0,
        avgKills: row.avgKills, avgDeaths: row.avgDeaths, avgAssists: row.avgAssists,
        avgDamage: row.avgDamage, avgGold: row.avgGold, avgCs: row.avgCs, tier
      },
      create: {
        championId: row.championId, championName: row.championName,
        role: row.role, patch: PATCH, queueId: QUEUE, rankFilter: 'ALL',
        games: row.games, wins: row.wins, winRate, pickRate, banRate: 0,
        avgKills: row.avgKills, avgDeaths: row.avgDeaths, avgAssists: row.avgAssists,
        avgDamage: row.avgDamage, avgGold: row.avgGold, avgCs: row.avgCs, tier
      }
    })

    // Cache in Redis: champion:{id}:{role}:stats
    await redis.set(
      `champ:${row.championId}:${row.role}:${PATCH}:stats`,
      JSON.stringify({ ...row, winRate, pickRate, tier }),
      'EX', 3600
    )
  }
}

function computeTier(winRate: number, pickRate: number): string {
  if (winRate >= 0.535 && pickRate >= 0.05) return 'S+'
  if (winRate >= 0.52) return 'S'
  if (winRate >= 0.505) return 'A'
  if (winRate >= 0.49) return 'B'
  return 'C'
}

// ─────────────────────────────────────────
// BUILD STATS — items sorted by WR%, pickrate
// This is the Mobalytics "builds" page core logic
// ─────────────────────────────────────────

export async function aggregateBuildStats(championId: number, role: string) {
  const totalGames = await prisma.participant.count({
    where: { championId, teamPosition: role, patch: PATCH, queueId: QUEUE }
  })
  if (totalGames < 100) return

  // ── 1. CORE 3-ITEM BUILDS (items sorted, exclude trinkets and boots) ──
  const coreBuildRows = await prisma.$queryRaw<any[]>`
    WITH item_combos AS (
      SELECT
        win,
        ARRAY(
          SELECT unnest(
            ARRAY[item0,item1,item2,item3,item4,item5]
          )
          WHERE item != 0
            AND item NOT IN (
              -- Common boots IDs — exclude from core build
              3006,3009,3020,3047,3111,3117,3158,3005
            )
          ORDER BY item
          LIMIT 3
        ) AS core_items
      FROM "Participant"
      WHERE "championId" = ${championId}
        AND "teamPosition" = ${role}
        AND patch = ${PATCH}
        AND "queueId" = ${QUEUE}
    )
    SELECT
      core_items                                         AS items,
      COUNT(*)::int                                      AS games,
      SUM(CASE WHEN win THEN 1 ELSE 0 END)::int          AS wins
    FROM item_combos
    WHERE array_length(core_items, 1) = 3
    GROUP BY core_items
    HAVING COUNT(*) >= 30
    ORDER BY games DESC
    LIMIT 10
  `

  // ── 2. BOOTS ──
  const bootsRows = await prisma.$queryRaw<any[]>`
    WITH boots AS (
      SELECT win,
        CASE
          WHEN item0 IN (3006,3009,3020,3047,3111,3117,3158) THEN item0
          WHEN item1 IN (3006,3009,3020,3047,3111,3117,3158) THEN item1
          WHEN item2 IN (3006,3009,3020,3047,3111,3117,3158) THEN item2
          WHEN item3 IN (3006,3009,3020,3047,3111,3117,3158) THEN item3
          WHEN item4 IN (3006,3009,3020,3047,3111,3117,3158) THEN item4
          WHEN item5 IN (3006,3009,3020,3047,3111,3117,3158) THEN item5
          ELSE 0
        END AS boot
      FROM "Participant"
      WHERE "championId" = ${championId}
        AND "teamPosition" = ${role}
        AND patch = ${PATCH}
        AND "queueId" = ${QUEUE}
    )
    SELECT
      ARRAY[boot]                                       AS items,
      COUNT(*)::int                                     AS games,
      SUM(CASE WHEN win THEN 1 ELSE 0 END)::int         AS wins
    FROM boots WHERE boot != 0
    GROUP BY boot ORDER BY games DESC
    LIMIT 5
  `

  // ── 3. STARTER ITEMS (first item completed) ──
  // We approximate by looking at item1 (often the first completed item)
  const starterRows = await prisma.$queryRaw<any[]>`
    SELECT
      ARRAY[item0]                                       AS items,
      COUNT(*)::int                                      AS games,
      SUM(CASE WHEN win THEN 1 ELSE 0 END)::int          AS wins
    FROM "Participant"
    WHERE "championId" = ${championId}
      AND "teamPosition" = ${role}
      AND patch = ${PATCH}
      AND "queueId" = ${QUEUE}
      AND item0 != 0
    GROUP BY item0
    HAVING COUNT(*) >= 20
    ORDER BY games DESC
    LIMIT 6
  `

  // ── 4. RUNE BUILDS (keystone + secondary tree) ──
  const runeRows = await prisma.$queryRaw<any[]>`
    SELECT
      ARRAY["primaryRune", "secondaryRune"]              AS items,
      COUNT(*)::int                                      AS games,
      SUM(CASE WHEN win THEN 1 ELSE 0 END)::int          AS wins
    FROM "Participant"
    WHERE "championId" = ${championId}
      AND "teamPosition" = ${role}
      AND patch = ${PATCH}
      AND "queueId" = ${QUEUE}
      AND "primaryRune" != 0
    GROUP BY "primaryRune", "secondaryRune"
    HAVING COUNT(*) >= 30
    ORDER BY games DESC
    LIMIT 8
  `

  // ── Save all build types ──
  const allBuilds = [
    ...coreBuildRows.map((r, i) => ({ ...r, buildType: 'CORE', rank: i + 1 })),
    ...bootsRows.map((r, i) => ({ ...r, buildType: 'BOOTS', rank: i + 1 })),
    ...starterRows.map((r, i) => ({ ...r, buildType: 'STARTER', rank: i + 1 })),
    ...runeRows.map((r, i) => ({ ...r, buildType: 'RUNE', rank: i + 1 })),
  ]

  // Delete old build stats for this champion/role/patch
  await prisma.buildStats.deleteMany({
    where: { championId, role, patch: PATCH, queueId: QUEUE }
  })

  for (const build of allBuilds) {
    await prisma.buildStats.create({
      data: {
        championId,
        championName: '',  // fill from ChampionStats lookup
        role,
        patch: PATCH,
        queueId: QUEUE,
        buildType: build.buildType,
        items: build.items,
        games: build.games,
        wins: build.wins,
        winRate: build.wins / build.games,
        pickRate: build.games / totalGames,
        rank: build.rank,
      }
    })
  }

  // Cache
  await redis.set(
    `champ:${championId}:${role}:${PATCH}:builds`,
    JSON.stringify(allBuilds),
    'EX', 3600
  )
}

// ─────────────────────────────────────────
// MATCHUP STATS
// ─────────────────────────────────────────
export async function aggregateMatchups(championId: number, role: string) {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      p2."championId"                                     AS "opponentId",
      p2."championName"                                   AS "opponentName",
      COUNT(*)::int                                       AS games,
      SUM(CASE WHEN p1.win THEN 1 ELSE 0 END)::int        AS wins
    FROM "Participant" p1
    JOIN "Participant" p2
      ON p1."matchId" = p2."matchId"
      AND p1."teamPosition" = p2."teamPosition"
      AND p1.puuid != p2.puuid
      AND p1.win != p2.win   -- opposite teams
    WHERE p1."championId" = ${championId}
      AND p1."teamPosition" = ${role}
      AND p1.patch = ${PATCH}
      AND p1."queueId" = ${QUEUE}
    GROUP BY p2."championId", p2."championName"
    HAVING COUNT(*) >= 50
    ORDER BY games DESC
  `

  for (const row of rows) {
    await prisma.matchupStats.upsert({
      where: {
        championId_opponentId_role_patch_queueId: {
          championId, opponentId: row.opponentId,
          role, patch: PATCH, queueId: QUEUE
        }
      },
      update: {
        games: row.games, wins: row.wins,
        winRate: row.wins / row.games,
        avgGoldDiff15: 0, avgCsDiff15: 0
      },
      create: {
        championId, opponentId: row.opponentId,
        role, patch: PATCH, queueId: QUEUE,
        games: row.games, wins: row.wins,
        winRate: row.wins / row.games,
        avgGoldDiff15: 0, avgCsDiff15: 0
      }
    })
  }
}
```

---

## REST API Routes (`src/routes/`)

### `/src/routes/champions.ts`

```typescript
import { Router } from 'express'
import { prisma } from '../lib/db'
import { redis } from '../lib/redis'

const router = Router()
const PATCH = process.env.TARGET_PATCH!
const QUEUE = parseInt(process.env.TARGET_QUEUE!)

// GET /api/champions
// All champions with stats, sortable by winRate | pickRate | banRate | tier
router.get('/', async (req, res) => {
  const { role, sort = 'winRate', order = 'desc', patch = PATCH } = req.query

  const cacheKey = `tierlist:${role}:${sort}:${order}:${patch}`
  const cached = await redis.get(cacheKey)
  if (cached) return res.json(JSON.parse(cached))

  const stats = await prisma.championStats.findMany({
    where: {
      patch: patch as string,
      queueId: QUEUE,
      rankFilter: 'ALL',
      ...(role ? { role: role as string } : {}),
    },
    orderBy: { [sort as string]: order as 'asc' | 'desc' },
  })

  await redis.set(cacheKey, JSON.stringify(stats), 'EX', 1800)
  res.json(stats)
})

// GET /api/champions/:championId
// Full champion data: stats + builds + matchups for a given role
router.get('/:championId', async (req, res) => {
  const championId = parseInt(req.params.championId)
  const { role = 'TOP', patch = PATCH } = req.query

  const [stats, builds, matchups] = await Promise.all([
    prisma.championStats.findFirst({
      where: { championId, role: role as string, patch: patch as string, queueId: QUEUE, rankFilter: 'ALL' }
    }),
    prisma.buildStats.findMany({
      where: { championId, role: role as string, patch: patch as string, queueId: QUEUE },
      orderBy: [{ buildType: 'asc' }, { games: 'desc' }]
    }),
    prisma.matchupStats.findMany({
      where: { championId, role: role as string, patch: patch as string, queueId: QUEUE },
      orderBy: { winRate: 'desc' }
    }),
  ])

  res.json({ stats, builds, matchups })
})

export default router
```

### `/src/routes/builds.ts`

```typescript
import { Router } from 'express'
import { prisma } from '../lib/db'

const router = Router()
const PATCH = process.env.TARGET_PATCH!
const QUEUE = parseInt(process.env.TARGET_QUEUE!)

// GET /api/builds/:championId?role=TOP&sortBy=winRate
// Returns all build types sorted by the requested stat
router.get('/:championId', async (req, res) => {
  const championId = parseInt(req.params.championId)
  const { role = 'TOP', sortBy = 'games', buildType, patch = PATCH } = req.query

  const builds = await prisma.buildStats.findMany({
    where: {
      championId,
      patch: patch as string,
      queueId: QUEUE,
      ...(role ? { role: role as string } : {}),
      ...(buildType ? { buildType: buildType as string } : {}),
    },
    orderBy: { [sortBy as string]: 'desc' }
  })

  // Group by buildType for easy frontend consumption
  const grouped = builds.reduce((acc: Record<string, any[]>, b) => {
    if (!acc[b.buildType]) acc[b.buildType] = []
    acc[b.buildType].push(b)
    return acc
  }, {})

  res.json(grouped)
})

export default router
```

---

## Aggregator Runner (`src/workers/aggregator.ts`)

```typescript
// Run all aggregation jobs. Call this:
// - On app start (if data exists)
// - Every hour via a cron job
// - After each new patch drops

import { aggregateChampionStats, aggregateBuildStats, aggregateMatchups } from '../aggregations/buildStats'
import { prisma } from '../lib/db'

export async function runFullAggregation() {
  console.log('Starting full aggregation...')

  // 1. Champion stats (all champions)
  await aggregateChampionStats()
  console.log('Champion stats done')

  // 2. Build stats (for every champion in every role that has enough data)
  const champions = await prisma.championStats.findMany({
    where: { patch: process.env.TARGET_PATCH! },
    select: { championId: true, role: true },
    distinct: ['championId', 'role'],
  })

  for (const { championId, role } of champions) {
    await aggregateBuildStats(championId, role)
    await aggregateMatchups(championId, role)
  }

  console.log(`Aggregation complete: ${champions.length} champion/role combos processed`)
}

// Run via: npx ts-node -e "require('./src/workers/aggregator').runFullAggregation()"
if (require.main === module) {
  runFullAggregation().then(() => process.exit(0)).catch(console.error)
}
```

---

## Express App Entry (`src/index.ts`)

```typescript
import express from 'express'
import cors from 'cors'
import championsRouter from './routes/champions'
import buildsRouter from './routes/builds'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/champions', championsRouter)
app.use('/api/builds', buildsRouter)

app.get('/health', (_, res) => res.json({ ok: true }))

app.listen(process.env.PORT || 3001, () => {
  console.log(`API running on port ${process.env.PORT || 3001}`)
})
```

---

## Data Dragon (Static Assets)

Riot provides all static assets for free. No API key needed.

```typescript
// src/lib/dataDragon.ts

const PATCH = process.env.TARGET_PATCH!  // e.g. "14.24"
const BASE = `https://ddragon.leagueoflegends.com/cdn/${PATCH}.1`

export const dd = {
  // Champion list: id -> { name, key, title }
  champions: () => fetch(`${BASE}/data/en_US/champion.json`).then(r => r.json()),

  // Item list: id -> { name, description, gold, image }
  items: () => fetch(`${BASE}/data/en_US/item.json`).then(r => r.json()),

  // Runes
  runes: () => fetch(`${BASE}/data/en_US/runesReforged.json`).then(r => r.json()),

  // Image URLs (use directly in <img> tags)
  championSquare: (name: string) => `${BASE}/img/champion/${name}.png`,
  itemIcon: (itemId: number) => `${BASE}/img/item/${itemId}.png`,
  championSplash: (name: string, num = 0) =>
    `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${name}_${num}.jpg`,
  profileIcon: (iconId: number) => `${BASE}/img/profileicon/${iconId}.png`,
}
```

---

## Frontend Pages

### Champion Builds Page (`apps/web/src/pages/ChampionPage.tsx`)

```tsx
// Fetches from GET /api/builds/:championId?role=TOP&sortBy=winRate
// Displays:
//   - Champion header (splash, stats summary)
//   - Tabs: Most Popular | Highest WR | Highest Pickrate
//   - Cards: CORE builds, BOOTS, STARTERS, RUNES
//   - Matchups table: Best/Worst matchups

// Build sort tabs to implement:
// 1. "Most Games" (default) — sortBy=games
// 2. "Highest Winrate" — sortBy=winRate
// 3. "Most Played" — sortBy=pickRate (same as games but shown as %)

// Each build card shows:
// - Item icons (from Data Dragon)
// - Games: 1,234
// - Win Rate: 54.2%  (color: green if >52%, red if <48%)
// - Pick Rate: 28.4%
```

### Tier List Page (`apps/web/src/pages/TierList.tsx`)

```tsx
// Fetches from GET /api/champions?role=ALL&sort=winRate&order=desc
// Groups champions by tier: S+ | S | A | B | C
// Columns: Champion | Win Rate | Pick Rate | Ban Rate | KDA | Tier
// Filters: Role selector (TOP / JUNGLE / MIDDLE / BOTTOM / UTILITY)
// Sort by clicking any column header
```

---

## Setup Commands for Claude Code

Run these in order:

```bash
# 1. Init monorepo
mkdir lol-stats && cd lol-stats
pnpm init
pnpm add -D typescript ts-node

# 2. Setup API
mkdir -p apps/api/src apps/api/prisma
cd apps/api
pnpm init
pnpm add express prisma @prisma/client bullmq ioredis axios bottleneck cors dotenv
pnpm add -D @types/express @types/node @types/cors typescript ts-node nodemon

# 3. Init Prisma
npx prisma init
# Paste schema from above into prisma/schema.prisma
npx prisma migrate dev --name init
npx prisma generate

# 4. Setup Web
cd ../../
pnpm create vite apps/web --template react-ts
cd apps/web
pnpm add axios react-query @tanstack/react-query
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 5. Copy .env.example to .env and fill in your Riot API key

# 6. Start Redis + Postgres (Docker)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=lolstats postgres:15
docker run -d -p 6379:6379 redis:7

# 7. Seed and crawl
npx ts-node src/workers/crawler.ts   # seeds top players
npx ts-node src/workers/aggregator.ts  # runs after enough matches are ingested

# 8. Start API
npx ts-node src/index.ts
```

---

## Key API Endpoints Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/champions` | Tier list, sortable by winRate/pickRate/banRate |
| GET | `/api/champions/:id` | Full champion data (stats + builds + matchups) |
| GET | `/api/builds/:id?role=TOP&sortBy=winRate` | Builds sorted by any stat |
| GET | `/api/builds/:id?buildType=CORE` | Only core 3-item builds |
| GET | `/api/builds/:id?buildType=RUNE` | Only rune builds |
| GET | `/api/builds/:id?buildType=BOOTS` | Only boots |
| GET | `/api/builds/:id?buildType=STARTER` | Starter items |

---

## Notes on Scaling

- **Dev API key**: ~100 matches/2 min. Enough to test. Apply for production key for real data.
- **Queue IDs**: 420 = Ranked Solo, 440 = Ranked Flex, 450 = ARAM. Filter in all queries.
- **Patch freshness**: Re-run `aggregator.ts` after each patch. Old patch data auto-becomes historical.
- **Minimum sample size**: Set `HAVING COUNT(*) >= 100` for champion stats, `>= 30` for builds. Prevents low-sample garbage data.
- **Skill order**: Requires calling `/lol/match/v5/matches/{matchId}/timeline` separately (extra API call per match). Add this to the ingester once you have a production key.
- **Ban data**: Riot provides ban data in match JSON under `info.teams[].bans[]`. Parse these in the ingester to populate `banRate` in `ChampionStats`.
