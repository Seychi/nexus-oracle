import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  getStatsOverview,
  getStatsChampions,
  getStatsRoles,
  getStatsItems,
  type StatsOverview,
  type StudioChampionStat,
  type RoleStat,
  type ItemStat,
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

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'champions', label: 'Champions' },
  { key: 'roles', label: 'Roles' },
  { key: 'items', label: 'Items' },
] as const;

type TabKey = typeof TABS[number]['key'];

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

const ROLE_LABELS: Record<string, string> = {
  TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'ADC', UTILITY: 'Support',
};

const ROLE_COLORS: Record<string, string> = {
  TOP: '#e9422e', JUNGLE: '#3cbc8d', MIDDLE: '#2796bc', BOTTOM: '#c8aa6e', UTILITY: '#9d48e0',
};

const CHAMPION_SORT_OPTIONS = [
  { value: 'games', label: 'Games' },
  { value: 'winRate', label: 'Win Rate' },
  { value: 'pickRate', label: 'Pick Rate' },
  { value: 'kda', label: 'KDA' },
  { value: 'avgDamage', label: 'Damage' },
  { value: 'avgGold', label: 'Gold' },
  { value: 'avgCs', label: 'CS' },
  { value: 'avgVision', label: 'Vision' },
  { value: 'avgKills', label: 'Kills' },
  { value: 'avgDeaths', label: 'Deaths' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDuration(sec: number): string {
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
}

function champIconUrl(name: string, id: number): string {
  const bk = getChampionByKey(id);
  return bk ? championIcon(bk.id) : resolveChampionIcon(name);
}

function wrColor(wr: number): string {
  if (wr >= 55) return 'text-emerald-400';
  if (wr >= 50) return 'text-lol-text';
  if (wr >= 45) return 'text-orange-400';
  return 'text-red-400';
}

function kdaColor(kda: number): string {
  if (kda >= 5) return 'text-lol-gold';
  if (kda >= 3) return 'text-emerald-400';
  if (kda >= 2) return 'text-lol-blue';
  return 'text-lol-dim';
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function DataStudioPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as TabKey) || 'overview';
  const role = searchParams.get('role') || '';
  const queue = searchParams.get('queue') || '';
  const sort = searchParams.get('sort') || 'games';

  const setFilter = useCallback((key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }, [setSearchParams]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-lol-text flex items-center gap-3">
          <span className="w-1.5 h-7 bg-lol-gold rounded-full" />
          Data Studio
        </h1>
        <p className="text-sm text-lol-dim mt-1 ml-4">
          Comprehensive League of Legends statistics explorer
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter('tab', t.key)}
            className={`px-5 py-2.5 text-sm font-semibold transition-colors relative ${
              tab === t.key ? 'text-lol-gold' : 'text-lol-dim hover:text-lol-text'
            }`}
          >
            {t.label}
            {tab === t.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-lol-gold rounded-full" />}
          </button>
        ))}
      </div>

      {/* Filters bar */}
      {tab !== 'overview' && (
        <div className="card p-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-lol-dim/60 uppercase tracking-wider mr-1">Role:</span>
            {ROLE_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setFilter('role', o.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  role === o.value
                    ? 'bg-lol-gold/15 text-lol-gold border border-lol-gold/30'
                    : 'text-lol-dim/60 hover:text-lol-text hover:bg-white/5 border border-transparent'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-lol-dim/60 uppercase tracking-wider mr-1">Queue:</span>
            <select
              value={queue}
              onChange={(e) => setFilter('queue', e.target.value)}
              className="bg-lol-dark border border-white/10 rounded-lg px-2.5 py-1 text-xs text-lol-text focus:outline-none focus:border-lol-gold/50 cursor-pointer"
            >
              {QUEUE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {tab === 'champions' && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-lol-dim/60 uppercase tracking-wider mr-1">Sort:</span>
              <select
                value={sort}
                onChange={(e) => setFilter('sort', e.target.value)}
                className="bg-lol-dark border border-white/10 rounded-lg px-2.5 py-1 text-xs text-lol-text focus:outline-none focus:border-lol-gold/50 cursor-pointer"
              >
                {CHAMPION_SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab queue={queue} role={role} />}
      {tab === 'champions' && <ChampionsTab role={role} queue={queue} sort={sort} />}
      {tab === 'roles' && <RolesTab queue={queue} />}
      {tab === 'items' && <ItemsTab role={role} queue={queue} />}
    </div>
  );
}

/* ================================================================== */
/*  Overview Tab                                                       */
/* ================================================================== */

function OverviewTab({ queue, role }: { queue: string; role: string }) {
  const [data, setData] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getStatsOverview({ queue: queue || undefined, role: role || undefined })
      .then((d) => { if (!cancelled) setData(d); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [queue, role]);

  if (loading) return <Spinner />;
  if (!data) return <EmptyState text="No data available" />;

  const stats = [
    { label: 'Total Matches', value: fmtNum(data.totalMatches), color: 'text-lol-gold' },
    { label: 'Unique Players', value: fmtNum(data.uniquePlayers), color: 'text-lol-blue' },
    { label: 'Total Participants', value: fmtNum(data.totalParticipants), color: 'text-lol-text' },
    { label: 'Avg Game Duration', value: fmtDuration(data.avgGameDuration), color: 'text-lol-text' },
  ];

  const avgStats = [
    { label: 'Avg Kills', value: data.averages.kills.toFixed(1), icon: '🗡', color: 'text-red-400' },
    { label: 'Avg Deaths', value: data.averages.deaths.toFixed(1), icon: '💀', color: 'text-gray-400' },
    { label: 'Avg Assists', value: data.averages.assists.toFixed(1), icon: '🤝', color: 'text-emerald-400' },
    { label: 'Avg Damage', value: fmtNum(data.averages.damage), icon: '💥', color: 'text-orange-400' },
    { label: 'Avg Gold', value: fmtNum(data.averages.gold), icon: '💰', color: 'text-lol-gold' },
    { label: 'Avg CS', value: data.averages.cs.toFixed(0), icon: '🌾', color: 'text-yellow-400' },
    { label: 'Avg Vision', value: data.averages.vision.toFixed(1), icon: '👁', color: 'text-lol-blue' },
    { label: 'Avg Wards Placed', value: data.averages.wardsPlaced.toFixed(1), icon: '🔭', color: 'text-cyan-400' },
    { label: 'Avg Wards Killed', value: data.averages.wardsKilled.toFixed(1), icon: '🔴', color: 'text-pink-400' },
    { label: 'Dmg Taken', value: fmtNum(data.averages.damageTaken), icon: '🛡', color: 'text-blue-400' },
  ];

  const totalStats = [
    { label: 'Total Kills', value: fmtNum(data.totals.kills) },
    { label: 'Total Deaths', value: fmtNum(data.totals.deaths) },
    { label: 'Total Assists', value: fmtNum(data.totals.assists) },
  ];

  return (
    <div className="space-y-4">
      {/* Big numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className="text-[10px] font-bold text-lol-dim/60 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Average stats grid */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-lol-dim uppercase tracking-wider mb-4">Average Per Player</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {avgStats.map((s) => (
            <div key={s.label} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-xl">{s.icon}</span>
              <div>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-lol-dim/60">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Averages bar chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-bold text-lol-dim uppercase tracking-wider mb-4">Average Stats Comparison</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={[
                { name: 'Kills', value: data.averages.kills, fill: '#e9422e' },
                { name: 'Deaths', value: data.averages.deaths, fill: '#6b7280' },
                { name: 'Assists', value: data.averages.assists, fill: '#3cbc8d' },
                { name: 'CS', value: data.averages.cs / 10, fill: '#c8aa6e' },
                { name: 'Vision', value: data.averages.vision, fill: '#2796bc' },
              ]}
              margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
            >
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#141a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: any, name: any) => [String(name) === 'CS' ? (Number(v) * 10).toFixed(0) : Number(v).toFixed(1), String(name)]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Cell key={i} fill={['#e9422e', '#6b7280', '#3cbc8d', '#c8aa6e', '#2796bc'][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Totals */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-lol-dim uppercase tracking-wider mb-4">Aggregate Totals</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {totalStats.map((s) => (
              <div key={s.label} className="text-center p-4 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-xl font-extrabold text-lol-text">{s.value}</p>
                <p className="text-[10px] text-lol-dim/60 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {/* KDA ratio bar */}
          <div className="mt-4">
            <p className="text-[10px] text-lol-dim/60 uppercase tracking-wider mb-2">Kill Participation Ratio</p>
            <div className="h-6 rounded-full overflow-hidden flex">
              <div className="bg-[#e9422e] flex items-center justify-center" style={{ width: `${(data.totals.kills / (data.totals.kills + data.totals.deaths + data.totals.assists)) * 100}%` }}>
                <span className="text-[9px] font-bold text-white/80">K</span>
              </div>
              <div className="bg-[#6b7280] flex items-center justify-center" style={{ width: `${(data.totals.deaths / (data.totals.kills + data.totals.deaths + data.totals.assists)) * 100}%` }}>
                <span className="text-[9px] font-bold text-white/80">D</span>
              </div>
              <div className="bg-[#3cbc8d] flex items-center justify-center" style={{ width: `${(data.totals.assists / (data.totals.kills + data.totals.deaths + data.totals.assists)) * 100}%` }}>
                <span className="text-[9px] font-bold text-white/80">A</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Champions Tab                                                      */
/* ================================================================== */

function ChampionsTab({ role, queue, sort }: { role: string; queue: string; sort: string }) {
  const [champions, setChampions] = useState<StudioChampionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAllChampions().catch(() => []);
    getStatsChampions({
      role: role || undefined,
      queue: queue || undefined,
      sort,
      order: 'desc',
    })
      .then((res) => { if (!cancelled) setChampions(res.data); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [role, queue, sort]);

  if (loading) return <Spinner />;
  if (champions.length === 0) return <EmptyState text="No champion data" />;

  const filtered = search
    ? champions.filter((c) => c.championName.toLowerCase().includes(search.toLowerCase()))
    : champions;

  const maxGames = Math.max(...champions.map((c) => c.games));

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative w-64">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter champions..."
          className="w-full bg-lol-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-lol-text placeholder:text-lol-dim/40
                     focus:outline-none focus:border-lol-gold/50 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-lol-dark/50 text-[10px] text-lol-dim uppercase tracking-wider">
                <th className="px-3 py-2.5 text-center w-10">#</th>
                <th className="px-3 py-2.5 text-left">Champion</th>
                <th className="px-3 py-2.5 text-center">Games</th>
                <th className="px-3 py-2.5 text-center">Win%</th>
                <th className="px-3 py-2.5 text-center">Pick%</th>
                <th className="px-3 py-2.5 text-center">KDA</th>
                <th className="px-3 py-2.5 text-center hidden sm:table-cell">K/D/A</th>
                <th className="px-3 py-2.5 text-center hidden md:table-cell">DMG</th>
                <th className="px-3 py-2.5 text-center hidden md:table-cell">DMG Taken</th>
                <th className="px-3 py-2.5 text-center hidden lg:table-cell">Gold</th>
                <th className="px-3 py-2.5 text-center hidden lg:table-cell">CS</th>
                <th className="px-3 py-2.5 text-center hidden xl:table-cell">Vision</th>
                <th className="px-3 py-2.5 text-center hidden xl:table-cell">Wards</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => (
                <tr key={c.championId} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2 text-center text-xs text-lol-dim/50 font-mono">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      <DDImg
                        src={champIconUrl(c.championName, c.championId)}
                        alt={c.championName}
                        className="w-8 h-8 rounded-lg border border-white/10"
                      />
                      <div>
                        <p className="text-xs font-semibold text-lol-text">{c.championName}</p>
                        {/* Games bar */}
                        <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden mt-0.5">
                          <div className="h-full bg-lol-gold/40 rounded-full" style={{ width: `${(c.games / maxGames) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-lol-dim">{c.games}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs font-semibold ${wrColor(c.winRate)}`}>{c.winRate.toFixed(1)}%</span>
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-lol-dim">{c.pickRate.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs font-semibold ${kdaColor(c.kda)}`}>{c.kda.toFixed(2)}</span>
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-lol-text hidden sm:table-cell">
                    {c.avgKills.toFixed(1)}/{c.avgDeaths.toFixed(1)}/{c.avgAssists.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-orange-400/70 hidden md:table-cell">
                    {(c.avgDamage / 1000).toFixed(1)}k
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-blue-400/50 hidden md:table-cell">
                    {(c.avgDamageTaken / 1000).toFixed(1)}k
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-lol-gold/50 hidden lg:table-cell">
                    {(c.avgGold / 1000).toFixed(1)}k
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-lol-dim hidden lg:table-cell">
                    {c.avgCs.toFixed(0)}
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-lol-blue/50 hidden xl:table-cell">
                    {c.avgVision.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-center text-[10px] text-lol-dim/50 hidden xl:table-cell">
                    {c.avgWardsPlaced.toFixed(1)}p / {c.avgWardsKilled.toFixed(1)}k
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Roles Tab                                                          */
/* ================================================================== */

function RolesTab({ queue }: { queue: string }) {
  const [roles, setRoles] = useState<RoleStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getStatsRoles({ queue: queue || undefined })
      .then((res) => { if (!cancelled) setRoles(res.data); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [queue]);

  if (loading) return <Spinner />;
  if (roles.length === 0) return <EmptyState text="No role data" />;

  const maxGames = Math.max(...roles.map((r) => r.games));
  const roleOrder = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];
  const sorted = [...roles].sort(
    (a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role),
  );

  return (
    <div className="space-y-4">
      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {sorted.map((r) => {
          const color = ROLE_COLORS[r.role] || '#6b7280';
          return (
            <div
              key={r.role}
              className="card p-4 border-t-2"
              style={{ borderTopColor: color }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold" style={{ color }}>{ROLE_LABELS[r.role] || r.role}</h3>
                <span className="text-[10px] text-lol-dim/50">{r.games} games</span>
              </div>
              <div className="space-y-2">
                <StatRow label="Win Rate" value={`${r.winRate.toFixed(1)}%`} valueColor={wrColor(r.winRate)} />
                <StatRow label="Avg K/D/A" value={`${r.avgKills.toFixed(1)}/${r.avgDeaths.toFixed(1)}/${r.avgAssists.toFixed(1)}`} />
                <StatRow label="Avg Damage" value={`${(r.avgDamage / 1000).toFixed(1)}k`} valueColor="text-orange-400/70" />
                <StatRow label="Dmg Taken" value={`${(r.avgDamageTaken / 1000).toFixed(1)}k`} valueColor="text-blue-400/50" />
                <StatRow label="Avg Gold" value={`${(r.avgGold / 1000).toFixed(1)}k`} valueColor="text-lol-gold/60" />
                <StatRow label="Avg CS" value={r.avgCs.toFixed(0)} />
                <StatRow label="Avg Vision" value={r.avgVision.toFixed(1)} valueColor="text-lol-blue/50" />
              </div>
              {/* Games bar */}
              <div className="mt-3 pt-3 border-t border-white/5">
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(r.games / maxGames) * 100}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Radar chart comparing roles */}
      {sorted.length >= 3 && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-lol-dim uppercase tracking-wider mb-4">Role Radar Comparison</h3>
          <div className="flex justify-center">
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart
                data={(() => {
                  const maxD = Math.max(...sorted.map((r) => r.avgDamage));
                  const maxG = Math.max(...sorted.map((r) => r.avgGold));
                  const maxCS = Math.max(...sorted.map((r) => r.avgCs));
                  const maxV = Math.max(...sorted.map((r) => r.avgVision));
                  const maxK = Math.max(...sorted.map((r) => r.avgKills));
                  return [
                    { stat: 'Kills', ...Object.fromEntries(sorted.map((r) => [r.role, (r.avgKills / maxK) * 100])) },
                    { stat: 'Damage', ...Object.fromEntries(sorted.map((r) => [r.role, (r.avgDamage / maxD) * 100])) },
                    { stat: 'Gold', ...Object.fromEntries(sorted.map((r) => [r.role, (r.avgGold / maxG) * 100])) },
                    { stat: 'CS', ...Object.fromEntries(sorted.map((r) => [r.role, (r.avgCs / maxCS) * 100])) },
                    { stat: 'Vision', ...Object.fromEntries(sorted.map((r) => [r.role, (r.avgVision / maxV) * 100])) },
                  ];
                })()}
              >
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="stat" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                {sorted.map((r) => (
                  <Radar
                    key={r.role}
                    name={ROLE_LABELS[r.role] || r.role}
                    dataKey={r.role}
                    stroke={ROLE_COLORS[r.role] || '#6b7280'}
                    fill={ROLE_COLORS[r.role] || '#6b7280'}
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                ))}
                <Tooltip
                  contentStyle={{ background: '#141a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2">
            {sorted.map((r) => (
              <div key={r.role} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ROLE_COLORS[r.role] || '#6b7280' }} />
                <span className="text-[10px] text-lol-dim">{ROLE_LABELS[r.role] || r.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-lol-dark/50 text-[10px] text-lol-dim uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left">Role</th>
                <th className="px-3 py-2.5 text-center">Games</th>
                <th className="px-3 py-2.5 text-center">Win%</th>
                <th className="px-3 py-2.5 text-center">Kills</th>
                <th className="px-3 py-2.5 text-center">Deaths</th>
                <th className="px-3 py-2.5 text-center">Assists</th>
                <th className="px-3 py-2.5 text-center">Damage</th>
                <th className="px-3 py-2.5 text-center hidden sm:table-cell">Dmg Taken</th>
                <th className="px-3 py-2.5 text-center hidden md:table-cell">Gold</th>
                <th className="px-3 py-2.5 text-center hidden md:table-cell">CS</th>
                <th className="px-3 py-2.5 text-center hidden lg:table-cell">Vision</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.role} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ROLE_COLORS[r.role] }} />
                      <span className="text-sm font-semibold text-lol-text">{ROLE_LABELS[r.role] || r.role}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-lol-dim">{r.games}</td>
                  <td className="px-3 py-2.5 text-center"><span className={`text-xs font-semibold ${wrColor(r.winRate)}`}>{r.winRate.toFixed(1)}%</span></td>
                  <td className="px-3 py-2.5 text-center text-xs text-lol-text">{r.avgKills.toFixed(1)}</td>
                  <td className="px-3 py-2.5 text-center text-xs text-red-400/70">{r.avgDeaths.toFixed(1)}</td>
                  <td className="px-3 py-2.5 text-center text-xs text-emerald-400/70">{r.avgAssists.toFixed(1)}</td>
                  <td className="px-3 py-2.5 text-center text-xs text-orange-400/70">{(r.avgDamage / 1000).toFixed(1)}k</td>
                  <td className="px-3 py-2.5 text-center text-xs text-blue-400/50 hidden sm:table-cell">{(r.avgDamageTaken / 1000).toFixed(1)}k</td>
                  <td className="px-3 py-2.5 text-center text-xs text-lol-gold/50 hidden md:table-cell">{(r.avgGold / 1000).toFixed(1)}k</td>
                  <td className="px-3 py-2.5 text-center text-xs text-lol-dim hidden md:table-cell">{r.avgCs.toFixed(0)}</td>
                  <td className="px-3 py-2.5 text-center text-xs text-lol-blue/50 hidden lg:table-cell">{r.avgVision.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Items Tab                                                          */
/* ================================================================== */

function ItemsTab({ role, queue }: { role: string; queue: string }) {
  const [items, setItems] = useState<ItemStat[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getStatsItems({ role: role || undefined, queue: queue || undefined })
      .then((res) => {
        if (!cancelled) {
          setItems(res.data);
          setTotalGames(res.totalGames);
        }
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [role, queue]);

  if (loading) return <Spinner />;
  if (items.length === 0) return <EmptyState text="No item data" />;

  return (
    <div className="space-y-3">
      <p className="text-xs text-lol-dim/60">
        Based on {fmtNum(totalGames)} games analyzed. Minimum 10 appearances to display.
      </p>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-lol-dark/50 text-[10px] text-lol-dim uppercase tracking-wider">
                <th className="px-3 py-2.5 text-center w-10">#</th>
                <th className="px-3 py-2.5 text-left">Item</th>
                <th className="px-3 py-2.5 text-center">Games</th>
                <th className="px-3 py-2.5 text-center">Pick Rate</th>
                <th className="px-3 py-2.5 text-center">Win Rate</th>
                <th className="px-3 py-2.5 text-center">Wins</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.itemId} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2 text-center text-xs text-lol-dim/50 font-mono">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      <DDImg
                        src={itemIcon(item.itemId)}
                        alt={String(item.itemId)}
                        className="w-8 h-8 rounded-lg border border-white/10"
                      />
                      <span className="text-xs text-lol-dim/50 font-mono">#{item.itemId}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-lol-dim">{item.games}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-lol-blue/50 rounded-full" style={{ width: `${Math.min(item.pickRate, 100)}%` }} />
                      </div>
                      <span className="text-xs text-lol-dim">{item.pickRate.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${item.winRate >= 50 ? 'bg-[#3cbc8d]' : 'bg-[#e9422e]'}`} style={{ width: `${item.winRate}%` }} />
                      </div>
                      <span className={`text-xs font-semibold ${wrColor(item.winRate)}`}>{item.winRate.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-lol-dim">{item.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Shared components                                                  */
/* ================================================================== */

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-lol-gold/30 border-t-lol-gold rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="card p-12 text-center">
      <p className="text-lg text-lol-dim font-semibold">{text}</p>
      <p className="text-sm text-lol-dim/60 mt-1">Try adjusting your filters.</p>
    </div>
  );
}

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-lol-dim/60">{label}</span>
      <span className={`text-xs font-semibold ${valueColor || 'text-lol-text'}`}>{value}</span>
    </div>
  );
}
