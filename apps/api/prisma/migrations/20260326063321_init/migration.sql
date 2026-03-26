-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "queueId" INTEGER NOT NULL,
    "patch" TEXT NOT NULL,
    "gameDuration" INTEGER NOT NULL,
    "gameStartTimestamp" BIGINT NOT NULL,
    "rawJson" JSONB NOT NULL,
    "ingested" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "summonerName" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "championName" TEXT NOT NULL,
    "teamPosition" TEXT NOT NULL,
    "win" BOOLEAN NOT NULL,
    "patch" TEXT NOT NULL,
    "queueId" INTEGER NOT NULL,
    "rankTier" TEXT,
    "item0" INTEGER NOT NULL DEFAULT 0,
    "item1" INTEGER NOT NULL DEFAULT 0,
    "item2" INTEGER NOT NULL DEFAULT 0,
    "item3" INTEGER NOT NULL DEFAULT 0,
    "item4" INTEGER NOT NULL DEFAULT 0,
    "item5" INTEGER NOT NULL DEFAULT 0,
    "item6" INTEGER NOT NULL DEFAULT 0,
    "primaryRune" INTEGER NOT NULL,
    "secondaryRune" INTEGER NOT NULL,
    "perks" JSONB NOT NULL,
    "summoner1Id" INTEGER NOT NULL,
    "summoner2Id" INTEGER NOT NULL,
    "skillOrder" JSONB NOT NULL,
    "kills" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "totalDamageDealtToChampions" INTEGER NOT NULL,
    "totalDamageTaken" INTEGER NOT NULL,
    "goldEarned" INTEGER NOT NULL,
    "totalMinionsKilled" INTEGER NOT NULL,
    "neutralMinionsKilled" INTEGER NOT NULL,
    "visionScore" INTEGER NOT NULL,
    "wardsPlaced" INTEGER NOT NULL,
    "wardsKilled" INTEGER NOT NULL,
    "timePlayed" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChampionStats" (
    "id" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "championName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "patch" TEXT NOT NULL,
    "queueId" INTEGER NOT NULL,
    "rankFilter" TEXT NOT NULL,
    "games" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "winRate" DOUBLE PRECISION NOT NULL,
    "pickRate" DOUBLE PRECISION NOT NULL,
    "banRate" DOUBLE PRECISION NOT NULL,
    "avgKills" DOUBLE PRECISION NOT NULL,
    "avgDeaths" DOUBLE PRECISION NOT NULL,
    "avgAssists" DOUBLE PRECISION NOT NULL,
    "avgDamage" DOUBLE PRECISION NOT NULL,
    "avgGold" DOUBLE PRECISION NOT NULL,
    "avgCs" DOUBLE PRECISION NOT NULL,
    "tier" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChampionStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildStats" (
    "id" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "championName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "patch" TEXT NOT NULL,
    "queueId" INTEGER NOT NULL,
    "buildType" TEXT NOT NULL,
    "items" INTEGER[],
    "games" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "winRate" DOUBLE PRECISION NOT NULL,
    "pickRate" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchupStats" (
    "id" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "opponentId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "patch" TEXT NOT NULL,
    "queueId" INTEGER NOT NULL,
    "games" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "winRate" DOUBLE PRECISION NOT NULL,
    "avgGoldDiff15" DOUBLE PRECISION NOT NULL,
    "avgCsDiff15" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchupStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlSeed" (
    "puuid" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "lastCrawled" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrawlSeed_pkey" PRIMARY KEY ("puuid")
);

-- CreateIndex
CREATE INDEX "Participant_championId_teamPosition_patch_queueId_idx" ON "Participant"("championId", "teamPosition", "patch", "queueId");

-- CreateIndex
CREATE INDEX "Participant_puuid_idx" ON "Participant"("puuid");

-- CreateIndex
CREATE INDEX "Participant_patch_queueId_idx" ON "Participant"("patch", "queueId");

-- CreateIndex
CREATE UNIQUE INDEX "ChampionStats_championId_role_patch_queueId_rankFilter_key" ON "ChampionStats"("championId", "role", "patch", "queueId", "rankFilter");

-- CreateIndex
CREATE INDEX "BuildStats_championId_role_patch_queueId_buildType_idx" ON "BuildStats"("championId", "role", "patch", "queueId", "buildType");

-- CreateIndex
CREATE UNIQUE INDEX "MatchupStats_championId_opponentId_role_patch_queueId_key" ON "MatchupStats"("championId", "opponentId", "role", "patch", "queueId");

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
