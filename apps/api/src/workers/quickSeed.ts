import 'dotenv/config';
import { prisma } from '../lib/db.js';
import { riotClient, type MatchDto, type MatchParticipantDto } from '../lib/riotClient.js';

function extractPatch(gameVersion: string): string {
  const parts = gameVersion.split('.');
  return `${parts[0]}.${parts[1]}`;
}

function extractPrimaryRune(p: MatchParticipantDto): number {
  if (p.perks?.styles?.length > 0) {
    const primary = p.perks.styles.find((s) => s.description === 'primaryStyle');
    if (primary?.selections?.[0]) return primary.selections[0].perk;
    return p.perks.styles[0].style;
  }
  return 0;
}

function extractSecondaryRune(p: MatchParticipantDto): number {
  if (p.perks?.styles?.length > 1) {
    const secondary = p.perks.styles.find((s) => s.description === 'subStyle');
    if (secondary) return secondary.style;
    return p.perks.styles[1].style;
  }
  return 0;
}

async function ingestMatch(matchId: string): Promise<boolean> {
  try {
    const exists = await prisma.match.findUnique({ where: { id: matchId }, select: { id: true } });
    if (exists) return false;

    const matchData = await riotClient.getMatch(matchId);
    const { info, metadata } = matchData;
    if (!info?.participants?.length || info.gameDuration < 300) return false;

    const patch = extractPatch(info.gameVersion);

    await prisma.match.create({
      data: {
        id: metadata.matchId,
        queueId: info.queueId,
        patch,
        gameDuration: info.gameDuration,
        gameStartTimestamp: BigInt(info.gameStartTimestamp),
        rawJson: matchData as unknown as object,
        ingested: true,
      },
    });

    await prisma.participant.createMany({
      data: info.participants.map((p: MatchParticipantDto) => ({
        matchId: metadata.matchId,
        puuid: p.puuid,
        summonerName: p.riotIdGameName || p.summonerName || 'Unknown',
        championId: p.championId,
        championName: p.championName,
        teamPosition: p.teamPosition || p.individualPosition || 'UNKNOWN',
        win: p.win,
        patch,
        queueId: info.queueId,
        item0: p.item0 || 0, item1: p.item1 || 0, item2: p.item2 || 0,
        item3: p.item3 || 0, item4: p.item4 || 0, item5: p.item5 || 0, item6: p.item6 || 0,
        primaryRune: extractPrimaryRune(p),
        secondaryRune: extractSecondaryRune(p),
        perks: p.perks as object,
        summoner1Id: p.summoner1Id || 0,
        summoner2Id: p.summoner2Id || 0,
        skillOrder: [],
        kills: p.kills || 0, deaths: p.deaths || 0, assists: p.assists || 0,
        totalDamageDealtToChampions: p.totalDamageDealtToChampions || 0,
        totalDamageTaken: p.totalDamageTaken || 0,
        goldEarned: p.goldEarned || 0,
        totalMinionsKilled: p.totalMinionsKilled || 0,
        neutralMinionsKilled: p.neutralMinionsKilled || 0,
        visionScore: p.visionScore || 0,
        wardsPlaced: p.wardsPlaced || 0,
        wardsKilled: p.wardsKilled || 0,
        timePlayed: p.timePlayed || info.gameDuration,
      })),
    });
    return true;
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 404) return false;
    if (e.status === 429) {
      console.log('  Rate limited, waiting 15s...');
      await new Promise((r) => setTimeout(r, 15000));
      return ingestMatch(matchId); // retry
    }
    console.error(`  Error: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('[QuickSeed] Fetching Challenger ladder...');
  const challenger = await riotClient.getChallengerLeague('RANKED_SOLO_5x5');
  const players = challenger.entries
    .sort((a, b) => b.leaguePoints - a.leaguePoints)
    .slice(0, 50) // top 50 players for speed
    .map((e) => (e as unknown as { puuid: string }).puuid)
    .filter(Boolean);

  console.log(`[QuickSeed] Fetching matches from ${players.length} top Challenger players...`);

  let totalIngested = 0;
  const seenMatches = new Set<string>();

  for (let i = 0; i < players.length; i++) {
    const puuid = players[i];
    console.log(`[QuickSeed] Player ${i + 1}/${players.length} (${puuid.slice(0, 8)}...)`);

    try {
      const matchIds = await riotClient.getMatchIdsByPuuid(puuid, { queue: 420, count: 20 });

      for (const matchId of matchIds) {
        if (seenMatches.has(matchId)) continue;
        seenMatches.add(matchId);

        const ingested = await ingestMatch(matchId);
        if (ingested) {
          totalIngested++;
          if (totalIngested % 10 === 0) {
            console.log(`  [${totalIngested} matches ingested]`);
          }
        }
      }
    } catch (err) {
      console.error(`  Error fetching matches: ${(err as Error).message}`);
    }
  }

  console.log(`\n[QuickSeed] Done! Ingested ${totalIngested} matches (${totalIngested * 10} participants)`);

  // Run aggregation
  console.log('[QuickSeed] Running aggregation...');
  const { aggregateChampionStats } = await import('../aggregations/championStats.js');
  await aggregateChampionStats();
  console.log('[QuickSeed] Aggregation complete!');

  await prisma.$disconnect();
  process.exit(0);
}

main();
