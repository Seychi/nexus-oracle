import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchAllChampions,
  type DDChampion,
  championIcon,
  championSplash,
  DDImg,
} from '../lib/dataDragon';
import { getStatsOverview, getStatsChampions, type StatsOverview, type StudioChampionStat } from '../lib/api';

/* ------------------------------------------------------------------ */
/*  Hero carousel                                                      */
/* ------------------------------------------------------------------ */

const HERO_CHAMPIONS = [
  { id: 'Jinx', label: 'Most Popular ADC' },
  { id: 'Ahri', label: 'Most Popular Mid' },
  { id: 'LeeSin', label: 'Most Popular Jungler' },
  { id: 'Thresh', label: 'Most Popular Support' },
  { id: 'Darius', label: 'Most Popular Top' },
];

/* ------------------------------------------------------------------ */
/*  Quick navigation cards                                             */
/* ------------------------------------------------------------------ */

const QUICK_NAV = [
  { to: '/tierlist', label: 'Tier List', desc: 'Champion rankings by tier', icon: 'S+', color: 'from-red-500/20 to-orange-500/10', border: 'border-red-500/20' },
  { to: '/leaderboards', label: 'Leaderboards', desc: 'Top players ranked', icon: '#1', color: 'from-lol-gold/20 to-yellow-500/10', border: 'border-lol-gold/20' },
  { to: '/data-studio', label: 'Data Studio', desc: 'Deep stats explorer', icon: 'DS', color: 'from-blue-500/20 to-cyan-500/10', border: 'border-blue-500/20' },
  { to: '/matches', label: 'Matches', desc: 'Browse all games', icon: 'VS', color: 'from-purple-500/20 to-pink-500/10', border: 'border-purple-500/20' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const ROLE_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'Fighter', label: 'Fighter' },
  { key: 'Tank', label: 'Tank' },
  { key: 'Mage', label: 'Mage' },
  { key: 'Assassin', label: 'Assassin' },
  { key: 'Marksman', label: 'Marksman' },
  { key: 'Support', label: 'Support' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const navigate = useNavigate();
  const [champions, setChampions] = useState<DDChampion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [heroIdx, setHeroIdx] = useState(0);

  // Live stats from API
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [topChamps, setTopChamps] = useState<{ winRate: StudioChampionStat[]; pickRate: StudioChampionStat[] }>({ winRate: [], pickRate: [] });

  useEffect(() => {
    fetchAllChampions()
      .then(setChampions)
      .catch(console.error)
      .finally(() => setLoading(false));

    // Fetch live stats
    getStatsOverview().then(setOverview).catch(() => {});
    getStatsChampions({ sort: 'winRate', order: 'desc' }).then((res) => {
      const top5WR = res.data.filter((c) => c.games >= 20).slice(0, 5);
      getStatsChampions({ sort: 'games', order: 'desc' }).then((res2) => {
        setTopChamps({ winRate: top5WR, pickRate: res2.data.slice(0, 5) });
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  // Hero carousel rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIdx((i) => (i + 1) % HERO_CHAMPIONS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;

    const hashIdx = q.lastIndexOf('#');
    if (hashIdx > 0 && hashIdx < q.length - 1) {
      const gameName = q.slice(0, hashIdx).trim();
      const tagLine = q.slice(hashIdx + 1).trim();
      if (gameName && tagLine) {
        navigate(`/summoner/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
        setSearch('');
        return;
      }
    }

    const match = champions.find(
      (c) => c.name.toLowerCase() === q.toLowerCase() || c.id.toLowerCase() === q.toLowerCase(),
    );
    if (match) {
      navigate(`/champion/${match.id}`);
      setSearch('');
      return;
    }

    navigate(`/summoner/${encodeURIComponent(q)}/${encodeURIComponent('NA1')}`);
    setSearch('');
  }

  const filteredChampions =
    roleFilter === 'ALL'
      ? champions
      : champions.filter((c) => c.tags.includes(roleFilter));

  const searchFiltered = search
    ? filteredChampions.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : filteredChampions;

  const hero = HERO_CHAMPIONS[heroIdx];

  return (
    <div className="space-y-6">
      {/* ==================== HERO SECTION ==================== */}
      <section className="relative rounded-xl overflow-hidden h-[280px] md:h-[320px]">
        <div className="absolute inset-0">
          <img
            src={championSplash(hero.id)}
            alt={hero.id}
            className="w-full h-full object-cover object-top transition-opacity duration-700"
            key={hero.id}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0e14]/95 via-[#0a0e14]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e14] via-transparent to-transparent" />
        </div>

        <div className="relative h-full flex flex-col justify-center px-8 md:px-12 max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-extrabold text-lol-text mb-2">
            <span className="text-lol-gold">NEXUS</span> ORACLE
          </h1>
          <p className="text-sm md:text-base text-lol-dim mb-6">
            League of Legends Statistics, Tier Lists, Builds, Leaderboards & Data Studio
          </p>

          <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Champion or Summoner (Name#Tag)..."
                className="w-full bg-[#0d1117]/80 backdrop-blur border border-white/10 rounded-lg px-4 py-3
                           text-sm text-lol-text placeholder:text-lol-dim/50
                           focus:outline-none focus:border-lol-gold/50 focus:ring-1 focus:ring-lol-gold/30
                           transition-colors"
              />
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lol-dim/40 pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <button type="submit" className="btn-primary px-6 py-3 rounded-lg text-sm font-semibold">
              Search
            </button>
          </form>

          <div className="flex gap-2 mt-4">
            {HERO_CHAMPIONS.map((h, i) => (
              <button
                key={h.id}
                onClick={() => setHeroIdx(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === heroIdx ? 'bg-lol-gold' : 'bg-white/20 hover:bg-white/40'
                }`}
                title={h.label}
              />
            ))}
          </div>
        </div>

        <div className="absolute bottom-4 right-8 flex items-center gap-3 bg-black/40 backdrop-blur rounded-lg px-4 py-2">
          <DDImg
            src={championIcon(hero.id)}
            alt={hero.id}
            className="w-10 h-10 rounded-full border-2 border-lol-gold/50"
          />
          <div>
            <p className="text-sm font-bold text-lol-text">{hero.id.replace(/([A-Z])/g, ' $1').trim()}</p>
            <p className="text-xs text-lol-gold">{hero.label}</p>
          </div>
        </div>
      </section>

      {/* ==================== LIVE STATS BANNER ==================== */}
      {overview && overview.totalMatches > 0 && (
        <section className="card-glow p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xl md:text-2xl font-extrabold text-lol-gold">{fmtNum(overview.totalMatches)}</p>
              <p className="text-[10px] text-lol-dim/60 uppercase tracking-wider">Matches Analyzed</p>
            </div>
            <div className="text-center">
              <p className="text-xl md:text-2xl font-extrabold text-lol-blue">{fmtNum(overview.uniquePlayers)}</p>
              <p className="text-[10px] text-lol-dim/60 uppercase tracking-wider">Players Tracked</p>
            </div>
            <div className="text-center">
              <p className="text-xl md:text-2xl font-extrabold text-lol-text">{overview.averages.kills.toFixed(1)}/{overview.averages.deaths.toFixed(1)}/{overview.averages.assists.toFixed(1)}</p>
              <p className="text-[10px] text-lol-dim/60 uppercase tracking-wider">Avg KDA</p>
            </div>
            <div className="text-center">
              <p className="text-xl md:text-2xl font-extrabold text-emerald-400">{Math.floor(overview.avgGameDuration / 60)}:{(overview.avgGameDuration % 60).toString().padStart(2, '0')}</p>
              <p className="text-[10px] text-lol-dim/60 uppercase tracking-wider">Avg Game Duration</p>
            </div>
          </div>
        </section>
      )}

      {/* ==================== QUICK NAVIGATION ==================== */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {QUICK_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`gradient-border p-4 rounded-xl hover:bg-white/[0.02] transition-all group`}
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} border ${item.border} flex items-center justify-center mb-3`}>
              <span className="text-sm font-extrabold text-lol-text">{item.icon}</span>
            </div>
            <h3 className="text-sm font-bold text-lol-text group-hover:text-lol-gold transition-colors">{item.label}</h3>
            <p className="text-[11px] text-lol-dim/60 mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </section>

      {/* ==================== TOP CHAMPIONS (from API) ==================== */}
      {(topChamps.winRate.length > 0 || topChamps.pickRate.length > 0) && (
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Highest Win Rate */}
            {topChamps.winRate.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-lol-dim uppercase tracking-wider">Highest Win Rate</h3>
                  <span className="text-[10px] text-lol-dim/40">min 20 games</span>
                </div>
                <div className="space-y-2">
                  {topChamps.winRate.map((c, idx) => {
                    const dd = champions.find((ch) => ch.name === c.championName || ch.key === String(c.championId));
                    const ddId = dd?.id || c.championName.replace(/[\s']/g, '');
                    return (
                      <Link
                        key={c.championId}
                        to={`/champion/${ddId}`}
                        className="flex items-center gap-3 group hover:bg-white/[0.03] rounded px-1 py-1 -mx-1 transition-colors"
                      >
                        <span className="text-xs text-lol-dim/50 w-4 text-right font-mono">{idx + 1}.</span>
                        <DDImg src={championIcon(ddId)} alt={c.championName} className="w-7 h-7 rounded-full border border-white/10" />
                        <span className="text-sm text-lol-text group-hover:text-lol-gold transition-colors flex-1 truncate">{c.championName}</span>
                        <div className="flex items-center gap-2 w-28">
                          <div className="flex-1 h-4 bg-white/5 rounded-sm overflow-hidden">
                            <div className="h-full bg-[#3cbc8d] rounded-sm" style={{ width: `${(c.winRate / 60) * 100}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-emerald-400 w-14 text-right">{c.winRate.toFixed(1)}%</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <Link to="/tierlist" className="block mt-3 text-center text-xs font-medium text-lol-blue hover:text-lol-gold transition-colors py-1.5 rounded bg-white/[0.02] hover:bg-white/[0.05]">
                  View full tier list
                </Link>
              </div>
            )}

            {/* Most Played */}
            {topChamps.pickRate.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-lol-dim uppercase tracking-wider">Most Played</h3>
                  <span className="text-[10px] text-lol-dim/40">by total games</span>
                </div>
                <div className="space-y-2">
                  {topChamps.pickRate.map((c, idx) => {
                    const dd = champions.find((ch) => ch.name === c.championName || ch.key === String(c.championId));
                    const ddId = dd?.id || c.championName.replace(/[\s']/g, '');
                    return (
                      <Link
                        key={c.championId}
                        to={`/champion/${ddId}`}
                        className="flex items-center gap-3 group hover:bg-white/[0.03] rounded px-1 py-1 -mx-1 transition-colors"
                      >
                        <span className="text-xs text-lol-dim/50 w-4 text-right font-mono">{idx + 1}.</span>
                        <DDImg src={championIcon(ddId)} alt={c.championName} className="w-7 h-7 rounded-full border border-white/10" />
                        <span className="text-sm text-lol-text group-hover:text-lol-gold transition-colors flex-1 truncate">{c.championName}</span>
                        <div className="flex items-center gap-2 w-28">
                          <div className="flex-1 h-4 bg-white/5 rounded-sm overflow-hidden">
                            <div className="h-full bg-[#2796bc] rounded-sm" style={{ width: `${Math.min((c.games / topChamps.pickRate[0].games) * 100, 100)}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-lol-dim w-14 text-right">{fmtNum(c.games)}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <Link to="/data-studio?tab=champions" className="block mt-3 text-center text-xs font-medium text-lol-blue hover:text-lol-gold transition-colors py-1.5 rounded bg-white/[0.02] hover:bg-white/[0.05]">
                  Explore in Data Studio
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ==================== ALL CHAMPIONS GRID ==================== */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-bold text-lol-text">All Champions</h2>
          <div className="flex items-center gap-1 bg-lol-dark rounded-lg p-1 border border-white/5">
            {ROLE_FILTERS.map((rf) => (
              <button
                key={rf.key}
                onClick={() => setRoleFilter(rf.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  roleFilter === rf.key
                    ? 'bg-lol-gold/15 text-lol-gold border border-lol-gold/30'
                    : 'text-lol-dim hover:text-lol-text hover:bg-white/5 border border-transparent'
                }`}
              >
                {rf.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-lol-gold/30 border-t-lol-gold rounded-full animate-spin" />
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
            {searchFiltered.map((champ) => (
              <Link
                key={champ.id}
                to={`/champion/${champ.id}`}
                className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-white/[0.04] transition-colors group"
              >
                <DDImg
                  src={championIcon(champ.id)}
                  alt={champ.name}
                  className="w-12 h-12 rounded-lg border border-white/10 group-hover:border-lol-gold/40 transition-colors"
                />
                <span className="text-[11px] text-lol-dim group-hover:text-lol-text text-center leading-tight truncate w-full transition-colors">
                  {champ.name}
                </span>
              </Link>
            ))}
          </div>
        )}

        {!loading && searchFiltered.length === 0 && (
          <p className="text-center text-lol-dim py-8">No champions found.</p>
        )}
      </section>
    </div>
  );
}
