import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getLeaderboard, type LeaderboardPlayer } from '../lib/api';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const METRICS = [
  { value: 'winrate', label: 'Win Rate', suffix: '%' },
  { value: 'kda', label: 'KDA', suffix: '' },
  { value: 'kills', label: 'Avg Kills', suffix: '' },
  { value: 'damage', label: 'Avg Damage', suffix: '' },
  { value: 'gold', label: 'Avg Gold', suffix: '' },
  { value: 'cs', label: 'Avg CS', suffix: '' },
  { value: 'vision', label: 'Avg Vision', suffix: '' },
  { value: 'games', label: 'Games Played', suffix: '' },
];

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'TOP', label: 'Top' },
  { value: 'JUNGLE', label: 'Jungle' },
  { value: 'MIDDLE', label: 'Mid' },
  { value: 'BOTTOM', label: 'ADC' },
  { value: 'UTILITY', label: 'Support' },
];

const PAGE_SIZE = 50;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getMetricValue(player: LeaderboardPlayer, metric: string): number {
  switch (metric) {
    case 'winrate': return player.winRate;
    case 'kda': return player.kda;
    case 'kills': return player.avgKills;
    case 'damage': return player.avgDamage;
    case 'gold': return player.avgGold;
    case 'cs': return player.avgCs;
    case 'vision': return player.avgVision;
    case 'games': return player.games;
    default: return player.winRate;
  }
}

function fmtMetric(value: number, metric: string): string {
  if (metric === 'damage' || metric === 'gold') return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
  if (metric === 'winrate') return `${value.toFixed(1)}%`;
  if (metric === 'games') return String(value);
  return value.toFixed(1);
}

function kdaColor(kda: number): string {
  if (kda >= 5) return 'text-lol-gold';
  if (kda >= 3) return 'text-emerald-400';
  if (kda >= 2) return 'text-lol-blue';
  return 'text-lol-dim';
}

function wrColor(wr: number): string {
  if (wr >= 60) return 'text-lol-gold';
  if (wr >= 55) return 'text-emerald-400';
  if (wr >= 50) return 'text-lol-text';
  return 'text-red-400';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LeaderboardsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const metric = searchParams.get('metric') || 'winrate';
  const role = searchParams.get('role') || '';
  const page = Number(searchParams.get('page') || '1');

  const setFilter = useCallback((key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });
  }, [setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await getLeaderboard({
          metric,
          role: role || undefined,
          limit: String(PAGE_SIZE),
          offset: String((page - 1) * PAGE_SIZE),
        });
        if (!cancelled) {
          setPlayers(res.data);
          setTotal(res.total);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load leaderboards');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [metric, role, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const metricInfo = METRICS.find((m) => m.value === metric) || METRICS[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-lol-text flex items-center gap-3">
          <span className="w-1.5 h-7 bg-lol-gold rounded-full" />
          Leaderboards
        </h1>
        <p className="text-sm text-lol-dim mt-1 ml-4">Top players ranked by performance metrics</p>
      </div>

      {/* Metric pills */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {METRICS.map((m) => (
            <button
              key={m.value}
              onClick={() => setFilter('metric', m.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                metric === m.value
                  ? 'bg-lol-gold/15 text-lol-gold border border-lol-gold/30'
                  : 'text-lol-dim hover:text-lol-text hover:bg-white/5 border border-transparent'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Role filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-lol-dim/60 uppercase tracking-wider">Role:</span>
          {ROLE_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setFilter('role', o.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                role === o.value
                  ? 'bg-white/10 text-lol-text'
                  : 'text-lol-dim/60 hover:text-lol-text hover:bg-white/5'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-lol-gold/30 border-t-lol-gold rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="card p-8 text-center">
          <p className="text-red-400 font-semibold mb-1">Error</p>
          <p className="text-sm text-lol-dim">{error}</p>
        </div>
      )}

      {/* Top 3 Podium */}
      {!loading && !error && players.length >= 3 && page === 1 && (
        <div className="grid grid-cols-3 gap-3 mb-2">
          {[1, 0, 2].map((podiumIdx) => {
            const player = players[podiumIdx];
            if (!player) return null;
            const rank = podiumIdx + 1;
            const val = getMetricValue(player, metric);
            const podiumColors = [
              { bg: 'from-lol-gold/10 to-lol-gold/5', border: 'border-lol-gold/30', text: 'text-lol-gold', medal: '1st' },
              { bg: 'from-gray-400/10 to-gray-400/5', border: 'border-gray-400/20', text: 'text-gray-300', medal: '2nd' },
              { bg: 'from-amber-700/10 to-amber-700/5', border: 'border-amber-700/20', text: 'text-amber-600', medal: '3rd' },
            ];
            const c = podiumColors[podiumIdx];
            return (
              <div
                key={player.puuid}
                className={`card bg-gradient-to-b ${c.bg} border ${c.border} p-4 text-center ${rank === 1 ? 'transform -translate-y-2' : ''}`}
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${c.text} text-lg font-extrabold mb-2 bg-white/5`}>
                  {rank}
                </div>
                <p className="text-sm font-bold text-lol-text truncate">{player.summonerName}</p>
                <p className={`text-lg font-extrabold ${c.text} mt-1`}>{fmtMetric(val, metric)}</p>
                <div className="flex items-center justify-center gap-2 mt-1.5 text-[10px] text-lol-dim/60">
                  <span>{player.games}g</span>
                  <span>{player.winRate.toFixed(0)}% WR</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      {!loading && !error && players.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-lol-dark/50 text-xs text-lol-dim uppercase tracking-wider">
                  <th className="px-4 py-3 text-center w-12">#</th>
                  <th className="px-4 py-3 text-left">Player</th>
                  <th className="px-3 py-3 text-center">
                    <span className="text-lol-gold">{metricInfo.label}</span>
                  </th>
                  <th className="px-3 py-3 text-center">Games</th>
                  <th className="px-3 py-3 text-center">Win Rate</th>
                  <th className="px-3 py-3 text-center hidden sm:table-cell">KDA</th>
                  <th className="px-3 py-3 text-center hidden md:table-cell">Avg K/D/A</th>
                  <th className="px-3 py-3 text-center hidden lg:table-cell">Avg DMG</th>
                  <th className="px-3 py-3 text-center hidden lg:table-cell">Avg CS</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, idx) => {
                  const rank = (page - 1) * PAGE_SIZE + idx + 1;
                  const val = getMetricValue(player, metric);
                  return (
                    <tr
                      key={player.puuid}
                      className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                        rank <= 3 ? 'bg-lol-gold/[0.02]' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        {rank <= 3 ? (
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-extrabold ${
                            rank === 1 ? 'bg-lol-gold/20 text-lol-gold' :
                            rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                            'bg-amber-700/20 text-amber-600'
                          }`}>
                            {rank}
                          </span>
                        ) : (
                          <span className="text-sm text-lol-dim/60 font-mono">{rank}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-lol-text">{player.summonerName}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm font-bold text-lol-gold">
                          {fmtMetric(val, metric)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-lol-dim">{player.games}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-12 h-2 bg-white/5 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className={`h-full rounded-full ${player.winRate >= 50 ? 'bg-[#3cbc8d]' : 'bg-[#e9422e]'}`}
                              style={{ width: `${player.winRate}%` }}
                            />
                          </div>
                          <span className={`text-sm font-semibold ${wrColor(player.winRate)}`}>
                            {player.winRate.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className={`px-3 py-3 text-center text-sm font-semibold hidden sm:table-cell ${kdaColor(player.kda)}`}>
                        {player.kda.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-lol-text hidden md:table-cell">
                        {player.avgKills.toFixed(1)}/{player.avgDeaths.toFixed(1)}/{player.avgAssists.toFixed(1)}
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-lol-dim hidden lg:table-cell">
                        {(player.avgDamage / 1000).toFixed(1)}k
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-lol-dim hidden lg:table-cell">
                        {player.avgCs.toFixed(0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && players.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-lg text-lol-dim font-semibold">No players found</p>
          <p className="text-sm text-lol-dim/60 mt-1">Minimum 5 games required to appear on leaderboards.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setFilter('page', String(page - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/10 text-lol-dim
                       hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-lol-dim/60">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setFilter('page', String(page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/10 text-lol-dim
                       hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
