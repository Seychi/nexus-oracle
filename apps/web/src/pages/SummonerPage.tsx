import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
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
import { saveRecentSearch } from '../components/SearchAutocomplete';

/* ================================================================ */
/*  Helpers                                                          */
/* ================================================================ */

const QUEUE_NAMES: Record<number, string> = {
  420: 'Ranked Solo', 440: 'Ranked Flex', 400: 'Normal Draft',
  430: 'Normal Blind', 450: 'ARAM', 700: 'Clash', 900: 'ARURF',
  1300: 'Nexus Blitz', 1700: 'Arena',
};

const ROLE_LABELS: Record<string, string> = {
  TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'ADC', UTILITY: 'Support',
};

const TIER_COLORS: Record<string, string> = {
  IRON: '#6b5b4f', BRONZE: '#8c6239', SILVER: '#7c8b98', GOLD: '#c8aa6e',
  PLATINUM: '#4e9996', EMERALD: '#2d9171', DIAMOND: '#576bce', MASTER: '#9d48e0',
  GRANDMASTER: '#e34343', CHALLENGER: '#f4c874',
};

const ROLE_COLORS: Record<string, string> = {
  TOP: '#e9422e', JUNGLE: '#3cbc8d', MIDDLE: '#2796bc', BOTTOM: '#c8aa6e', UTILITY: '#9d48e0',
};

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

function kdaStr(k: number, d: number, a: number): string {
  return d === 0 ? 'Perfect' : ((k + a) / d).toFixed(2);
}

function kdaClr(k: number, d: number, a: number): string {
  const r = d === 0 ? 99 : (k + a) / d;
  if (r >= 5) return 'text-lol-gold';
  if (r >= 3) return 'text-emerald-400';
  if (r >= 2) return 'text-lol-blue';
  return 'text-lol-dim';
}

function champIconUrl(name: string, id: number): string {
  const bk = getChampionByKey(id);
  return bk ? championIcon(bk.id) : resolveChampionIcon(name);
}

/* ================================================================ */
/*  Computed analytics                                               */
/* ================================================================ */

interface ChampPerf {
  championName: string; championId: number; games: number; wins: number;
  winRate: number; avgKda: number; avgCs: number; avgDmg: number; avgGold: number;
  kills: number; deaths: number; assists: number;
}

interface RolePerf { role: string; games: number; wins: number; winRate: number; }

interface PlayedWith {
  name: string; games: number; wins: number; winRate: number;
  lastChampion: string; lastChampId: number;
}

interface TimelinePoint { game: number; result: number; rollingWr: number; cumDelta: number; }

function analyze(matches: MatchEntry[]) {
  if (!matches.length) return { champs: [] as ChampPerf[], roles: [] as RolePerf[], playedWith: [] as PlayedWith[], timeline: [] as TimelinePoint[], totalWins: 0, totalLosses: 0 };

  // --- Champions ---
  const cm = new Map<number, { n: string; id: number; g: number; w: number; k: number; d: number; a: number; cs: number; dmg: number; gold: number }>();
  for (const m of matches) {
    const e = cm.get(m.championId) || { n: m.championName, id: m.championId, g: 0, w: 0, k: 0, d: 0, a: 0, cs: 0, dmg: 0, gold: 0 };
    e.g++; if (m.win) e.w++; e.k += m.kills; e.d += m.deaths; e.a += m.assists;
    e.cs += m.cs; e.dmg += m.totalDamageDealtToChampions || 0; e.gold += m.goldEarned || 0;
    cm.set(m.championId, e);
  }
  const champs: ChampPerf[] = [...cm.values()]
    .sort((a, b) => b.g - a.g)
    .map(c => ({
      championName: c.n, championId: c.id, games: c.g, wins: c.w,
      winRate: (c.w / c.g) * 100,
      avgKda: c.d > 0 ? (c.k + c.a) / c.d : c.k + c.a,
      avgCs: c.cs / c.g, avgDmg: c.dmg / c.g, avgGold: c.gold / c.g,
      kills: c.k, deaths: c.d, assists: c.a,
    }));

  // --- Roles ---
  const rm = new Map<string, { g: number; w: number }>();
  for (const m of matches) {
    if (!m.role) continue;
    const e = rm.get(m.role) || { g: 0, w: 0 };
    e.g++; if (m.win) e.w++;
    rm.set(m.role, e);
  }
  const roles: RolePerf[] = [...rm.entries()]
    .map(([role, v]) => ({ role, games: v.g, wins: v.w, winRate: (v.w / v.g) * 100 }))
    .sort((a, b) => b.games - a.games);

  // --- Played with ---
  const pw = new Map<string, { g: number; w: number; lastChamp: string; lastId: number }>();
  for (const m of matches) {
    if (!m.participants) continue;
    const myTeamId = m.participants.find(p => p.championName === m.championName && p.kills === m.kills)?.teamId;
    for (const p of m.participants) {
      if (!p.summonerName || p.championName === m.championName) continue;
      if (myTeamId !== undefined && p.teamId !== myTeamId) continue;
      const name = p.summonerName;
      const e = pw.get(name) || { g: 0, w: 0, lastChamp: p.championName, lastId: p.championId };
      e.g++; if (m.win) e.w++;
      e.lastChamp = p.championName; e.lastId = p.championId;
      pw.set(name, e);
    }
  }
  const playedWith: PlayedWith[] = [...pw.entries()]
    .filter(([, v]) => v.g >= 2)
    .map(([name, v]) => ({ name, games: v.g, wins: v.w, winRate: (v.w / v.g) * 100, lastChampion: v.lastChamp, lastChampId: v.lastId }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 10);

  // --- Timeline ---
  const sorted = [...matches].sort((a, b) => a.gameCreation - b.gameCreation);
  let cumDelta = 0;
  const timeline: TimelinePoint[] = sorted.map((m, i) => {
    cumDelta += m.win ? 1 : -1;
    const window = sorted.slice(Math.max(0, i - 4), i + 1);
    const wr = (window.filter(w => w.win).length / window.length) * 100;
    return { game: i + 1, result: m.win ? 1 : -1, rollingWr: Math.round(wr), cumDelta };
  });

  const totalWins = matches.filter(m => m.win).length;
  return { champs, roles, playedWith, timeline, totalWins, totalLosses: matches.length - totalWins };
}

/* ================================================================ */
/*  Main Component                                                   */
/* ================================================================ */

export default function SummonerPage() {
  const { gameName, tagLine } = useParams<{ gameName: string; tagLine: string }>();
  const [profile, setProfile] = useState<SummonerProfile | null>(null);
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'champions' | 'playedWith'>('overview');

  useEffect(() => {
    if (!gameName || !tagLine) return;
    let cancelled = false;
    setLoading(true); setError(null); setProfile(null); setMatches([]); setTab('overview');

    (async () => {
      await fetchAllChampions().catch(() => []);
      try {
        const p = await getSummoner(gameName, tagLine);
        if (cancelled) return;
        setProfile(p); setLoading(false);
        saveRecentSearch(gameName, tagLine);

        setLoadingMatches(true);
        const md = await getSummonerMatches(p.puuid);
        if (!cancelled) setMatches(md.matches);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load summoner');
      } finally {
        if (!cancelled) { setLoading(false); setLoadingMatches(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [gameName, tagLine]);

  const data = useMemo(() => analyze(matches), [matches]);

  /* --- Loading / Error --- */
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-lol-gold/30 border-t-lol-gold rounded-full animate-spin" />
        <p className="text-sm text-lol-dim">Looking up summoner...</p>
      </div>
    </div>
  );

  if (error || !profile) return (
    <div className="card p-8 text-center max-w-lg mx-auto mt-12">
      <p className="text-red-400 font-semibold text-lg mb-2">Summoner not found</p>
      <p className="text-sm text-lol-dim">{error || 'Could not find this summoner.'}</p>
      <p className="text-xs text-lol-dim/50 mt-3">Format: Name#Tag (e.g., Faker#KR1)</p>
    </div>
  );

  const soloRank = profile.ranks.find(r => r.queueType === 'RANKED_SOLO_5x5');
  const flexRank = profile.ranks.find(r => r.queueType === 'RANKED_FLEX_SR');

  return (
    <div className="space-y-4">
      {/* ============ PROFILE HEADER ============ */}
      <div className="card p-5">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="relative">
            <DDImg src={profileIcon(profile.profileIconId)} alt="Profile" className="w-20 h-20 rounded-xl border-2 border-lol-gold/40" />
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-lol-dark border border-lol-gold/40 text-lol-gold text-[10px] font-bold px-2 py-0.5 rounded-full">{profile.summonerLevel}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-lol-text">
              {profile.gameName}<span className="text-lol-dim font-normal text-lg ml-1">#{profile.tagLine}</span>
            </h1>
            {matches.length > 0 && (
              <p className="text-sm text-lol-dim mt-1">
                Last {matches.length} games:&nbsp;
                <span className="text-emerald-400 font-semibold">{data.totalWins}W</span> - <span className="text-red-400 font-semibold">{data.totalLosses}L</span>
                &nbsp;<span className="text-lol-text">({((data.totalWins / matches.length) * 100).toFixed(0)}%)</span>
              </p>
            )}
          </div>
          <div className="flex gap-3 flex-wrap">
            <RankCard rank={soloRank} label="Solo/Duo" />
            <RankCard rank={flexRank} label="Flex" />
          </div>
        </div>
      </div>

      {/* ============ TABS ============ */}
      <div className="flex items-center gap-1 border-b border-white/10">
        {(['overview', 'champions', 'playedWith'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-semibold transition-colors relative ${tab === t ? 'text-lol-gold' : 'text-lol-dim hover:text-lol-text'}`}>
            {t === 'overview' ? 'Overview' : t === 'champions' ? 'Champions' : 'Played With'}
            {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-lol-gold rounded-full" />}
          </button>
        ))}
        {loadingMatches && <span className="ml-2 w-4 h-4 border-2 border-lol-gold/30 border-t-lol-gold rounded-full animate-spin" />}
      </div>

      {/* ============ OVERVIEW TAB ============ */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Performance timeline chart */}
          {data.timeline.length > 1 && (
            <div className="card p-4">
              <h3 className="text-xs font-bold text-lol-dim uppercase tracking-wider mb-3">Performance Timeline</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Win/Loss bars */}
                <div>
                  <p className="text-[10px] text-lol-dim/60 mb-1">Win / Loss per game</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={data.timeline} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                      <Bar dataKey="result" radius={[2, 2, 0, 0]}>
                        {data.timeline.map((d, i) => (
                          <Cell key={i} fill={d.result > 0 ? '#3cbc8d' : '#e9422e'} />
                        ))}
                      </Bar>
                      <Tooltip
                        contentStyle={{ background: '#141a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                        labelFormatter={(v) => `Game ${v}`}
                        formatter={(v) => [Number(v) > 0 ? 'Win' : 'Loss', '']}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Rolling win rate */}
                <div>
                  <p className="text-[10px] text-lol-dim/60 mb-1">Rolling win rate (5-game)</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={data.timeline} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                      <defs>
                        <linearGradient id="wrGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#c8aa6e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#c8aa6e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="game" hide />
                      <YAxis domain={[0, 100]} hide />
                      <Area type="monotone" dataKey="rollingWr" stroke="#c8aa6e" fill="url(#wrGrad)" strokeWidth={2} dot={false} />
                      <Tooltip
                        contentStyle={{ background: '#141a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                        labelFormatter={(v) => `Game ${v}`}
                        formatter={(v) => [`${v}%`, 'Win Rate']}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Stats + Roles row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Performance */}
            <div className="card p-4">
              <h3 className="text-xs font-bold text-lol-dim uppercase tracking-wider mb-3">Recent Performance</h3>
              {matches.length > 0 ? (() => {
                const wr = (data.totalWins / matches.length) * 100;
                const avgK = matches.reduce((s, m) => s + m.kills, 0) / matches.length;
                const avgD = matches.reduce((s, m) => s + m.deaths, 0) / matches.length;
                const avgA = matches.reduce((s, m) => s + m.assists, 0) / matches.length;
                const avgCs = matches.reduce((s, m) => s + m.cs, 0) / matches.length;
                return (
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-lol-dim">Win Rate</span>
                        <span className={`font-semibold ${wr >= 55 ? 'text-emerald-400' : wr <= 45 ? 'text-red-400' : 'text-lol-text'}`}>{wr.toFixed(1)}%</span>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden flex">
                        <div className="bg-[#3cbc8d]" style={{ width: `${wr}%` }} />
                        <div className="bg-[#e9422e] flex-1" />
                      </div>
                      <div className="flex justify-between text-[10px] text-lol-dim/60 mt-0.5">
                        <span>{data.totalWins}W</span><span>{data.totalLosses}L</span>
                      </div>
                    </div>
                    <div className="flex justify-between"><span className="text-xs text-lol-dim">Avg KDA</span><span className={`text-sm font-bold ${kdaClr(avgK, avgD, avgA)}`}>{avgK.toFixed(1)}/{avgD.toFixed(1)}/{avgA.toFixed(1)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-lol-dim">Avg CS</span><span className="text-sm font-semibold text-lol-text">{avgCs.toFixed(0)}</span></div>
                  </div>
                );
              })() : <p className="text-sm text-lol-dim/50 text-center py-4">No data</p>}
            </div>

            {/* Role distribution */}
            <div className="card p-4">
              <h3 className="text-xs font-bold text-lol-dim uppercase tracking-wider mb-3">Role Distribution</h3>
              {data.roles.length > 0 ? (
                <div className="space-y-2">
                  {data.roles.map(r => {
                    const pct = (r.games / matches.length) * 100;
                    return (
                      <div key={r.role}>
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="text-lol-text font-medium">{ROLE_LABELS[r.role] || r.role}</span>
                          <span className="text-lol-dim">{r.games}g &middot; <span className={r.winRate >= 52 ? 'text-emerald-400' : r.winRate <= 48 ? 'text-red-400' : 'text-lol-text'}>{r.winRate.toFixed(0)}%</span></span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: ROLE_COLORS[r.role] || '#6b7280' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-lol-dim/50 text-center py-4">No data</p>}
            </div>

            {/* Top champions mini */}
            <div className="card p-4">
              <h3 className="text-xs font-bold text-lol-dim uppercase tracking-wider mb-3">Top Champions</h3>
              {data.champs.length > 0 ? (
                <div className="space-y-2">
                  {data.champs.slice(0, 5).map(c => (
                    <div key={c.championId} className="flex items-center gap-2.5">
                      <DDImg src={champIconUrl(c.championName, c.championId)} alt={c.championName} className="w-8 h-8 rounded-lg border border-white/10" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-lol-text truncate">{c.championName}</p>
                        <p className="text-[10px] text-lol-dim">{c.games}g</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-semibold ${c.winRate >= 55 ? 'text-emerald-400' : c.winRate <= 45 ? 'text-red-400' : 'text-lol-text'}`}>{c.winRate.toFixed(0)}%</p>
                        <p className={`text-[10px] ${kdaClr(c.avgKda, 1, 0)}`}>{c.avgKda.toFixed(1)}</p>
                      </div>
                      <div className="w-10 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c.winRate >= 50 ? 'bg-[#3cbc8d]' : 'bg-[#e9422e]'}`} style={{ width: `${c.winRate}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-lol-dim/50 text-center py-4">No data</p>}
            </div>
          </div>

          {/* Match history */}
          <div>
            <h2 className="text-lg font-bold text-lol-text mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-lol-gold rounded-full" />Match History
            </h2>
            {matches.length === 0 && !loadingMatches && (
              <div className="card p-8 text-center"><p className="text-lol-dim">No recent matches found.</p></div>
            )}
            <div className="space-y-2">
              {matches.map(m => <MatchCard key={m.matchId} match={m} />)}
            </div>
          </div>
        </div>
      )}

      {/* ============ CHAMPIONS TAB ============ */}
      {tab === 'champions' && (
        <div className="card overflow-hidden">
          {data.champs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-lol-dark/50 text-xs text-lol-dim uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left">Champion</th>
                    <th className="px-3 py-2.5 text-right">Games</th>
                    <th className="px-3 py-2.5 text-right">Win Rate</th>
                    <th className="px-3 py-2.5 text-right">KDA</th>
                    <th className="px-3 py-2.5 text-right hidden sm:table-cell">Avg CS</th>
                    <th className="px-3 py-2.5 text-right hidden md:table-cell">Avg DMG</th>
                    <th className="px-3 py-2.5 text-right hidden md:table-cell">Avg Gold</th>
                  </tr>
                </thead>
                <tbody>
                  {data.champs.map(c => (
                    <tr key={c.championId} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <DDImg src={champIconUrl(c.championName, c.championId)} alt={c.championName} className="w-8 h-8 rounded-lg border border-white/10" />
                          <span className="text-sm font-semibold text-lol-text">{c.championName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-lol-dim text-right">{c.games}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 h-2 bg-white/5 rounded-full overflow-hidden hidden sm:block">
                            <div className={`h-full rounded-full ${c.winRate >= 50 ? 'bg-[#3cbc8d]' : 'bg-[#e9422e]'}`} style={{ width: `${c.winRate}%` }} />
                          </div>
                          <span className={`text-sm font-semibold ${c.winRate >= 55 ? 'text-emerald-400' : c.winRate <= 45 ? 'text-red-400' : 'text-lol-text'}`}>
                            {c.winRate.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <p className="text-sm text-lol-text">{(c.kills / c.games).toFixed(1)}/{(c.deaths / c.games).toFixed(1)}/{(c.assists / c.games).toFixed(1)}</p>
                        <p className={`text-[10px] font-semibold ${kdaClr(c.avgKda, 1, 0)}`}>{c.avgKda.toFixed(2)} KDA</p>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-lol-dim text-right hidden sm:table-cell">{c.avgCs.toFixed(0)}</td>
                      <td className="px-3 py-2.5 text-sm text-lol-dim text-right hidden md:table-cell">{(c.avgDmg / 1000).toFixed(1)}k</td>
                      <td className="px-3 py-2.5 text-sm text-lol-gold/60 text-right hidden md:table-cell">{(c.avgGold / 1000).toFixed(1)}k</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center"><p className="text-lol-dim">No champion data available.</p></div>
          )}
        </div>
      )}

      {/* ============ PLAYED WITH TAB ============ */}
      {tab === 'playedWith' && (
        <div>
          {data.playedWith.length > 0 ? (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 bg-lol-dark/50 text-xs text-lol-dim uppercase tracking-wider">
                      <th className="px-4 py-2.5 text-left">Player</th>
                      <th className="px-3 py-2.5 text-right">Games Together</th>
                      <th className="px-3 py-2.5 text-right">Win Rate</th>
                      <th className="px-3 py-2.5 text-left hidden sm:table-cell">Last Played</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.playedWith.map(p => (
                      <tr key={p.name} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-2.5">
                          <span className="text-sm font-semibold text-lol-text">{p.name}</span>
                        </td>
                        <td className="px-3 py-2.5 text-sm text-lol-dim text-right">{p.games}</td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-10 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${p.winRate >= 50 ? 'bg-[#3cbc8d]' : 'bg-[#e9422e]'}`} style={{ width: `${p.winRate}%` }} />
                            </div>
                            <span className={`text-sm font-semibold ${p.winRate >= 55 ? 'text-emerald-400' : p.winRate <= 45 ? 'text-red-400' : 'text-lol-text'}`}>
                              {p.winRate.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <DDImg src={champIconUrl(p.lastChampion, p.lastChampId)} alt={p.lastChampion} className="w-5 h-5 rounded-full border border-white/10" />
                            <span className="text-xs text-lol-dim">{p.lastChampion}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center">
              <p className="text-lol-dim">No frequent teammates found.</p>
              <p className="text-xs text-lol-dim/50 mt-1">Players who appear in 2+ of your recent matches will show here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================ */
/*  Sub-components                                                   */
/* ================================================================ */

function RankCard({ rank, label }: { rank: RankInfo | undefined; label: string }) {
  if (!rank) return (
    <div className="bg-lol-dark/50 border border-white/5 rounded-lg px-4 py-3 text-center min-w-[140px]">
      <p className="text-[10px] text-lol-dim/60 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-lol-dim">Unranked</p>
    </div>
  );
  const tc = TIER_COLORS[rank.tier] || '#6b7280';
  const wr = rank.winRate > 1 ? rank.winRate : rank.winRate * 100;
  return (
    <div className="border rounded-lg px-4 py-3 text-center min-w-[140px]" style={{ borderColor: tc + '40', backgroundColor: tc + '08' }}>
      <p className="text-[10px] text-lol-dim/60 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-base font-extrabold" style={{ color: tc }}>{rank.tier} {rank.division}</p>
      <p className="text-sm text-lol-text font-semibold">{rank.lp} LP</p>
      <p className="text-[11px] text-lol-dim mt-0.5">{rank.wins}W {rank.losses}L <span className="text-lol-dim/60">({wr.toFixed(0)}%)</span></p>
      {rank.hotStreak && <span className="inline-block mt-1 text-[10px] text-orange-400 font-semibold">Hot Streak</span>}
    </div>
  );
}

function MatchCard({ match }: { match: MatchEntry }) {
  const qn = match.queueId ? (QUEUE_NAMES[match.queueId] || match.gameMode) : match.gameMode;
  const csm = match.gameDuration > 0 ? (match.cs / (match.gameDuration / 60)).toFixed(1) : '0';
  return (
    <div className={`card flex items-stretch overflow-hidden hover:bg-white/[0.02] transition-colors ${match.win ? 'border-l-[3px] border-l-[#3cbc8d]' : 'border-l-[3px] border-l-[#e9422e]'}`}>
      <div className={`w-14 shrink-0 flex flex-col items-center justify-center py-3 ${match.win ? 'bg-[#3cbc8d]/5' : 'bg-[#e9422e]/5'}`}>
        <span className={`text-xs font-extrabold ${match.win ? 'text-[#3cbc8d]' : 'text-[#e9422e]'}`}>{match.win ? 'WIN' : 'LOSS'}</span>
        <span className="text-[10px] text-lol-dim/50 mt-0.5">{fmtDuration(match.gameDuration)}</span>
      </div>
      <div className="flex items-center gap-3 px-3 py-2.5 shrink-0">
        <DDImg src={champIconUrl(match.championName, match.championId)} alt={match.championName} className="w-10 h-10 rounded-lg border border-white/10" />
        <div className="w-20">
          <p className="text-xs font-semibold text-lol-text truncate">{match.championName}</p>
          <p className="text-[10px] text-lol-dim/60">{ROLE_LABELS[match.role] || match.role || ''}</p>
        </div>
      </div>
      <div className="flex flex-col justify-center px-3 py-2.5 min-w-[100px]">
        <p className="text-sm font-semibold text-lol-text">{match.kills} / <span className="text-red-400">{match.deaths}</span> / {match.assists}</p>
        <p className={`text-xs font-semibold ${kdaClr(match.kills, match.deaths, match.assists)}`}>{kdaStr(match.kills, match.deaths, match.assists)} KDA</p>
      </div>
      <div className="hidden sm:flex flex-col justify-center px-3 py-2.5 min-w-[80px]">
        <p className="text-xs text-lol-text font-medium">{match.cs} CS <span className="text-lol-dim/60">({csm}/m)</span></p>
        {match.visionScore !== undefined && <p className="text-[10px] text-lol-dim">{match.visionScore} vision</p>}
      </div>
      <div className="hidden md:flex items-center gap-0.5 px-3 py-2.5 shrink-0">
        {match.items.slice(0, 7).map((id, i) => (
          <div key={i}>
            {id > 0 ? <DDImg src={itemIcon(id)} alt="" className="w-6 h-6 rounded border border-white/10" /> : <div className="w-6 h-6 rounded border border-white/5 bg-lol-dark" />}
          </div>
        ))}
      </div>
      <div className="flex-1" />
      <div className="flex flex-col items-end justify-center px-3 py-2.5 shrink-0">
        <p className="text-[10px] text-lol-dim/60">{qn}</p>
        <p className="text-[10px] text-lol-dim/40">{timeAgo(match.gameCreation)}</p>
        {match.goldEarned !== undefined && <p className="text-[10px] text-lol-gold/50 mt-0.5">{(match.goldEarned / 1000).toFixed(1)}k gold</p>}
      </div>
    </div>
  );
}
