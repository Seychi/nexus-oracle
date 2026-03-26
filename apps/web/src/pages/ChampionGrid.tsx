import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchAllChampions,
  type DDChampion,
  championIcon,
  DDImg,
} from '../lib/dataDragon';

const ROLE_FILTERS = [
  { key: 'ALL', label: 'All', icon: '\u2726' },
  { key: 'Fighter', label: 'Fighters', icon: '\u2694' },
  { key: 'Tank', label: 'Tanks', icon: '\u26E8' },
  { key: 'Mage', label: 'Mages', icon: '\u2604' },
  { key: 'Assassin', label: 'Assassins', icon: '\u2620' },
  { key: 'Marksman', label: 'Marksmen', icon: '\u27B3' },
  { key: 'Support', label: 'Supports', icon: '\u271A' },
];

export default function ChampionGrid() {
  const [champions, setChampions] = useState<DDChampion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAllChampions()
      .then(setChampions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = champions
    .filter((c) => filter === 'ALL' || c.tags.includes(filter))
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-lol-text">All Champions</h1>
        <p className="text-sm text-lol-dim mt-1">
          Browse all {champions.length} champions. Click any champion for details.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Role filters */}
        <div className="flex items-center gap-1 bg-lol-card rounded-lg p-1 border border-white/5">
          {ROLE_FILTERS.map((rf) => (
            <button
              key={rf.key}
              onClick={() => setFilter(rf.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filter === rf.key
                  ? 'bg-lol-gold/15 text-lol-gold border border-lol-gold/30'
                  : 'text-lol-dim hover:text-lol-text hover:bg-white/5 border border-transparent'
              }`}
            >
              <span>{rf.icon}</span>
              {rf.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter champions..."
            className="w-48 bg-lol-dark border border-white/10 rounded-md px-3 py-1.5 text-sm
                       text-lol-text placeholder:text-lol-dim/50
                       focus:outline-none focus:border-lol-gold/50 transition-colors"
          />
        </div>

        <span className="text-xs text-lol-dim ml-auto">{filtered.length} champions</span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-lol-gold/30 border-t-lol-gold rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
          {filtered.map((champ) => (
            <Link
              key={champ.id}
              to={`/champion/${champ.id}`}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg card hover:border-lol-gold/30 transition-all group"
            >
              <DDImg
                src={championIcon(champ.id)}
                alt={champ.name}
                className="w-14 h-14 rounded-lg border border-white/10 group-hover:border-lol-gold/40 transition-colors"
              />
              <div className="text-center">
                <p className="text-xs text-lol-text group-hover:text-lol-gold truncate w-full transition-colors font-medium">
                  {champ.name}
                </p>
                <p className="text-[10px] text-lol-dim/50 italic">
                  {champ.tags[0]}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
