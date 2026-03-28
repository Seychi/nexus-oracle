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

export async function getChampions(params?: {
  role?: string;
  sort?: string;
  order?: string;
  patch?: string;
}): Promise<ChampionsResponse> {
  // The API returns { data: ChampionStats[], cached: boolean }
  // We need to map it to { patch, role, champions: ChampionListItem[] }
  const raw = await fetchJSON<{ data?: any[]; champions?: ChampionListItem[]; cached?: boolean }>(
    `${BASE}/champions`,
    { params },
  );

  // If the API already returns the expected format, use it directly
  if (raw.champions) return raw as ChampionsResponse;

  // Map the API's { data: [...] } format to the frontend format
  const rows = raw.data || [];
  const champions: ChampionListItem[] = rows.map((s: any) => ({
    championId: String(s.championId),
    championName: s.championName || '',
    role: s.role || '',
    tier: s.tier || 'B',
    winRate: s.winRate ?? 0,
    pickRate: s.pickRate ?? 0,
    banRate: s.banRate ?? 0,
    avgKda:
      s.avgKda ??
      (s.avgDeaths ? (s.avgKills + s.avgAssists) / Math.max(s.avgDeaths, 1) : 0),
    games: s.games ?? 0,
  }));

  return {
    patch: params?.patch || '14.24',
    role: params?.role || 'all',
    champions,
  };
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
  winRate: number;
  queueType: string;
  hotStreak?: boolean;
}

export interface SummonerProfile {
  puuid: string;
  gameName: string;
  tagLine: string;
  summonerLevel: number;
  profileIconId: number;
  ranks: RankInfo[];
}

export async function getSummoner(
  gameName: string,
  tagLine: string,
): Promise<SummonerProfile> {
  const raw = await fetchJSON<{ data: any }>(
    `${BASE}/summoner/by-name/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
  );

  const d = raw.data || raw;

  // Map rankedSolo/rankedFlex into a ranks array
  const ranks: RankInfo[] = [];
  if (d.rankedSolo) {
    ranks.push({
      tier: d.rankedSolo.tier,
      division: d.rankedSolo.rank,
      lp: d.rankedSolo.leaguePoints,
      wins: d.rankedSolo.wins,
      losses: d.rankedSolo.losses,
      winRate: d.rankedSolo.winRate,
      queueType: 'RANKED_SOLO_5x5',
      hotStreak: d.rankedSolo.hotStreak,
    });
  }
  if (d.rankedFlex) {
    ranks.push({
      tier: d.rankedFlex.tier,
      division: d.rankedFlex.rank,
      lp: d.rankedFlex.leaguePoints,
      wins: d.rankedFlex.wins,
      losses: d.rankedFlex.losses,
      winRate: d.rankedFlex.winRate,
      queueType: 'RANKED_FLEX_SR',
    });
  }

  return {
    puuid: d.puuid,
    gameName: d.gameName,
    tagLine: d.tagLine,
    summonerLevel: d.summonerLevel,
    profileIconId: d.profileIconId,
    ranks,
  };
}

/* ---------- Summoner Matches ---------- */

export interface MatchParticipant {
  puuid?: string;
  summonerName?: string;
  championId: number;
  championName: string;
  teamPosition?: string;
  teamId?: number;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  items?: number[];
  totalMinionsKilled?: number;
  neutralMinionsKilled?: number;
}

export interface MatchEntry {
  matchId: string;
  gameMode: string;
  gameDuration: number;
  championName: string;
  championId: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  items: number[];
  win: boolean;
  role: string;
  gameCreation: number;
  visionScore?: number;
  totalDamageDealtToChampions?: number;
  goldEarned?: number;
  queueId?: number;
  participants?: MatchParticipant[];
}

export interface MatchesResponse {
  matches: MatchEntry[];
  total: number;
}

export async function getSummonerMatches(puuid: string): Promise<MatchesResponse> {
  const raw = await fetchJSON<{ data: any[]; total?: number }>(
    `${BASE}/summoner/${puuid}/matches`,
  );

  const rows = raw.data || [];
  const matches: MatchEntry[] = rows.map((m: any) => ({
    matchId: m.matchId,
    gameMode: m.gameMode || 'CLASSIC',
    gameDuration: m.gameDuration,
    championName: m.championName,
    championId: m.championId,
    kills: m.kills,
    deaths: m.deaths,
    assists: m.assists,
    cs: (m.totalMinionsKilled || 0) + (m.neutralMinionsKilled || 0),
    items: m.items || [],
    win: m.win,
    role: m.teamPosition || '',
    gameCreation: Number(m.gameStartTimestamp) || 0,
    visionScore: m.visionScore,
    totalDamageDealtToChampions: m.totalDamageDealtToChampions,
    goldEarned: m.goldEarned,
    queueId: m.queueId,
    participants: m.participants,
  }));

  return { matches, total: raw.total || matches.length };
}

/* ---------- All Matches ---------- */

export interface MatchTeamParticipant {
  summonerName: string;
  championId: number;
  championName: string;
  teamPosition: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions: number;
  goldEarned: number;
  cs: number;
  visionScore: number;
  items: number[];
  puuid?: string;
  totalDamageTaken?: number;
  wardsPlaced?: number;
  wardsKilled?: number;
  primaryRune?: number;
  secondaryRune?: number;
  summoner1Id?: number;
  summoner2Id?: number;
}

export interface FullMatch {
  matchId: string;
  queueId: number;
  patch: string;
  gameDuration: number;
  gameStartTimestamp: number;
  blueTeam: MatchTeamParticipant[];
  redTeam: MatchTeamParticipant[];
  blueWin: boolean;
}

export interface FullMatchesResponse {
  data: FullMatch[];
  total: number;
  limit: number;
  offset: number;
}

export async function getMatches(params?: {
  limit?: string;
  offset?: string;
  champion?: string;
  role?: string;
  queue?: string;
  patch?: string;
  sort?: string;
}): Promise<FullMatchesResponse> {
  return fetchJSON<FullMatchesResponse>(`${BASE}/matches`, { params });
}

export async function getMatchDetail(matchId: string): Promise<FullMatch> {
  const raw = await fetchJSON<{ data: FullMatch }>(`${BASE}/matches/${matchId}`);
  return raw.data;
}

/* ---------- Summoner Stats ---------- */

export interface ChampionStat {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  winRate: number;
}

export interface SummonerStatsResponse {
  puuid: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgCs: number;
  mostPlayedChampions: ChampionStat[];
}

/* ---------- Leaderboards ---------- */

export interface LeaderboardPlayer {
  puuid: string;
  summonerName: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  kda: number;
  avgDamage: number;
  avgGold: number;
  avgVision: number;
  avgCs: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
}

export interface LeaderboardResponse {
  data: LeaderboardPlayer[];
  total: number;
  metric: string;
}

export async function getLeaderboard(params?: {
  metric?: string;
  role?: string;
  patch?: string;
  queue?: string;
  limit?: string;
  offset?: string;
}): Promise<LeaderboardResponse> {
  return fetchJSON<LeaderboardResponse>(`${BASE}/leaderboards`, { params });
}

/* ---------- Data Studio - Stats ---------- */

export interface StatsOverview {
  totalMatches: number;
  totalParticipants: number;
  uniquePlayers: number;
  avgGameDuration: number;
  winRate: number;
  averages: {
    kills: number;
    deaths: number;
    assists: number;
    damage: number;
    damageTaken: number;
    gold: number;
    cs: number;
    vision: number;
    wardsPlaced: number;
    wardsKilled: number;
    gameDuration: number;
  };
  totals: {
    kills: number;
    deaths: number;
    assists: number;
  };
}

export async function getStatsOverview(params?: {
  patch?: string;
  queue?: string;
  role?: string;
}): Promise<StatsOverview> {
  const raw = await fetchJSON<{ data: StatsOverview }>(`${BASE}/stats/overview`, { params });
  return raw.data;
}

export interface StudioChampionStat {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
  kda: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgDamage: number;
  avgDamageTaken: number;
  avgGold: number;
  avgCs: number;
  avgVision: number;
  avgWardsPlaced: number;
  avgWardsKilled: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  totalDamage: number;
  totalGold: number;
}

export async function getStatsChampions(params?: {
  role?: string;
  patch?: string;
  queue?: string;
  sort?: string;
  order?: string;
}): Promise<{ data: StudioChampionStat[]; total: number }> {
  return fetchJSON(`${BASE}/stats/champions`, { params });
}

export interface RoleStat {
  role: string;
  games: number;
  wins: number;
  winRate: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgDamage: number;
  avgDamageTaken: number;
  avgGold: number;
  avgCs: number;
  avgVision: number;
}

export async function getStatsRoles(params?: {
  patch?: string;
  queue?: string;
}): Promise<{ data: RoleStat[] }> {
  return fetchJSON(`${BASE}/stats/roles`, { params });
}

export interface ItemStat {
  itemId: number;
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
}

export async function getStatsItems(params?: {
  role?: string;
  patch?: string;
  queue?: string;
}): Promise<{ data: ItemStat[]; totalGames: number }> {
  return fetchJSON(`${BASE}/stats/items`, { params });
}

/* ---------- Summoner Stats ---------- */

export async function getSummonerStats(
  puuid: string,
): Promise<SummonerStatsResponse> {
  const raw = await fetchJSON<{ data: any }>(
    `${BASE}/summoner/${puuid}/stats`,
  );

  const d = raw.data || raw;
  return {
    puuid: d.puuid,
    totalGames: d.totalGames || 0,
    wins: d.wins || 0,
    losses: d.losses || 0,
    winRate: d.winRate || 0,
    avgKills: d.avgKills || 0,
    avgDeaths: d.avgDeaths || 0,
    avgAssists: d.avgAssists || 0,
    avgCs: d.avgCs || 0,
    mostPlayedChampions: (d.mostPlayedChampions || []).map((c: any) => ({
      championId: c.championId,
      championName: c.championName,
      games: c.games,
      wins: c.wins,
      winRate: c.winRate,
    })),
  };
}
