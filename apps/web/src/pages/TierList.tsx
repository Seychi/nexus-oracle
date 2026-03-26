import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChampions, type ChampionListItem } from '../lib/api';
import { DDImg, championIcon } from '../lib/dataDragon';
import TierBadge from '../components/TierBadge';

const ROLES = ['ALL', 'TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const;
type Role = (typeof ROLES)[number];

const ROLE_ICONS: Record<Role, string> = {
  ALL: '\u2726',      // diamond
  TOP: '\u2191',      // arrow up
  JUNGLE: '\u2042',   // asterism
  MIDDLE: '\u25C6',   // diamond solid
  BOTTOM: '\u2193',   // arrow down
  UTILITY: '\u271A',  // cross
};

type SortKey = 'championName' | 'tier' | 'winRate' | 'pickRate' | 'banRate' | 'avgKda';
type SortOrder = 'asc' | 'desc';

const TIER_ORDER: Record<string, number> = { 'S+': 0, S: 1, A: 2, B: 3, C: 4 };

export default function TierList() {
  const navigate = useNavigate();
  const [champions, setChampions] = useState<ChampionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('tier');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const fetchData = useCallback(async (role: Role) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getChampions({
        role: role === 'ALL' ? undefined : role,
      });
      setChampions(data.champions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load champions');
      setChampions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedRole);
  }, [selectedRole, fetchData]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder(key === 'championName' || key === 'tier' ? 'asc' : 'desc');
    }
  }

  const sorted = useMemo(() => {
    const copy = [...champions];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'championName':
          cmp = a.championName.localeCompare(b.championName);
          break;
        case 'tier': {
          const ta = TIER_ORDER[a.tier?.toUpperCase()] ?? 5;
          const tb = TIER_ORDER[b.tier?.toUpperCase()] ?? 5;
          cmp = ta - tb;
          break;
        }
        case 'winRate':
          cmp = a.winRate - b.winRate;
          break;
        case 'pickRate':
          cmp = a.pickRate - b.pickRate;
          break;
        case 'banRate':
          cmp = a.banRate - b.banRate;
          break;
        case 'avgKda':
          cmp = a.avgKda - b.avgKda;
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [champions, sortKey, sortOrder]);

  function SortArrow({ column }: { column: SortKey }) {
    if (sortKey !== column) return null;
    return (
      <span className="ml-1 text-lol-gold">
        {sortOrder === 'asc' ? '\u25B2' : '\u25BC'}
      </span>
    );
  }

  const thClass =
    'px-3 py-2.5 text-left text-xs font-semibold text-lol-dim uppercase tracking-wider cursor-pointer hover:text-lol-text transition-colors select-none';
  const thRightClass =
    'px-3 py-2.5 text-right text-xs font-semibold text-lol-dim uppercase tracking-wider cursor-pointer hover:text-lol-text transition-colors select-none';

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-lol-text">Champion Tier List</h1>
        <p className="text-sm text-lol-dim mt-1">
          Updated for the latest patch. Click any champion for full details.
        </p>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-lol-card rounded-lg p-1 w-fit border border-white/5">
        {ROLES.map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${
                selectedRole === role
                  ? 'bg-lol-gold/15 text-lol-gold border border-lol-gold/30'
                  : 'text-lol-dim hover:text-lol-text hover:bg-white/5 border border-transparent'
              }`}
          >
            <span className="text-base">{ROLE_ICONS[role]}</span>
            <span>{role === 'ALL' ? 'All' : role.charAt(0) + role.slice(1).toLowerCase()}</span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-lol-gold/30 border-t-lol-gold rounded-full animate-spin" />
            <p className="text-sm text-lol-dim">Loading champions...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="card p-6 text-center">
          <p className="text-red-400 font-medium">Failed to load tier list</p>
          <p className="text-sm text-lol-dim mt-1">{error}</p>
          <button
            onClick={() => fetchData(selectedRole)}
            className="btn-primary mt-4 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && sorted.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-lol-dim text-lg">No champion data available</p>
          <p className="text-sm text-lol-dim/60 mt-1">
            The API may not have data for this role or patch yet.
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && sorted.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-lol-dark/50">
                  <th className={`${thClass} w-12`}>#</th>
                  <th className={thClass} onClick={() => handleSort('championName')}>
                    Champion
                    <SortArrow column="championName" />
                  </th>
                  <th className={thClass} onClick={() => handleSort('tier')}>
                    Tier
                    <SortArrow column="tier" />
                  </th>
                  <th className={thRightClass} onClick={() => handleSort('winRate')}>
                    Win Rate
                    <SortArrow column="winRate" />
                  </th>
                  <th className={thRightClass} onClick={() => handleSort('pickRate')}>
                    Pick Rate
                    <SortArrow column="pickRate" />
                  </th>
                  <th className={thRightClass} onClick={() => handleSort('banRate')}>
                    Ban Rate
                    <SortArrow column="banRate" />
                  </th>
                  <th className={thRightClass} onClick={() => handleSort('avgKda')}>
                    Avg KDA
                    <SortArrow column="avgKda" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((champ, idx) => (
                  <tr
                    key={`${champ.championId}-${champ.role}`}
                    onClick={() =>
                      navigate(
                        `/champion/${champ.championId}${champ.role ? `?role=${champ.role}` : ''}`,
                      )
                    }
                    className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors group"
                  >
                    <td className="px-3 py-2.5 text-xs text-lol-dim font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <DDImg
                          src={championIcon(champ.championId)}
                          alt={champ.championName}
                          className="w-8 h-8 rounded-full border border-white/10 group-hover:border-lol-gold/40 transition-colors"
                        />
                        <div>
                          <p className="text-sm font-semibold text-lol-text group-hover:text-lol-gold transition-colors">
                            {champ.championName}
                          </p>
                          {champ.role && (
                            <p className="text-[11px] text-lol-dim capitalize">
                              {champ.role.toLowerCase()}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <TierBadge tier={champ.tier} />
                    </td>
                    <td
                      className={`px-3 py-2.5 text-sm font-semibold text-right ${
                        champ.winRate >= 52
                          ? 'stat-green'
                          : champ.winRate <= 48
                            ? 'stat-red'
                            : 'stat-neutral'
                      }`}
                    >
                      {champ.winRate.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-sm text-lol-dim text-right">
                      {champ.pickRate.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-sm text-lol-dim text-right">
                      {champ.banRate.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-sm text-lol-blue font-semibold text-right">
                      {champ.avgKda.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
