import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchAllChampions,
  type DDChampion,
  championIcon,
  championSplash,
  DDImg,
} from '../lib/dataDragon';

/* ---------- Featured champions for the hero carousel ---------- */

const HERO_CHAMPIONS = [
  { id: 'Jinx', label: 'Most Popular ADC' },
  { id: 'Ahri', label: 'Most Popular Mid' },
  { id: 'LeeSin', label: 'Most Popular Jungler' },
  { id: 'Thresh', label: 'Most Popular Support' },
  { id: 'Darius', label: 'Most Popular Top' },
];

/* ---------- Quick stats data ---------- */

interface QuickStatEntry {
  ddId: string;
  name: string;
  value: number;
}

const QUICK_STATS: {
  title: string;
  color: 'blue' | 'green' | 'red';
  suffix: string;
  maxValue: number;
  entries: QuickStatEntry[];
}[] = [
  {
    title: 'Most Popular',
    color: 'blue',
    suffix: '%',
    maxValue: 20,
    entries: [
      { ddId: 'Ezreal', name: 'Ezreal', value: 14.2 },
      { ddId: 'Jinx', name: 'Jinx', value: 12.8 },
      { ddId: 'Lux', name: 'Lux', value: 11.5 },
      { ddId: 'Yasuo', name: 'Yasuo', value: 10.9 },
      { ddId: 'LeeSin', name: 'Lee Sin', value: 10.3 },
    ],
  },
  {
    title: 'Highest Winrate',
    color: 'green',
    suffix: '%',
    maxValue: 58,
    entries: [
      { ddId: 'Swain', name: 'Swain', value: 54.2 },
      { ddId: 'Zyra', name: 'Zyra', value: 53.8 },
      { ddId: 'Amumu', name: 'Amumu', value: 53.5 },
      { ddId: 'Yorick', name: 'Yorick', value: 53.1 },
      { ddId: 'Warwick', name: 'Warwick', value: 52.9 },
    ],
  },
  {
    title: 'Most Banned',
    color: 'red',
    suffix: '%',
    maxValue: 35,
    entries: [
      { ddId: 'Yasuo', name: 'Yasuo', value: 28.5 },
      { ddId: 'Zed', name: 'Zed', value: 24.3 },
      { ddId: 'Yuumi', name: 'Yuumi', value: 22.1 },
      { ddId: 'Samira', name: 'Samira', value: 19.8 },
      { ddId: 'Yone', name: 'Yone', value: 18.4 },
    ],
  },
];

const BAR_COLORS = {
  blue: 'bg-[#2796bc]',
  green: 'bg-[#3cbc8d]',
  red: 'bg-[#e9422e]',
};

/* ---------- Role filter for champion grid ---------- */

const ROLE_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'Fighter', label: 'Fighter' },
  { key: 'Tank', label: 'Tank' },
  { key: 'Mage', label: 'Mage' },
  { key: 'Assassin', label: 'Assassin' },
  { key: 'Marksman', label: 'Marksman' },
  { key: 'Support', label: 'Support' },
];

/* ---------- Component ---------- */

export default function HomePage() {
  const navigate = useNavigate();
  const [champions, setChampions] = useState<DDChampion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    fetchAllChampions()
      .then(setChampions)
      .catch(console.error)
      .finally(() => setLoading(false));
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

    // Check if it's a summoner search (Name#Tag)
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

    // Check if it matches a champion name
    const match = champions.find(
      (c) => c.name.toLowerCase() === q.toLowerCase() || c.id.toLowerCase() === q.toLowerCase(),
    );
    if (match) {
      navigate(`/champion/${match.id}`);
      setSearch('');
      return;
    }

    // Default: treat as summoner search
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
        {/* Background splash */}
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

        {/* Content */}
        <div className="relative h-full flex flex-col justify-center px-8 md:px-12 max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-extrabold text-lol-text mb-2">
            <span className="text-lol-gold">NEXUS</span> ORACLE
          </h1>
          <p className="text-sm md:text-base text-lol-dim mb-6">
            League of Legends Statistics, Tier Lists, Builds & Matchups
          </p>

          {/* Search bar */}
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
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <button type="submit" className="btn-primary px-6 py-3 rounded-lg text-sm font-semibold">
              Search
            </button>
          </form>

          {/* Hero indicator dots */}
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

        {/* Hero champion icon */}
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

      {/* ==================== QUICK STATS ==================== */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {QUICK_STATS.map((stat) => (
            <div
              key={stat.title}
              className="card p-4"
            >
              <h3 className="text-sm font-semibold text-lol-dim mb-3 uppercase tracking-wider">
                {stat.title}
              </h3>
              <div className="space-y-2">
                {stat.entries.map((entry, idx) => (
                  <Link
                    key={entry.ddId}
                    to={`/champion/${entry.ddId}`}
                    className="flex items-center gap-3 group hover:bg-white/[0.03] rounded px-1 py-0.5 -mx-1 transition-colors"
                  >
                    <span className="text-xs text-lol-dim/50 w-4 text-right font-mono">
                      {idx + 1}.
                    </span>
                    <DDImg
                      src={championIcon(entry.ddId)}
                      alt={entry.name}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-sm text-lol-text group-hover:text-lol-gold transition-colors flex-1 truncate">
                      {entry.name}
                    </span>
                    <div className="flex items-center gap-2 w-28">
                      <div className="flex-1 h-4 bg-white/5 rounded-sm overflow-hidden">
                        <div
                          className={`h-full ${BAR_COLORS[stat.color]} rounded-sm transition-all duration-500`}
                          style={{ width: `${(entry.value / stat.maxValue) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-lol-dim w-12 text-right">
                        {entry.value.toFixed(1)}{stat.suffix}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                to="/tierlist"
                className="block mt-3 text-center text-xs font-medium text-lol-blue hover:text-lol-gold transition-colors py-1.5 rounded bg-white/[0.02] hover:bg-white/[0.05]"
              >
                See more
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== ALL CHAMPIONS GRID ==================== */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-bold text-lol-text">All Champions</h2>

          {/* Role filters */}
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
