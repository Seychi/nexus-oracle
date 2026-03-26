// In dev, Vite proxy handles /api → localhost:3001
// In prod, VITE_API_URL points to the deployed API
const API_ORIGIN = import.meta.env.VITE_API_URL || '';
const BASE = `${API_ORIGIN}/api`;

interface FetchOptions {
  params?: Record<string, string | undefined>;
}

async function fetchJSON<T>(path: string, opts?: FetchOptions): Promise<T> {
  const base = API_ORIGIN || window.location.origin;
  const url = new URL(path, base);
  if (opts?.params) {
    Object.entries(opts.params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    });
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(
      `API error ${res.status}: ${res.statusText}${errorBody ? ` — ${errorBody}` : ''}`,
    );
  }
  return res.json() as Promise<T>;
}

/* ---------- Champions / Tier List ---------- */

export interface ChampionListItem {
  championId: string;
  championName: string;
  role: string;
  tier: string;
  winRate: number;
  pickRate: number;
  banRate: number;
  avgKda: number;
  games: number;
}

export interface ChampionsResponse {
  patch: string;
  role: string;
  champions: ChampionListItem[];
}

export function getChampions(params?: {
  role?: string;
  sort?: string;
  order?: string;
  patch?: string;
}): Promise<ChampionsResponse> {
  return fetchJSON(`${BASE}/champions`, { params });
}

/* ---------- Single Champion ---------- */

export interface ChampionAbility {
  key: string;
  name: string;
  description: string;
  maxRank: number;
}

export interface ChampionDetail {
  championId: string;
  championName: string;
  role: string;
  tier: string;
  winRate: number;
  pickRate: number;
  banRate: number;
  avgKda: number;
  games: number;
  roles: string[];
  abilities?: ChampionAbility[];
  stats?: Record<string, number>;
}

export interface ChampionResponse {
  patch: string;
  champion: ChampionDetail;
}

export function getChampion(
  championId: string,
  role?: string,
  patch?: string,
): Promise<ChampionResponse> {
  return fetchJSON(`${BASE}/champions/${championId}`, {
    params: { role, patch },
  });
}

/* ---------- Builds ---------- */

export interface BuildItem {
  itemId: number;
  itemName: string;
  order: number;
}

export interface Build {
  buildId: string;
  type: string;
  items: BuildItem[];
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
}

export interface RuneSlot {
  runeId: number;
  runeName: string;
  slot: number;
}

export interface RuneBuild {
  buildId: string;
  primaryTree: string;
  secondaryTree: string;
  runes: RuneSlot[];
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
}

export interface BuildsResponse {
  patch: string;
  championId: string;
  role: string;
  coreItems: Build[];
  boots: Build[];
  starterItems: Build[];
  runes: RuneBuild[];
}

export function getBuilds(
  championId: string,
  role?: string,
  sortBy?: string,
  buildType?: string,
  patch?: string,
): Promise<BuildsResponse> {
  return fetchJSON(`${BASE}/builds/${championId}`, {
    params: { role, sortBy, buildType, patch },
  });
}

/* ---------- Matchups ---------- */

export interface Matchup {
  opponentId: string;
  opponentName: string;
  games: number;
  wins: number;
  winRate: number;
  goldDiffAt15: number;
}

export interface MatchupsResponse {
  patch: string;
  championId: string;
  role: string;
  matchups: Matchup[];
}

export function getMatchups(
  championId: string,
  role?: string,
  patch?: string,
): Promise<MatchupsResponse> {
  return fetchJSON(`${BASE}/matchups/${championId}`, {
    params: { role, patch },
  });
}

/* ---------- Summoner ---------- */

export interface RankInfo {
  tier: string;
  division: string;
  lp: number;
  wins: number;
  losses: number;
  queueType: string;
}

export interface SummonerProfile {
  puuid: string;
  gameName: string;
  tagLine: string;
  summonerLevel: number;
  profileIconId: number;
  ranks: RankInfo[];
}

export function getSummoner(
  gameName: string,
  tagLine: string,
): Promise<SummonerProfile> {
  return fetchJSON(
    `${BASE}/summoner/by-name/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
  );
}

/* ---------- Summoner Matches ---------- */

export interface MatchParticipant {
  championId: string;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  items: number[];
  win: boolean;
}

export interface MatchEntry {
  matchId: string;
  gameMode: string;
  gameDuration: number;
  champion: string;
  championId: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  items: number[];
  win: boolean;
  role: string;
  gameCreation: number;
  participants?: MatchParticipant[];
}

export interface MatchesResponse {
  puuid: string;
  matches: MatchEntry[];
}

export function getSummonerMatches(puuid: string): Promise<MatchesResponse> {
  return fetchJSON(`${BASE}/summoner/${puuid}/matches`);
}

/* ---------- Summoner Stats ---------- */

export interface ChampionStat {
  championId: string;
  championName: string;
  games: number;
  wins: number;
  winRate: number;
  avgKda: number;
  avgCs: number;
}

export interface SummonerStatsResponse {
  puuid: string;
  stats: ChampionStat[];
}

export function getSummonerStats(
  puuid: string,
): Promise<SummonerStatsResponse> {
  return fetchJSON(`${BASE}/summoner/${puuid}/stats`);
}
