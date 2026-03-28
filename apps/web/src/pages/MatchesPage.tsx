import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getMatches,
  type FullMatch,
  type MatchTeamParticipant,
} from '../lib/api';
import {
  championIcon,
  itemIcon,
  fetchAllChampions,
  getChampionByKey,
  resolveChampionIcon,
  DDImg,
} from '../lib/dataDragon';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const QUEUE_NAMES: Record<number, string> = {
  420: 'Ranked Solo', 440: 'Ranked Flex', 400: 'Normal Draft',
  430: 'Normal Blind', 450: 'ARAM', 700: 'Clash', 900: 'ARURF',
  1300: 'Nexus Blitz', 1700: 'Arena',
};

const ROLE_LABELS: Record<string, string> = {
  TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'ADC', UTILITY: 'Support',
};

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'TOP', label: 'Top' },
  { value: 'JUNGLE', label: 'Jungle' },
  { value: 'MIDDLE', label: 'Mid' },
  { value: 'BOTTOM', label: 'ADC' },
  { value: 'UTILITY', label: 'Support' },
];

const QUEUE_OPTIONS = [
  { value: '', label: 'All Queues' },
  { value: '420', label: 'Ranked Solo' },
  { value: '440', label: 'Ranked Flex' },
  { value: '400', label: 'Normal Draft' },
  { value: '450', label: 'ARAM' },
];

const PAGE_SIZE = 20;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : `${Math.floor(d / 30)}mo ago`;
}

function fmtDuration(sec: number): string {
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
}

function champIconUrl(name: string, id: number): string {
  const bk = getChampionByKey(id);
  return bk ? championIcon(bk.id) : resolveChampionIcon(name);
}

function teamKda(team: MatchTeamParticipant[]): { kills: number; deaths: number; assists: number } {
  return team.reduce(
    (acc, p) => ({ kills: acc.kills + p.kills, deaths: acc.deaths + p.deaths, assists: acc.assists + p.assists }),
    { kills: 0, deaths: 0, assists: 0 },
  );
}

function teamGold(team: MatchTeamParticipant[]): number {
  return team.reduce((s, p) => s + p.goldEarned, 0);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MatchesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [matches, setMatches] = useState<FullMatch[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  // Filters from URL
  const page = Number(searchParams.get('page') || '1');
  const champion = searchParams.get('champion') || '';
  const role = searchParams.get('role') || '';
  const queue = searchParams.get('queue') || '';
  const [championInput, setChampionInput] = useState(champion);

  const setFilter = useCallback((key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      if (key !== 'page') next.delete('page'); // reset page on filter change
      return next;
    });
  }, [setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      await fetchAllChampions().catch(() => []);
      try {
        const offset = String((page - 1) * PAGE_SIZE);
        const res = await getMatches({
          limit: String(PAGE_SIZE),
          offset,
          champion: champion || undefined,
          role: role || undefined,
          queue: queue || undefined,
        });
        if (!cancelled) {
          setMatches(res.data);
          setTotal(res.total);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load matches');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [page, champion, role, queue]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold text-lol-text flex items-center gap-3">
          <span className="w-1.5 h-7 bg-lol-gold rounded-full" />
          All Matches
        </h1>
        {total > 0 && (
          <span className="text-sm text-lol-dim">
            {total.toLocaleString()} match{total !== 1 ? 'es' : ''} found
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Champion search */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-lol-dim/60 uppercase tracking-wider">Champion</label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setFilter('champion', championInput.trim());
              }}
              className="flex gap-1"
            >
              <input
                type="text"
                value={championInput}
                onChange={(e) => setChampionInput(e.target.value)}
                placeholder="e.g. Jinx"
                className="bg-lol-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-lol-text placeholder:text-lol-dim/40 w-36
                           focus:outline-none focus:border-lol-gold/50 transition-colors"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-lol-gold/10 border border-lol-gold/30 text-lol-gold text-xs font-semibold rounded-lg hover:bg-lol-gold/20 transition-colors"
              >
                Go
              </button>
              {champion && (
                <button
                  type="button"
                  onClick={() => { setChampionInput(''); setFilter('champion', ''); }}
                  className="px-2 py-2 text-lol-dim hover:text-red-400 text-xs transition-colors"
                  title="Clear"
                >
                  ✕
                </button>
              )}
            </form>
          </div>

          {/* Role filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-lol-dim/60 uppercase tracking-wider">Role</label>
            <select
              value={role}
              onChange={(e) => setFilter('role', e.target.value)}
              className="bg-lol-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-lol-text
                         focus:outline-none focus:border-lol-gold/50 transition-colors cursor-pointer"
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Queue filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-lol-dim/60 uppercase tracking-wider">Queue</label>
            <select
              value={queue}
              onChange={(e) => setFilter('queue', e.target.value)}
              className="bg-lol-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-lol-text
                         focus:outline-none focus:border-lol-gold/50 transition-colors cursor-pointer"
            >
              {QUEUE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active filters */}
        {(champion || role || queue) && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
            <span className="text-[10px] text-lol-dim/50 uppercase">Active filters:</span>
            {champion && (
              <span className="inline-flex items-center gap-1 text-xs bg-lol-gold/10 text-lol-gold border border-lol-gold/20 rounded-full px-2.5 py-0.5">
                {champion}
                <button onClick={() => { setChampionInput(''); setFilter('champion', ''); }} className="hover:text-red-400">✕</button>
              </span>
            )}
            {role && (
              <span className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-2.5 py-0.5">
                {ROLE_LABELS[role] || role}
                <button onClick={() => setFilter('role', '')} className="hover:text-red-400">✕</button>
              </span>
            )}
            {queue && (
              <span className="inline-flex items-center gap-1 text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full px-2.5 py-0.5">
                {QUEUE_NAMES[Number(queue)] || queue}
                <button onClick={() => setFilter('queue', '')} className="hover:text-red-400">✕</button>
              </span>
            )}
            <button
              onClick={() => {
                setChampionInput('');
                setSearchParams({});
              }}
              className="text-[10px] text-lol-dim hover:text-red-400 transition-colors ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-lol-gold/30 border-t-lol-gold rounded-full animate-spin" />
            <p className="text-sm text-lol-dim">Loading matches...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="card p-8 text-center">
          <p className="text-red-400 font-semibold mb-1">Error loading matches</p>
          <p className="text-sm text-lol-dim">{error}</p>
        </div>
      )}

      {/* No results */}
      {!loading && !error && matches.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-lg text-lol-dim font-semibold mb-1">No matches found</p>
          <p className="text-sm text-lol-dim/60">Try adjusting your filters or check back later.</p>
        </div>
      )}

      {/* Match list */}
      {!loading && !error && matches.length > 0 && (
        <div className="space-y-2">
          {matches.map((match) => (
            <MatchRow
              key={match.matchId}
              match={match}
              expanded={expandedMatch === match.matchId}
              onToggle={() => setExpandedMatch(expandedMatch === match.matchId ? null : match.matchId)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setFilter('page', String(page - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/10 text-lol-dim
                       hover:bg-white/5 hover:text-lol-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setFilter('page', String(pageNum))}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                    pageNum === page
                      ? 'bg-lol-gold/15 text-lol-gold border border-lol-gold/30'
                      : 'text-lol-dim hover:text-lol-text hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setFilter('page', String(page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/10 text-lol-dim
                       hover:bg-white/5 hover:text-lol-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MatchRow                                                           */
/* ------------------------------------------------------------------ */

function MatchRow({
  match,
  expanded,
  onToggle,
}: {
  match: FullMatch;
  expanded: boolean;
  onToggle: () => void;
}) {
  const qn = QUEUE_NAMES[match.queueId] || `Queue ${match.queueId}`;
  const blueKda = teamKda(match.blueTeam);
  const redKda = teamKda(match.redTeam);
  const blueGold = teamGold(match.blueTeam);
  const redGold = teamGold(match.redTeam);

  return (
    <div className="card overflow-hidden">
      {/* Summary row */}
      <button
        onClick={onToggle}
        className="w-full flex items-stretch hover:bg-white/[0.02] transition-colors"
      >
        {/* Blue team champions */}
        <div className={`flex items-center gap-1 px-3 py-3 ${match.blueWin ? 'bg-[#3cbc8d]/5' : 'bg-[#e9422e]/5'}`}>
          {match.blueTeam.map((p, i) => (
            <DDImg
              key={i}
              src={champIconUrl(p.championName, p.championId)}
              alt={p.championName}
              className={`w-7 h-7 rounded-md border ${match.blueWin ? 'border-[#3cbc8d]/30' : 'border-white/10'}`}
              title={p.championName}
            />
          ))}
        </div>

        {/* Blue KDA */}
        <div className="flex flex-col items-center justify-center px-3 py-2 min-w-[70px]">
          <span className={`text-sm font-bold ${match.blueWin ? 'text-[#3cbc8d]' : 'text-red-400'}`}>
            {blueKda.kills}
          </span>
          <span className="text-[10px] text-lol-dim/50">{(blueGold / 1000).toFixed(1)}k</span>
        </div>

        {/* Center info */}
        <div className="flex flex-col items-center justify-center px-3 py-2 min-w-[100px]">
          <span className="text-[10px] font-bold text-lol-dim/60 uppercase">{qn}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-xs font-extrabold ${match.blueWin ? 'text-[#3cbc8d]' : 'text-red-400'}`}>
              {match.blueWin ? 'WIN' : 'LOSS'}
            </span>
            <span className="text-[10px] text-lol-dim/40">vs</span>
            <span className={`text-xs font-extrabold ${!match.blueWin ? 'text-[#3cbc8d]' : 'text-red-400'}`}>
              {!match.blueWin ? 'WIN' : 'LOSS'}
            </span>
          </div>
          <span className="text-[10px] text-lol-dim/40 mt-0.5">{fmtDuration(match.gameDuration)}</span>
        </div>

        {/* Red KDA */}
        <div className="flex flex-col items-center justify-center px-3 py-2 min-w-[70px]">
          <span className={`text-sm font-bold ${!match.blueWin ? 'text-[#3cbc8d]' : 'text-red-400'}`}>
            {redKda.kills}
          </span>
          <span className="text-[10px] text-lol-dim/50">{(redGold / 1000).toFixed(1)}k</span>
        </div>

        {/* Red team champions */}
        <div className={`flex items-center gap-1 px-3 py-3 ${!match.blueWin ? 'bg-[#3cbc8d]/5' : 'bg-[#e9422e]/5'}`}>
          {match.redTeam.map((p, i) => (
            <DDImg
              key={i}
              src={champIconUrl(p.championName, p.championId)}
              alt={p.championName}
              className={`w-7 h-7 rounded-md border ${!match.blueWin ? 'border-[#3cbc8d]/30' : 'border-white/10'}`}
              title={p.championName}
            />
          ))}
        </div>

        {/* Meta */}
        <div className="flex-1" />
        <div className="flex flex-col items-end justify-center px-3 py-2 shrink-0">
          <span className="text-[10px] text-lol-dim/50">{match.patch}</span>
          <span className="text-[10px] text-lol-dim/40">{timeAgo(match.gameStartTimestamp)}</span>
        </div>

        {/* Expand indicator */}
        <div className="flex items-center px-2 text-lol-dim/40">
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-white/5">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/5">
            <TeamTable
              team={match.blueTeam}
              label="Blue Team"
              win={match.blueWin}
              color="#3cbc8d"
              loseColor="#e9422e"
            />
            <TeamTable
              team={match.redTeam}
              label="Red Team"
              win={!match.blueWin}
              color="#3cbc8d"
              loseColor="#e9422e"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TeamTable                                                          */
/* ------------------------------------------------------------------ */

function TeamTable({
  team,
  label,
  win,
  color,
  loseColor,
}: {
  team: MatchTeamParticipant[];
  label: string;
  win: boolean;
  color: string;
  loseColor: string;
}) {
  const teamTotals = teamKda(team);
  const totalGold = teamGold(team);
  const accentColor = win ? color : loseColor;

  // Sort by role order
  const roleOrder = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];
  const sorted = [...team].sort(
    (a, b) => roleOrder.indexOf(a.teamPosition) - roleOrder.indexOf(b.teamPosition),
  );

  return (
    <div className="p-3">
      {/* Team header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>
            {label}
          </span>
          <span
            className="text-[10px] font-extrabold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: accentColor + '15', color: accentColor }}
          >
            {win ? 'VICTORY' : 'DEFEAT'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-lol-dim/60">
          <span>{teamTotals.kills}/{teamTotals.deaths}/{teamTotals.assists}</span>
          <span className="text-lol-gold/50">{(totalGold / 1000).toFixed(1)}k gold</span>
        </div>
      </div>

      {/* Player rows */}
      <div className="space-y-0.5">
        {sorted.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.03] transition-colors"
          >
            {/* Champion */}
            <DDImg
              src={champIconUrl(p.championName, p.championId)}
              alt={p.championName}
              className="w-8 h-8 rounded-lg border border-white/10 shrink-0"
            />
            <div className="w-24 min-w-0 shrink-0">
              <p className="text-xs font-semibold text-lol-text truncate">{p.summonerName}</p>
              <p className="text-[10px] text-lol-dim/50">{ROLE_LABELS[p.teamPosition] || p.teamPosition}</p>
            </div>

            {/* KDA */}
            <div className="w-20 text-center shrink-0">
              <p className="text-xs font-semibold text-lol-text">
                {p.kills}/{' '}
                <span className="text-red-400">{p.deaths}</span>/{' '}
                {p.assists}
              </p>
              <p className="text-[10px] text-lol-dim/50">
                {p.deaths === 0 ? 'Perfect' : ((p.kills + p.assists) / p.deaths).toFixed(1)} KDA
              </p>
            </div>

            {/* CS & Vision */}
            <div className="hidden sm:block w-16 text-center shrink-0">
              <p className="text-[11px] text-lol-text">{p.cs} CS</p>
              <p className="text-[10px] text-lol-dim/40">{p.visionScore} vis</p>
            </div>

            {/* Damage */}
            <div className="hidden md:block w-16 text-center shrink-0">
              <p className="text-[11px] text-lol-text">{(p.totalDamageDealtToChampions / 1000).toFixed(1)}k</p>
              <p className="text-[10px] text-lol-dim/40">dmg</p>
            </div>

            {/* Gold */}
            <div className="hidden md:block w-14 text-center shrink-0">
              <p className="text-[11px] text-lol-gold/60">{(p.goldEarned / 1000).toFixed(1)}k</p>
            </div>

            {/* Items */}
            <div className="hidden lg:flex items-center gap-0.5 shrink-0">
              {p.items.slice(0, 7).map((id, j) => (
                <div key={j}>
                  {id > 0 ? (
                    <DDImg src={itemIcon(id)} alt="" className="w-5 h-5 rounded border border-white/10" />
                  ) : (
                    <div className="w-5 h-5 rounded border border-white/5 bg-lol-dark" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Damage distribution bars */}
      {(() => {
        const maxDmg = Math.max(...team.map((p) => p.totalDamageDealtToChampions), 1);
        return (
          <div className="mt-2 pt-2 border-t border-white/5 px-2 space-y-1">
            <p className="text-[9px] text-lol-dim/50 uppercase tracking-wider mb-1">Damage Share</p>
            {sorted.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-lol-dim/50 w-16 truncate">{p.championName}</span>
                <div className="flex-1 h-3 bg-white/[0.03] rounded-sm overflow-hidden relative">
                  <div
                    className="h-full rounded-sm dmg-bar-physical"
                    style={{ width: `${(p.totalDamageDealtToChampions / maxDmg) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-lol-dim/50 w-10 text-right font-mono">
                  {(p.totalDamageDealtToChampions / 1000).toFixed(1)}k
                </span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
