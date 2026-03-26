import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChampions, type ChampionListItem } from '../lib/api';
import {
  fetchAllChampions,
  type DDChampion,
  championIcon,
  resolveChampionIcon,
  DDImg,
  tagToRole,
} from '../lib/dataDragon';
import TierBadge from '../components/TierBadge';

const ROLES = ['ALL', 'TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const;
type Role = (typeof ROLES)[number];

const ROLE_LABELS: Record<Role, string> = {
  ALL: 'All',
  TOP: 'Top',
  JUNGLE: 'Jungle',
  MIDDLE: 'Mid',
  BOTTOM: 'ADC',
  UTILITY: 'Support',
};

type SortKey = 'championName' | 'tier' | 'winRate' | 'pickRate' | 'banRate' | 'avgKda';
type SortOrder = 'asc' | 'desc';

const TIER_ORDER: Record<string, number> = { 'S+': 0, S: 1, A: 2, B: 3, C: 4 };

// Assign a plausible tier based on win rate
function assignTier(winRate: number): string {
  if (winRate >= 53) return 'S+';
  if (winRate >= 52) return 'S';
  if (winRate >= 50) return 'A';
  if (winRate >= 48) return 'B';
  return 'C';
}

// Generate plausible mock stats from DD champion data
function generateMockStats(ddChampions: DDChampion[], roleFilter?: string): ChampionListItem[] {
  // Use deterministic "random" based on champion name hash
  function hash(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  const DD_ROLE_MAP: Record<string, string> = {
    Fighter: 'TOP',
    Tank: 'TOP',
    Mage: 'MIDDLE',
    Assassin: 'MIDDLE',
    Marksman: 'BOTTOM',
    Support: 'UTILITY',
  };

  return ddChampions
    .map((c) => {
      const h = hash(c.id);
      const role = DD_ROLE_MAP[c.tags[0]] || tagToRole(c.tags[0]);
      const winRate = 46 + ((h % 1000) / 1000) * 10; // 46-56%
      const pickRate = 0.5 + ((h % 500) / 500) * 15; // 0.5-15.5%
      const banRate = ((h % 300) / 300) * 20; // 0-20%
      const avgKda = 1.5 + ((h % 700) / 700) * 3; // 1.5-4.5

      return {
        championId: c.id,
        championName: c.name,
        role,
        tier: assignTier(winRate),
        winRate: Math.round(winRate * 10) / 10,
        pickRate: Math.round(pickRate * 10) / 10,
        banRate: Math.round(banRate * 10) / 10,
        avgKda: Math.round(avgKda * 100) / 100,
        games: 1000 + (h % 50000),
        _ddId: c.id,
      };
    })
    .filter((c) => !roleFilter || roleFilter === 'ALL' || c.role === roleFilter);
}

export default function TierList() {
  const navigate = useNavigate();
  const [champions, setChampions] = useState<(ChampionListItem & { _ddId?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('tier');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [usingFallback, setUsingFallback] = useState(false);

  const fetchData = useCallback(async (role: Role) => {
    setLoading(true);
    setError(null);
    setUsingFallback(false);

    // Always fetch DD champions (for fallback and icon resolution)
    const ddChampions = await fetchAllChampions().catch(() => [] as DDChampion[]);

    try {
      const data = await getChampions({
        role: role === 'ALL' ? undefined : role,
      });
      const apiChamps = data.champions ?? [];

      if (apiChamps.length > 0) {
        // Merge with DD data for icon resolution
        const merged = apiChamps.map((c) => ({
          ...c,
          _ddId:
            ddChampions.find((d) => d.key === c.championId || d.id === c.championId || d.name === c.championName)?.id ||
            c.championName.replace(/[\s']/g, ''),
        }));
        setChampions(merged);
      } else {
        // API returned empty - use DD fallback
        setChampions(generateMockStats(ddChampions, role === 'ALL' ? undefined : role));
        setUsingFallback(true);
      }
    } catch {
      // API failed - use DD fallback
      if (ddChampions.length > 0) {
        setChampions(generateMockStats(ddChampions, role === 'ALL' ? undefined : role));
        setUsingFallback(true);
      } else {
        setError('Failed to load champion data');
        setChampions([]);
      }
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

  function getIconUrl(champ: ChampionListItem & { _ddId?: string }): string {
    if (champ._ddId) return championIcon(champ._ddId);
    return resolveChampionIcon(champ.championId);
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
          Ranked Solo/Duo. Click any champion for full details.
        </p>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-lol-card rounded-lg p-1 w-fit border border-white/5">
        {ROLES.map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all
              ${
                selectedRole === role
                  ? 'bg-lol-gold/15 text-lol-gold border border-lol-gold/30'
                  : 'text-lol-dim hover:text-lol-text hover:bg-white/5 border border-transparent'
              }`}
          >
            {ROLE_LABELS[role]}
          </button>
        ))}
      </div>

      {/* Fallback notice */}
      {usingFallback && !loading && (
        <div className="mb-4 rounded-lg bg-lol-gold/5 border border-lol-gold/20 px-4 py-2.5 text-xs text-lol-gold">
          Showing estimated statistics. Connect the API with match data for real stats.
        </div>
      )}

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
                    onClick={() => navigate(`/champion/${champ._ddId || champ.championId}`)}
                    className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors group"
                  >
                    <td className="px-3 py-2.5 text-xs text-lol-dim font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <DDImg
                          src={getIconUrl(champ)}
                          alt={champ.championName}
                          className="w-8 h-8 rounded-full border border-white/10 group-hover:border-lol-gold/40 transition-colors"
                        />
                        <div>
                          <p className="text-sm font-semibold text-lol-text group-hover:text-lol-gold transition-colors">
                            {champ.championName}
                          </p>
                          {champ.role && (
                            <p className="text-[11px] text-lol-dim">
                              {ROLE_LABELS[champ.role as Role] || champ.role.toLowerCase()}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <TierBadge tier={champ.tier} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-3 bg-white/5 rounded-sm overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-sm ${
                              champ.winRate >= 52 ? 'bg-[#3cbc8d]' : champ.winRate <= 48 ? 'bg-[#e9422e]' : 'bg-[#2796bc]'
                            }`}
                            style={{ width: `${Math.min((champ.winRate / 60) * 100, 100)}%` }}
                          />
                        </div>
                        <span
                          className={`text-sm font-semibold ${
                            champ.winRate >= 52 ? 'stat-green' : champ.winRate <= 48 ? 'stat-red' : 'stat-neutral'
                          }`}
                        >
                          {champ.winRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-3 bg-white/5 rounded-sm overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-[#2796bc] rounded-sm"
                            style={{ width: `${Math.min((champ.pickRate / 20) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-lol-dim">{champ.pickRate.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-3 bg-white/5 rounded-sm overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-[#e9422e] rounded-sm"
                            style={{ width: `${Math.min((champ.banRate / 30) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-lol-dim">{champ.banRate.toFixed(1)}%</span>
                      </div>
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
