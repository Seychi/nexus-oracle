import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getSummoner,
  getSummonerMatches,
  getSummonerStats,
  type SummonerProfile,
  type MatchEntry,
  type ChampionStat,
} from '../lib/api';
import { championIcon, profileIcon, DDImg } from '../lib/dataDragon';
import ItemIcon from '../components/ItemIcon';

const RANK_COLORS: Record<string, string> = {
  IRON: 'text-gray-400',
  BRONZE: 'text-amber-700',
  SILVER: 'text-gray-300',
  GOLD: 'text-yellow-500',
  PLATINUM: 'text-teal-400',
  EMERALD: 'text-emerald-400',
  DIAMOND: 'text-blue-400',
  MASTER: 'text-purple-400',
  GRANDMASTER: 'text-red-400',
  CHALLENGER: 'text-lol-gold',
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatKDA(kills: number, deaths: number, assists: number): string {
  return `${kills}/${deaths}/${assists}`;
}

function kdaRatio(kills: number, deaths: number, assists: number): string {
  if (deaths === 0) return 'Perfect';
  return ((kills + assists) / deaths).toFixed(2);
}

function timeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function SummonerPage() {
  const { gameName, tagLine } = useParams<{ gameName: string; tagLine: string }>();
  const [profile, setProfile] = useState<SummonerProfile | null>(null);
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [champStats, setChampStats] = useState<ChampionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameName || !tagLine) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getSummoner(gameName, tagLine)
      .then((summoner) => {
        if (cancelled) return;
        setProfile(summoner);

        // Fetch matches and stats in parallel
        return Promise.all([
          getSummonerMatches(summoner.puuid).catch(() => ({ puuid: summoner.puuid, matches: [] })),
          getSummonerStats(summoner.puuid).catch(() => ({ puuid: summoner.puuid, stats: [] })),
        ]).then(([matchesRes, statsRes]) => {
          if (cancelled) return;
          setMatches(matchesRes.matches ?? []);
          setChampStats(statsRes.stats ?? []);
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load summoner');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gameName, tagLine]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-lol-gold/30 border-t-lol-gold rounded-full animate-spin" />
          <p className="text-sm text-lol-dim">
            Searching for {decodeURIComponent(gameName ?? '')}#{decodeURIComponent(tagLine ?? '')}...
          </p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="card p-8 text-center">
        <p className="text-red-400 font-medium text-lg">Summoner not found</p>
        <p className="text-sm text-lol-dim mt-2">
          {error ?? `Could not find ${decodeURIComponent(gameName ?? '')}#${decodeURIComponent(tagLine ?? '')}`}
        </p>
      </div>
    );
  }

  const soloRank = profile.ranks?.find(
    (r) => r.queueType === 'RANKED_SOLO_5x5',
  );
  const flexRank = profile.ranks?.find(
    (r) => r.queueType === 'RANKED_FLEX_SR',
  );

  return (
    <div className="space-y-6">
      {/* Summoner Header */}
      <div className="card p-6">
        <div className="flex items-center gap-5">
          {/* Profile Icon */}
          <div className="relative shrink-0">
            <DDImg
              src={profileIcon(profile.profileIconId)}
              alt="Profile"
              className="w-20 h-20 rounded-xl border-2 border-lol-gold/40"
            />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-lol-dark border border-lol-gold/40 text-lol-gold text-[10px] font-bold px-2 py-0.5 rounded-full">
              {profile.summonerLevel}
            </span>
          </div>

          {/* Name + Ranks */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-white truncate">
              {profile.gameName}
              <span className="text-lol-dim font-normal text-lg ml-1">
                #{profile.tagLine}
              </span>
            </h1>

            <div className="flex items-center gap-4 mt-2">
              {soloRank && <RankBadge rank={soloRank} label="Solo/Duo" />}
              {flexRank && <RankBadge rank={flexRank} label="Flex" />}
              {!soloRank && !flexRank && (
                <span className="text-sm text-lol-dim">Unranked</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Champion Stats */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-bold text-lol-text flex items-center gap-2">
            <span className="w-1 h-5 bg-lol-gold rounded-full" />
            Champion Stats
          </h2>

          {champStats.length > 0 ? (
            <div className="space-y-2">
              {champStats.slice(0, 10).map((stat) => (
                <div
                  key={stat.championId}
                  className="card px-3 py-2.5 flex items-center gap-3"
                >
                  <DDImg
                    src={championIcon(stat.championId)}
                    alt={stat.championName}
                    className="w-8 h-8 rounded-full border border-white/10"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-lol-text truncate">
                      {stat.championName}
                    </p>
                    <p className="text-[11px] text-lol-dim">
                      {stat.games} games
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-semibold ${
                        stat.winRate >= 55
                          ? 'stat-green'
                          : stat.winRate <= 45
                            ? 'stat-red'
                            : 'stat-neutral'
                      }`}
                    >
                      {stat.winRate.toFixed(0)}% WR
                    </p>
                    <p className="text-[11px] text-lol-blue">
                      {stat.avgKda.toFixed(2)} KDA
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-6 text-center">
              <p className="text-sm text-lol-dim">No champion stats available</p>
            </div>
          )}
        </div>

        {/* Right: Recent Matches */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-lol-text flex items-center gap-2">
            <span className="w-1 h-5 bg-lol-gold rounded-full" />
            Recent Matches
          </h2>

          {matches.length > 0 ? (
            <div className="space-y-2">
              {matches.map((match) => (
                <MatchCard key={match.matchId} match={match} />
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <p className="text-sm text-lol-dim">No recent matches found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function RankBadge({
  rank,
  label,
}: {
  rank: { tier: string; division: string; lp: number; wins: number; losses: number };
  label: string;
}) {
  const tierColor = RANK_COLORS[rank.tier.toUpperCase()] ?? 'text-lol-dim';
  const totalGames = rank.wins + rank.losses;
  const winRate = totalGames > 0 ? ((rank.wins / totalGames) * 100).toFixed(0) : '0';

  return (
    <div className="bg-lol-dark/60 border border-white/10 rounded-lg px-3 py-2">
      <p className="text-[10px] text-lol-dim uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-sm font-bold ${tierColor}`}>
          {rank.tier} {rank.division}
        </span>
        <span className="text-xs text-lol-dim">{rank.lp} LP</span>
      </div>
      <p className="text-[11px] text-lol-dim mt-0.5">
        {rank.wins}W {rank.losses}L ({winRate}%)
      </p>
    </div>
  );
}

function MatchCard({ match }: { match: MatchEntry }) {
  const kda = kdaRatio(match.kills, match.deaths, match.assists);
  const kdaNum = match.deaths === 0 ? Infinity : (match.kills + match.assists) / match.deaths;
  const kdaColor =
    kdaNum >= 5
      ? 'text-lol-gold'
      : kdaNum >= 3
        ? 'text-lol-blue'
        : kdaNum >= 2
          ? 'stat-green'
          : 'stat-neutral';

  return (
    <div
      className={`card flex items-center gap-4 px-4 py-3 border-l-4 ${
        match.win ? 'border-l-emerald-500' : 'border-l-red-500'
      }`}
    >
      {/* Champion Icon */}
      <DDImg
        src={championIcon(match.championId ?? match.champion)}
        alt={match.champion}
        className="w-12 h-12 rounded-lg border border-white/10"
      />

      {/* Win/Loss + Champion */}
      <div className="w-20 shrink-0">
        <p
          className={`text-sm font-bold ${
            match.win ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {match.win ? 'Victory' : 'Defeat'}
        </p>
        <p className="text-xs text-lol-dim truncate">{match.champion}</p>
        {match.role && (
          <p className="text-[10px] text-lol-dim/60 capitalize">
            {match.role.toLowerCase()}
          </p>
        )}
      </div>

      {/* KDA */}
      <div className="w-28 shrink-0">
        <p className="text-sm font-semibold text-lol-text">
          {formatKDA(match.kills, match.deaths, match.assists)}
        </p>
        <p className={`text-xs font-medium ${kdaColor}`}>{kda} KDA</p>
      </div>

      {/* CS + Duration */}
      <div className="w-20 shrink-0 text-xs">
        <p className="text-lol-text">{match.cs} CS</p>
        <p className="text-lol-dim">{formatDuration(match.gameDuration)}</p>
      </div>

      {/* Items */}
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {(match.items ?? [])
          .filter((id) => id && id !== 0)
          .slice(0, 7)
          .map((itemId, idx) => (
            <ItemIcon key={`${match.matchId}-item-${idx}`} itemId={itemId} size={28} />
          ))}
      </div>

      {/* Time ago */}
      {match.gameCreation && (
        <span className="text-[11px] text-lol-dim/60 shrink-0">
          {timeAgo(match.gameCreation)}
        </span>
      )}
    </div>
  );
}
