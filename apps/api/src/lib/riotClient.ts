import Bottleneck from 'bottleneck';

const RIOT_API_KEY = process.env.RIOT_API_KEY || '';
const REGIONAL_BASE = process.env.RIOT_REGIONAL_BASE || 'https://americas.api.riotgames.com';
const PLATFORM_BASE = process.env.RIOT_PLATFORM_BASE || 'https://na1.api.riotgames.com';

// Dev key limits: 20 req/s AND 100 req/2min
// The 2-min limit is the binding constraint, so throttle to ~0.8 req/s
const limiter = new Bottleneck({
  reservoir: 100,
  reservoirRefreshAmount: 100,
  reservoirRefreshInterval: 120_000, // 100 per 2 minutes
  maxConcurrent: 1,
  minTime: 1250, // ~0.8 req/s to stay safe
});

interface RiotApiError {
  status: number;
  message: string;
}

async function riotFetch<T>(url: string, retries = 3): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, {
      headers: {
        'X-Riot-Token': RIOT_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      return response.json() as Promise<T>;
    }

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('Retry-After') || 15);
      console.warn(`[RiotClient] Rate limited. Waiting ${retryAfter}s (attempt ${attempt + 1}/${retries + 1})`);
      await new Promise((r) => setTimeout(r, retryAfter * 1000 + 500));
      continue;
    }

    if (response.status === 503 || response.status === 500) {
      console.warn(`[RiotClient] Server error ${response.status}, retrying in 5s`);
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }

    throw Object.assign(
      new Error(`Riot API error: ${response.status} ${response.statusText} for ${url}`),
      { status: response.status }
    );
  }

  throw Object.assign(new Error(`Riot API: max retries exceeded for ${url}`), { status: 429 });
}

function regionalFetch<T>(path: string): Promise<T> {
  return limiter.schedule(() => riotFetch<T>(`${REGIONAL_BASE}${path}`));
}

function platformFetch<T>(path: string): Promise<T> {
  return limiter.schedule(() => riotFetch<T>(`${PLATFORM_BASE}${path}`));
}

export interface AccountDto {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface SummonerDto {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

export interface LeagueEntryDto {
  leagueId: string;
  summonerId: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
}

export interface ChallengerLeagueDto {
  tier: string;
  leagueId: string;
  queue: string;
  entries: Array<{
    summonerId: string;
    leaguePoints: number;
    rank: string;
    wins: number;
    losses: number;
    veteran: boolean;
    inactive: boolean;
    freshBlood: boolean;
    hotStreak: boolean;
  }>;
}

export interface MatchDto {
  metadata: {
    dataVersion: string;
    matchId: string;
    participants: string[];
  };
  info: {
    endOfGameResult: string;
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp: number;
    gameId: number;
    gameMode: string;
    gameName: string;
    gameStartTimestamp: number;
    gameType: string;
    gameVersion: string;
    mapId: number;
    participants: Array<MatchParticipantDto>;
    platformId: string;
    queueId: number;
    teams: Array<{
      bans: Array<{ championId: number; pickTurn: number }>;
      objectives: Record<string, { first: boolean; kills: number }>;
      teamId: number;
      win: boolean;
    }>;
    tournamentCode: string;
  };
}

export interface MatchParticipantDto {
  puuid: string;
  summonerName: string;
  riotIdGameName: string;
  riotIdTagline: string;
  championId: number;
  championName: string;
  teamPosition: string;
  individualPosition: string;
  teamId: number;
  win: boolean;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  perks: {
    statPerks: { defense: number; flex: number; offense: number };
    styles: Array<{
      description: string;
      selections: Array<{ perk: number; var1: number; var2: number; var3: number }>;
      style: number;
    }>;
  };
  summoner1Id: number;
  summoner2Id: number;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  goldEarned: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  visionScore: number;
  wardsPlaced: number;
  wardsKilled: number;
  timePlayed: number;
  skillOrder?: number[];
}

export interface CurrentGameInfo {
  gameId: number;
  gameType: string;
  gameStartTime: number;
  mapId: number;
  gameLength: number;
  platformId: string;
  gameMode: string;
  bannedChampions: Array<{ championId: number; teamId: number; pickTurn: number }>;
  gameQueueConfigId: number;
  participants: Array<{
    championId: number;
    perks: { perkIds: number[]; perkStyle: number; perkSubStyle: number };
    profileIconId: number;
    bot: boolean;
    teamId: number;
    summonerName: string;
    summonerId: string;
    puuid: string;
    spell1Id: number;
    spell2Id: number;
  }>;
}

export const riotClient = {
  getAccountByRiotId(gameName: string, tagLine: string): Promise<AccountDto> {
    return regionalFetch<AccountDto>(
      `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    );
  },

  getSummonerByPuuid(puuid: string): Promise<SummonerDto> {
    return platformFetch<SummonerDto>(
      `/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`
    );
  },

  getLeagueEntries(summonerOrPuuid: string): Promise<LeagueEntryDto[]> {
    // Riot deprecated summoner-id based lookup; use puuid if it looks like one
    const isPuuid = summonerOrPuuid.length > 40;
    const path = isPuuid
      ? `/lol/league/v4/entries/by-puuid/${encodeURIComponent(summonerOrPuuid)}`
      : `/lol/league/v4/entries/by-summoner/${encodeURIComponent(summonerOrPuuid)}`;
    return platformFetch<LeagueEntryDto[]>(path);
  },

  getChallengerLeague(queue: string = 'RANKED_SOLO_5x5'): Promise<ChallengerLeagueDto> {
    return platformFetch<ChallengerLeagueDto>(
      `/lol/league/v4/challengerleagues/by-queue/${encodeURIComponent(queue)}`
    );
  },

  getMatchIdsByPuuid(
    puuid: string,
    params: { queue?: number; start?: number; count?: number; startTime?: number } = {}
  ): Promise<string[]> {
    const searchParams = new URLSearchParams();
    if (params.queue !== undefined) searchParams.set('queue', String(params.queue));
    if (params.start !== undefined) searchParams.set('start', String(params.start));
    if (params.count !== undefined) searchParams.set('count', String(params.count));
    if (params.startTime !== undefined) searchParams.set('startTime', String(params.startTime));

    const qs = searchParams.toString();
    return regionalFetch<string[]>(
      `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids${qs ? `?${qs}` : ''}`
    );
  },

  getMatch(matchId: string): Promise<MatchDto> {
    return regionalFetch<MatchDto>(
      `/lol/match/v5/matches/${encodeURIComponent(matchId)}`
    );
  },

  getLiveGame(puuid: string): Promise<CurrentGameInfo> {
    return platformFetch<CurrentGameInfo>(
      `/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(puuid)}`
    );
  },
};
