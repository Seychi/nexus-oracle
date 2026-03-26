import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  getSummoner,
  getSummonerMatches,
  type SummonerProfile,
  type MatchEntry,
  type RankInfo,
} from '../lib/api';
import {
  profileIcon,
  championIcon,
  resolveChampionIcon,
  itemIcon,
  fetchAllChampions,
  getChampionByKey,
  DDImg,
} from '../lib/dataDragon';

/* ---------- Helpers ---------- */

const QUEUE_NAMES: Record<number, string> = {
  420: 'Ranked Solo',
  440: 'Ranked Flex',
  400: 'Normal Draft',
  430: 'Normal Blind',
  450: 'ARAM',
  700: 'Clash',
  900: 'ARURF',
  1300: 'Nexus Blitz',
  1700: 'Arena',
};

const ROLE_LABELS: Record<string, string> = {
  TOP: 'Top',
  JUNGLE: 'Jungle',
  MIDDLE: 'Mid',
  BOTTOM: 'ADC',
  UTILITY: 'Support',
};

const TIER_COLORS: Record<string, string> = {
  IRON: '#6b5b4f',
  BRONZE: '#8c6239',
  SILVER: '#7c8b98',
  GOLD: '#c8aa6e',
  PLATINUM: '#4e9996',
  EMERALD: '#2d9171',
  DIAMOND: '#576bce',
  MASTER: '#9d48e0',
  GRANDMASTER: '#e34343',
  CHALLENGER: '#f4c874',
};

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function kdaRatio(k: number, d: number, a: number): string {
  if (d === 0) return 'Perfect';
  return ((k + a) / d).toFixed(2);
}

function kdaColor(k: number, d: number, a: number): string {
  const ratio = d === 0 ? 99 : (k + a) / d;
  if (ratio >= 5) return 'text-lol-gold';
  if (ratio >= 3) return 'text-emerald-400';
  if (ratio >= 2) return 'text-lol-blue';
  return 'text-lol-dim';
}

function resolveChampIcon(championName: string, championId: number): string {
  const byKey = getChampionByKey(championId);
  if (byKey) return championIcon(byKey.id);
  return resolveChampionIcon(championName);
}

/* ---------- Computed stats from matches ---------- */

interface ComputedStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgCs: number;
  topChampions: {
    championName: string;
    championId: number;
    games: number;
    wins: number;
    winRate: number;
    avgKda: number;
  }[];
}

function computeStatsFromMatches(matches: MatchEntry[]): ComputedStats {
  if (matches.length === 0) {
    return {
      totalGames: 0, wins: 0, losses: 0, winRate: 0,
      avgKills: 0, avgDeaths: 0, avgAssists: 0, avgCs: 0,
      topChampions: [],
    };
  }

  const wins = matches.filter((m) => m.win).length;
  const totalK = matches.reduce((s, m) => s + m.kills, 0);
  const totalD = matches.reduce((s, m) => s + m.deaths, 0);
  const totalA = matches.reduce((s, m) => s + m.assists, 0);
  const totalCs = matches.reduce((s, m) => s + m.cs, 0);

  const champMap = new Map<number, { name: string; id: number; games: number; wins: number; kills: number; deaths: number; assists: number }>();
  for (const m of matches) {
    const existing = champMap.get(m.championId) || { name: m.championName, id: m.championId, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
    existing.games++;
    if (m.win) existing.wins++;
    existing.kills += m.kills;
    existing.deaths += m.deaths;
    existing.assists += m.assists;
    champMap.set(m.championId, existing);
  }

  const topChampions = [...champMap.values()]
    .sort((a, b) => b.games - a.games)
    .slice(0, 10)
    .map((c) => ({
      championName: c.name,
      championId: c.id,
      games: c.games,
      wins: c.wins,
      winRate: c.games > 0 ? (c.wins / c.games) * 100 : 0,
      avgKda: c.deaths > 0 ? (c.kills + c.assists) / c.deaths : (c.kills + c.assists),
    }));

  return {
    totalGames: matches.length,
    wins,
    losses: matches.length - wins,
    winRate: (wins / matches.length) * 100,
    avgKills: totalK / matches.length,
    avgDeaths: totalD / matches.length,
    avgAssists: totalA / matches.length,
    avgCs: totalCs / matches.length,
    topChampions,
  };
}

/* ---------- Component ---------- */

export default function SummonerPage() {
  const { gameName, tagLine } = useParams<{ gameName: string; tagLine: string }>();

  const [profile, setProfile] = useState<SummonerProfile | null>(null);
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameName || !tagLine) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setProfile(null);
    setMatches([]);

    (async () => {
      await fetchAllChampions().catch(() => []);

      try {
        const profileData = await getSummoner(gameName, tagLine);
        if (cancelled) return;
        setProfile(profileData);
        setLoading(false);

        // Fetch matches (may take a while if fetching from Riot API)
        setLoadingMatches(true);
        const matchData = await getSummonerMatches(profileData.puuid);
        if (cancelled) return;
        setMatches(matchData.matches);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load summoner');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMatches(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [gameName, tagLine]);

  const stats = useMemo(() => computeStatsFromMatches(matches), [matches]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-lol-gold/30 border-t-lol-gold rounded-full animate-spin" />
          <p className="text-sm text-lol-dim">Looking up summoner...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="card p-8 text-center max-w-lg mx-auto mt-12">
        <p className="text-red-400 font-semibold text-lg mb-2">Summoner not found</p>
        <p className="text-sm text-lol-dim">{error || 'Could not find this summoner.'}</p>
        <p className="text-xs text-lol-dim/50 mt-3">
          Make sure the format is correct: Name#Tag (e.g., Faker#KR1)
        </p>
      </div>
    );
  }

  const soloRank = profile.ranks.find((r) => r.queueType === 'RANKED_SOLO_5x5');
  const flexRank = profile.ranks.find((r) => r.queueType === 'RANKED_FLEX_SR');

  return (
    <div className="space-y-4">
      {/* ==================== PROFILE HEADER ==================== */}
      <div className="card p-5">
        <div className="flex items-start gap-5 flex-wrap">
          {/* Profile icon */}
          <div className="relative">
            <DDImg
              src={profileIcon(profile.profileIconId)}
              alt="Profile"
              className="w-20 h-20 rounded-xl border-2 border-lol-gold/40"
            />
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-lol-dark border border-lol-gold/40 text-lol-gold text-[10px] font-bold px-2 py-0.5 rounded-full">
              {profile.summonerLevel}
            </span>
          </div>

          {/* Name + tag */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-lol-text">
              {profile.gameName}
              <span className="text-lol-dim font-normal text-lg ml-1">#{profile.tagLine}</span>
            </h1>

            {stats.totalGames > 0 && (
              <p className="text-sm text-lol-dim mt-1">
                Last {stats.totalGames} games:&nbsp;
                <span className="text-emerald-400 font-semibold">{stats.wins}W</span>
                &nbsp;-&nbsp;
                <span className="text-red-400 font-semibold">{stats.losses}L</span>
                &nbsp;
                <span className="text-lol-text">({stats.winRate.toFixed(0)}%)</span>
              </p>
            )}
          </div>

          {/* Rank badges */}
          <div className="flex gap-3 flex-wrap">
            <RankCard rank={soloRank} label="Solo/Duo" />
            <RankCard rank={flexRank} label="Flex" />
          </div>
        </div>
      </div>

      {/* ==================== STATS + CHAMPIONS ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Performance overview */}
        <div className="card p-4">
          <h3 className="text-xs font-bold text-lol-dim uppercase tracking-wider mb-3">
            Recent Performance
          </h3>
          {stats.totalGames > 0 ? (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-lol-dim">Win Rate</span>
                  <span className={`font-semibold ${stats.winRate >= 55 ? 'text-emerald-400' : stats.winRate <= 45 ? 'text-red-400' : 'text-lol-text'}`}>
                    {stats.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 rounded-full overflow-hidden flex">
                  <div className="bg-[#3cbc8d] transition-all" style={{ width: `${stats.winRate}%` }} />
                  <div className="bg-[#e9422e] flex-1" />
                </div>
                <div className="flex justify-between text-[10px] text-lol-dim/60 mt-0.5">
                  <span>{stats.wins}W</span>
                  <span>{stats.losses}L</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-lol-dim">Avg KDA</span>
                <span className={`text-sm font-bold ${kdaColor(stats.avgKills, stats.avgDeaths, stats.avgAssists)}`}>
                  {stats.avgKills.toFixed(1)} / {stats.avgDeaths.toFixed(1)} / {stats.avgAssists.toFixed(1)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-lol-dim">Avg CS</span>
                <span className="text-sm font-semibold text-lol-text">{stats.avgCs.toFixed(0)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-lol-dim/50 text-center py-4">No recent data</p>
          )}
        </div>

        {/* Top Champions */}
        <div className="card p-4 lg:col-span-2">
          <h3 className="text-xs font-bold text-lol-dim uppercase tracking-wider mb-3">
            Most Played Champions
          </h3>
          {stats.topChampions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {stats.topChampions.slice(0, 6).map((c) => (
                <div key={c.championId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                  <DDImg
                    src={resolveChampIcon(c.championName, c.championId)}
                    alt={c.championName}
                    className="w-9 h-9 rounded-lg border border-white/10"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-lol-text truncate">{c.championName}</p>
                    <p className="text-[11px] text-lol-dim">{c.games} games</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${c.winRate >= 55 ? 'text-emerald-400' : c.winRate <= 45 ? 'text-red-400' : 'text-lol-text'}`}>
                      {c.winRate.toFixed(0)}%
                    </p>
                    <p className={`text-[11px] ${kdaColor(c.avgKda, 1, 0)}`}>
                      {c.avgKda.toFixed(2)} KDA
                    </p>
                  </div>
                  <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden shrink-0">
                    <div
                      className={`h-full rounded-full ${c.winRate >= 50 ? 'bg-[#3cbc8d]' : 'bg-[#e9422e]'}`}
                      style={{ width: `${c.winRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-lol-dim/50 text-center py-4">No champion data</p>
          )}
        </div>
      </div>

      {/* ==================== MATCH HISTORY ==================== */}
      <div>
        <h2 className="text-lg font-bold text-lol-text mb-3 flex items-center gap-2">
          <span className="w-1 h-5 bg-lol-gold rounded-full" />
          Match History
          {loadingMatches && (
            <span className="ml-2 w-4 h-4 border-2 border-lol-gold/30 border-t-lol-gold rounded-full animate-spin" />
          )}
        </h2>

        {matches.length === 0 && !loadingMatches && (
          <div className="card p-8 text-center">
            <p className="text-lol-dim">No recent matches found.</p>
            <p className="text-xs text-lol-dim/50 mt-1">
              Match history may take a moment to load from the Riot API.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {matches.map((match) => (
            <MatchCard key={match.matchId} match={match} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Rank Card ---------- */

function RankCard({ rank, label }: { rank: RankInfo | undefined; label: string }) {
  if (!rank) {
    return (
      <div className="bg-lol-dark/50 border border-white/5 rounded-lg px-4 py-3 text-center min-w-[140px]">
        <p className="text-[10px] text-lol-dim/60 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-sm text-lol-dim">Unranked</p>
      </div>
    );
  }

  const tierColor = TIER_COLORS[rank.tier] || '#6b7280';
  const wr = rank.winRate > 1 ? rank.winRate : rank.winRate * 100;

  return (
    <div
      className="border rounded-lg px-4 py-3 text-center min-w-[140px]"
      style={{ borderColor: tierColor + '40', backgroundColor: tierColor + '08' }}
    >
      <p className="text-[10px] text-lol-dim/60 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-base font-extrabold" style={{ color: tierColor }}>
        {rank.tier} {rank.division}
      </p>
      <p className="text-sm text-lol-text font-semibold">{rank.lp} LP</p>
      <p className="text-[11px] text-lol-dim mt-0.5">
        {rank.wins}W {rank.losses}L
        <span className="ml-1 text-lol-dim/60">({wr.toFixed(0)}%)</span>
      </p>
      {rank.hotStreak && (
        <span className="inline-block mt-1 text-[10px] text-orange-400 font-semibold">
          Hot Streak
        </span>
      )}
    </div>
  );
}

/* ---------- Match Card ---------- */

function MatchCard({ match }: { match: MatchEntry }) {
  const queueName = match.queueId ? (QUEUE_NAMES[match.queueId] || match.gameMode) : match.gameMode;
  const csPerMin = match.gameDuration > 0 ? (match.cs / (match.gameDuration / 60)).toFixed(1) : '0';
  const kda = kdaRatio(match.kills, match.deaths, match.assists);
  const kdaCol = kdaColor(match.kills, match.deaths, match.assists);

  return (
    <div
      className={`card flex items-stretch overflow-hidden transition-colors hover:bg-white/[0.02] ${
        match.win ? 'border-l-[3px] border-l-[#3cbc8d]' : 'border-l-[3px] border-l-[#e9422e]'
      }`}
    >
      {/* Win/Loss */}
      <div className={`w-14 shrink-0 flex flex-col items-center justify-center py-3 ${
        match.win ? 'bg-[#3cbc8d]/5' : 'bg-[#e9422e]/5'
      }`}>
        <span className={`text-xs font-extrabold ${match.win ? 'text-[#3cbc8d]' : 'text-[#e9422e]'}`}>
          {match.win ? 'WIN' : 'LOSS'}
        </span>
        <span className="text-[10px] text-lol-dim/50 mt-0.5">
          {formatDuration(match.gameDuration)}
        </span>
      </div>

      {/* Champion */}
      <div className="flex items-center gap-3 px-3 py-2.5 shrink-0">
        <DDImg
          src={resolveChampIcon(match.championName, match.championId)}
          alt={match.championName}
          className="w-10 h-10 rounded-lg border border-white/10"
        />
        <div className="w-20">
          <p className="text-xs font-semibold text-lol-text truncate">{match.championName}</p>
          <p className="text-[10px] text-lol-dim/60">
            {ROLE_LABELS[match.role] || match.role || ''}
          </p>
        </div>
      </div>

      {/* KDA */}
      <div className="flex flex-col justify-center px-3 py-2.5 min-w-[100px]">
        <p className="text-sm font-semibold text-lol-text">
          {match.kills} / <span className="text-red-400">{match.deaths}</span> / {match.assists}
        </p>
        <p className={`text-xs font-semibold ${kdaCol}`}>
          {kda} KDA
        </p>
      </div>

      {/* CS + Vision */}
      <div className="hidden sm:flex flex-col justify-center px-3 py-2.5 min-w-[80px]">
        <p className="text-xs text-lol-text font-medium">
          {match.cs} CS <span className="text-lol-dim/60">({csPerMin}/m)</span>
        </p>
        {match.visionScore !== undefined && (
          <p className="text-[10px] text-lol-dim">
            {match.visionScore} vision
          </p>
        )}
      </div>

      {/* Items */}
      <div className="hidden md:flex items-center gap-0.5 px-3 py-2.5 shrink-0">
        {match.items.slice(0, 7).map((id, idx) => (
          <div key={idx}>
            {id > 0 ? (
              <DDImg
                src={itemIcon(id)}
                alt={`Item ${id}`}
                className="w-6 h-6 rounded border border-white/10"
              />
            ) : (
              <div className="w-6 h-6 rounded border border-white/5 bg-lol-dark" />
            )}
          </div>
        ))}
      </div>

      {/* Spacer + metadata */}
      <div className="flex-1" />
      <div className="flex flex-col items-end justify-center px-3 py-2.5 shrink-0">
        <p className="text-[10px] text-lol-dim/60">{queueName}</p>
        <p className="text-[10px] text-lol-dim/40">{timeAgo(match.gameCreation)}</p>
        {match.goldEarned !== undefined && (
          <p className="text-[10px] text-lol-gold/50 mt-0.5">
            {(match.goldEarned / 1000).toFixed(1)}k gold
          </p>
        )}
      </div>
    </div>
  );
}
