import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  getChampion,
  getBuilds,
  getMatchups,
  type BuildsResponse,
  type Matchup,
} from '../lib/api';
import {
  championSplash,
  championIcon,
  fetchAllChampions,
  getChampionById,
  getChampionByKey,
  DDImg,
  type DDChampion,
} from '../lib/dataDragon';
import TierBadge from '../components/TierBadge';
import BuildCard from '../components/BuildCard';
import MatchupRow from '../components/MatchupRow';

type Tab = 'overview' | 'builds' | 'matchups';
type MatchupSort = 'winRate' | 'games' | 'goldDiffAt15';

interface ChampionData {
  ddId: string;
  displayName: string;
  title: string;
  tags: string[];
  tier: string;
  role: string;
  roles: string[];
  winRate: number;
  pickRate: number;
  banRate: number;
  avgKda: number;
  games: number;
  hasApiData: boolean;
}

export default function ChampionPage() {
  const { championId } = useParams<{ championId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const roleParam = searchParams.get('role') ?? undefined;

  const [champion, setChampion] = useState<ChampionData | null>(null);
  const [builds, setBuilds] = useState<BuildsResponse | null>(null);
  const [matchupsData, setMatchupsData] = useState<Matchup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [matchupSort, setMatchupSort] = useState<MatchupSort>('winRate');
  const [matchupOrder, setMatchupOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!championId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      // Ensure DD data is loaded
      await fetchAllChampions().catch(() => []);

      // Resolve champion identity
      let ddChamp: DDChampion | undefined =
        getChampionById(championId) ||
        getChampionByKey(championId);

      // If not found by ID or key, try treating as a name-like string
      if (!ddChamp) {
        const allChamps = await fetchAllChampions().catch(() => []);
        ddChamp = allChamps.find(
          (c) =>
            c.id.toLowerCase() === championId.toLowerCase() ||
            c.name.toLowerCase() === championId.toLowerCase() ||
            c.key === championId,
        );
      }

      const ddId = ddChamp?.id || championId;
      const numericKey = ddChamp?.key;

      // Build base champion data from DD
      const baseData: ChampionData = {
        ddId,
        displayName: ddChamp?.name || championId,
        title: ddChamp?.title || '',
        tags: ddChamp?.tags || [],
        tier: 'B',
        role: roleParam || '',
        roles: [],
        winRate: 0,
        pickRate: 0,
        banRate: 0,
        avgKda: 0,
        games: 0,
        hasApiData: false,
      };

      // Try to fetch API data using numeric key
      if (numericKey) {
        try {
          const [champRes, buildsRes, matchupsRes] = await Promise.all([
            getChampion(numericKey, roleParam).catch(() => null),
            getBuilds(numericKey, roleParam).catch(() => null),
            getMatchups(numericKey, roleParam).catch(() => null),
          ]);

          if (!cancelled) {
            if (champRes?.champion) {
              const c = champRes.champion;
              baseData.tier = c.tier || 'B';
              baseData.role = c.role || baseData.role;
              baseData.roles = c.roles || [];
              baseData.winRate = c.winRate || 0;
              baseData.pickRate = c.pickRate || 0;
              baseData.banRate = c.banRate || 0;
              baseData.avgKda = c.avgKda || 0;
              baseData.games = c.games || 0;
              baseData.hasApiData = true;
            }

            // Also try stats array format (what the API actually returns)
            if (!champRes?.champion && (champRes as any)?.stats?.length) {
              const stats = (champRes as any).stats;
              const s = stats[0];
              baseData.tier = s.tier || 'B';
              baseData.role = s.role || baseData.role;
              baseData.roles = [...new Set(stats.map((st: any) => st.role))] as string[];
              baseData.winRate = s.winRate || 0;
              baseData.pickRate = s.pickRate || 0;
              baseData.banRate = s.banRate || 0;
              baseData.avgKda =
                s.avgKda ??
                (s.avgDeaths ? (s.avgKills + s.avgAssists) / Math.max(s.avgDeaths, 1) : 0);
              baseData.games = s.games || 0;
              baseData.hasApiData = true;
            }

            setBuilds(buildsRes);
            setMatchupsData(matchupsRes?.matchups || []);
          }
        } catch {
          // API failed - continue with DD data only
        }
      }

      if (!cancelled) {
        setChampion(baseData);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [championId, roleParam]);

  function handleRoleChange(newRole: string) {
    setSearchParams(newRole ? { role: newRole } : {});
  }

  function handleMatchupSort(key: MatchupSort) {
    if (matchupSort === key) {
      setMatchupOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setMatchupSort(key);
      setMatchupOrder('desc');
    }
  }

  const sortedMatchups = useMemo(() => {
    const copy = [...matchupsData];
    copy.sort((a, b) => {
      const diff = (a[matchupSort] as number) - (b[matchupSort] as number);
      return matchupOrder === 'asc' ? diff : -diff;
    });
    return copy;
  }, [matchupsData, matchupSort, matchupOrder]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-lol-gold/30 border-t-lol-gold rounded-full animate-spin" />
          <p className="text-sm text-lol-dim">Loading champion data...</p>
        </div>
      </div>
    );
  }

  if (error || !champion) {
    return (
      <div className="card p-8 text-center">
        <p className="text-red-400 font-medium text-lg">Champion not found</p>
        <p className="text-sm text-lol-dim mt-2">{error ?? 'No data available'}</p>
      </div>
    );
  }

  const matchupThBase =
    'px-3 py-2.5 text-xs font-semibold text-lol-dim uppercase tracking-wider cursor-pointer hover:text-lol-text transition-colors select-none';

  return (
    <div>
      {/* Hero Header */}
      <div className="relative rounded-xl overflow-hidden mb-6">
        <div className="absolute inset-0">
          <img
            src={championSplash(champion.ddId)}
            alt=""
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-lol-dark via-lol-dark/80 to-lol-dark/40" />
        </div>

        <div className="relative z-10 px-8 py-10 flex items-end gap-6">
          <DDImg
            src={championIcon(champion.ddId)}
            alt={champion.displayName}
            className="w-20 h-20 rounded-xl border-2 border-lol-gold/50 shadow-lg"
          />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-extrabold text-white">{champion.displayName}</h1>
              {champion.hasApiData && (
                <TierBadge tier={champion.tier} className="text-sm px-3 py-1" />
              )}
            </div>
            {champion.title && (
              <p className="text-sm text-lol-gold/70 italic capitalize mb-1">{champion.title}</p>
            )}
            <div className="flex items-center gap-2 mb-3">
              {champion.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-white/10 text-lol-dim rounded px-2 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Stats Row */}
            {champion.hasApiData && (
              <div className="flex items-center gap-4 flex-wrap">
                <StatPill
                  label="Win Rate"
                  value={`${champion.winRate.toFixed(1)}%`}
                  color={champion.winRate >= 52 ? 'green' : champion.winRate <= 48 ? 'red' : 'neutral'}
                />
                <StatPill label="Pick Rate" value={`${champion.pickRate.toFixed(1)}%`} color="neutral" />
                <StatPill label="Ban Rate" value={`${champion.banRate.toFixed(1)}%`} color="neutral" />
                <StatPill label="Games" value={champion.games.toLocaleString()} color="neutral" />
                <StatPill label="Avg KDA" value={champion.avgKda.toFixed(2)} color="neutral" />
              </div>
            )}
          </div>

          {champion.roles.length > 1 && (
            <div className="shrink-0">
              <label className="block text-xs text-lol-dim mb-1">Role</label>
              <select
                value={roleParam ?? champion.role ?? ''}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="bg-lol-dark border border-white/10 rounded-md px-3 py-1.5 text-sm text-lol-text
                           focus:outline-none focus:border-lol-gold/50"
              >
                {champion.roles.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0) + r.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* No API data notice */}
      {!champion.hasApiData && (
        <div className="mb-6 rounded-lg bg-lol-card border border-white/5 p-6 text-center">
          <p className="text-lol-dim">
            Detailed statistics, builds, and matchup data will appear here when the API is connected with match data.
          </p>
        </div>
      )}

      {/* Tabs */}
      {champion.hasApiData && (
        <>
          <div className="flex items-center gap-1 mb-6 border-b border-white/10">
            <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
              Overview
            </TabButton>
            <TabButton active={tab === 'builds'} onClick={() => setTab('builds')}>
              Builds
            </TabButton>
            <TabButton active={tab === 'matchups'} onClick={() => setTab('matchups')}>
              Matchups
            </TabButton>
          </div>

          {/* Overview Tab */}
          {tab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Win rate card */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-lol-dim mb-3 uppercase tracking-wider">Performance</h3>
                <div className="space-y-3">
                  <StatBar label="Win Rate" value={champion.winRate} max={60} color="green" suffix="%" />
                  <StatBar label="Pick Rate" value={champion.pickRate} max={20} color="blue" suffix="%" />
                  <StatBar label="Ban Rate" value={champion.banRate} max={30} color="red" suffix="%" />
                </div>
              </div>

              {/* Info card */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-lol-dim mb-3 uppercase tracking-wider">Champion Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-lol-dim">Role</span>
                    <span className="text-lol-text capitalize">{champion.role.toLowerCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-lol-dim">Classes</span>
                    <span className="text-lol-text">{champion.tags.join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-lol-dim">Tier</span>
                    <TierBadge tier={champion.tier} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-lol-dim">Avg KDA</span>
                    <span className="text-lol-blue font-semibold">{champion.avgKda.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-lol-dim">Total Games</span>
                    <span className="text-lol-text">{champion.games.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Builds Tab */}
          {tab === 'builds' && builds && (
            <div className="space-y-8">
              {builds.coreItems?.length > 0 && (
                <BuildSection title="Core Items">
                  <div className="space-y-2">
                    {builds.coreItems.map((build) => (
                      <BuildCard key={build.buildId} build={build} />
                    ))}
                  </div>
                </BuildSection>
              )}

              {builds.boots?.length > 0 && (
                <BuildSection title="Boots">
                  <div className="space-y-2">
                    {builds.boots.map((build) => (
                      <BuildCard key={build.buildId} build={build} />
                    ))}
                  </div>
                </BuildSection>
              )}

              {builds.starterItems?.length > 0 && (
                <BuildSection title="Starter Items">
                  <div className="space-y-2">
                    {builds.starterItems.map((build) => (
                      <BuildCard key={build.buildId} build={build} />
                    ))}
                  </div>
                </BuildSection>
              )}

              {builds.runes?.length > 0 && (
                <BuildSection title="Runes">
                  <div className="space-y-2">
                    {builds.runes.map((runeBuild) => (
                      <div key={runeBuild.buildId} className="card px-4 py-3 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-lol-gold">{runeBuild.primaryTree}</span>
                            <span className="text-xs text-lol-dim">/</span>
                            <span className="text-sm text-lol-text">{runeBuild.secondaryTree}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {runeBuild.runes.map((r) => (
                              <span
                                key={`${runeBuild.buildId}-${r.runeId}`}
                                className="text-xs bg-lol-dark/60 border border-white/5 rounded px-2 py-0.5 text-lol-dim"
                              >
                                {r.runeName}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-xs shrink-0">
                          <div className="text-center">
                            <p className="text-lol-dim">Games</p>
                            <p className="font-semibold text-lol-text">{runeBuild.games.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lol-dim">Win Rate</p>
                            <p className={`font-semibold ${runeBuild.winRate >= 52 ? 'stat-green' : runeBuild.winRate <= 48 ? 'stat-red' : 'stat-neutral'}`}>
                              {runeBuild.winRate.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </BuildSection>
              )}

              {!builds.coreItems?.length && !builds.boots?.length && !builds.starterItems?.length && !builds.runes?.length && (
                <div className="card p-8 text-center">
                  <p className="text-lol-dim">No build data available for this champion and role.</p>
                </div>
              )}
            </div>
          )}

          {/* Matchups Tab */}
          {tab === 'matchups' && (
            <div>
              {sortedMatchups.length > 0 ? (
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10 bg-lol-dark/50">
                          <th className={`${matchupThBase} text-left`}>Opponent</th>
                          <th className={`${matchupThBase} text-right`} onClick={() => handleMatchupSort('games')}>
                            Games
                            {matchupSort === 'games' && (
                              <span className="ml-1 text-lol-gold">{matchupOrder === 'asc' ? '\u25B2' : '\u25BC'}</span>
                            )}
                          </th>
                          <th className={`${matchupThBase} text-right`} onClick={() => handleMatchupSort('winRate')}>
                            Win Rate
                            {matchupSort === 'winRate' && (
                              <span className="ml-1 text-lol-gold">{matchupOrder === 'asc' ? '\u25B2' : '\u25BC'}</span>
                            )}
                          </th>
                          <th className={`${matchupThBase} text-right`} onClick={() => handleMatchupSort('goldDiffAt15')}>
                            Gold @15
                            {matchupSort === 'goldDiffAt15' && (
                              <span className="ml-1 text-lol-gold">{matchupOrder === 'asc' ? '\u25B2' : '\u25BC'}</span>
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedMatchups.map((m) => (
                          <MatchupRow key={m.opponentId} matchup={m} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="card p-8 text-center">
                  <p className="text-lol-dim">No matchup data available for this champion and role.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- Sub-components ---------- */

function StatPill({ label, value, color }: { label: string; value: string; color: 'green' | 'red' | 'neutral' }) {
  const colorClass = color === 'green' ? 'text-emerald-400' : color === 'red' ? 'text-red-400' : 'text-lol-text';
  return (
    <div className="bg-lol-dark/60 border border-white/10 rounded-lg px-3 py-1.5">
      <p className="text-[10px] text-lol-dim uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}

function StatBar({ label, value, max, color, suffix }: { label: string; value: number; max: number; color: 'green' | 'blue' | 'red'; suffix: string }) {
  const barColor = color === 'green' ? 'bg-[#3cbc8d]' : color === 'red' ? 'bg-[#e9422e]' : 'bg-[#2796bc]';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-lol-dim">{label}</span>
        <span className="text-lol-text font-semibold">{value.toFixed(1)}{suffix}</span>
      </div>
      <div className="h-3 bg-white/5 rounded-sm overflow-hidden">
        <div className={`h-full ${barColor} rounded-sm transition-all`} style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
      </div>
    </div>
  );
}

function BuildSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-lol-text mb-3 flex items-center gap-2">
        <span className="w-1 h-5 bg-lol-gold rounded-full" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 text-sm font-semibold transition-colors relative ${active ? 'text-lol-gold' : 'text-lol-dim hover:text-lol-text'}`}
    >
      {children}
      {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-lol-gold rounded-full" />}
    </button>
  );
}
