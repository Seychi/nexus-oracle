import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  getChampion,
  getBuilds,
  getMatchups,
  type ChampionDetail,
  type BuildsResponse,
  type MatchupsResponse,
  type Matchup,
} from '../lib/api';
import { championSplash, championIcon, DDImg } from '../lib/dataDragon';
import TierBadge from '../components/TierBadge';
import BuildCard from '../components/BuildCard';
import MatchupRow from '../components/MatchupRow';

type Tab = 'builds' | 'matchups';
type MatchupSort = 'winRate' | 'games' | 'goldDiffAt15';

export default function ChampionPage() {
  const { championId } = useParams<{ championId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const roleParam = searchParams.get('role') ?? undefined;

  const [champion, setChampion] = useState<ChampionDetail | null>(null);
  const [builds, setBuilds] = useState<BuildsResponse | null>(null);
  const [matchupsData, setMatchupsData] = useState<MatchupsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('builds');
  const [matchupSort, setMatchupSort] = useState<MatchupSort>('winRate');
  const [matchupOrder, setMatchupOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!championId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      getChampion(championId, roleParam),
      getBuilds(championId, roleParam),
      getMatchups(championId, roleParam),
    ])
      .then(([champRes, buildsRes, matchupsRes]) => {
        if (cancelled) return;
        setChampion(champRes.champion);
        setBuilds(buildsRes);
        setMatchupsData(matchupsRes);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load champion data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

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
      setMatchupOrder(key === 'games' ? 'desc' : key === 'winRate' ? 'desc' : 'desc');
    }
  }

  const sortedMatchups = useMemo(() => {
    if (!matchupsData?.matchups) return [];
    const copy = [...matchupsData.matchups];
    copy.sort((a: Matchup, b: Matchup) => {
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
        {/* Splash background */}
        <div className="absolute inset-0">
          <img
            src={championSplash(championId!)}
            alt=""
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-lol-dark via-lol-dark/80 to-lol-dark/40" />
        </div>

        {/* Content */}
        <div className="relative z-10 px-8 py-10 flex items-end gap-6">
          <DDImg
            src={championIcon(championId!)}
            alt={champion.championName}
            className="w-20 h-20 rounded-xl border-2 border-lol-gold/50 shadow-lg"
          />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-extrabold text-white">
                {champion.championName}
              </h1>
              <TierBadge tier={champion.tier} className="text-sm px-3 py-1" />
            </div>
            <p className="text-sm text-lol-dim capitalize mb-3">
              {(roleParam ?? champion.role ?? '').toLowerCase()}
            </p>

            {/* Stats Row */}
            <div className="flex items-center gap-6">
              <StatPill
                label="Win Rate"
                value={`${champion.winRate.toFixed(1)}%`}
                color={champion.winRate >= 52 ? 'green' : champion.winRate <= 48 ? 'red' : 'neutral'}
              />
              <StatPill label="Pick Rate" value={`${champion.pickRate.toFixed(1)}%`} color="neutral" />
              <StatPill label="Ban Rate" value={`${champion.banRate.toFixed(1)}%`} color="neutral" />
              <StatPill label="Games" value={champion.games.toLocaleString()} color="neutral" />
            </div>
          </div>

          {/* Role Selector */}
          {champion.roles && champion.roles.length > 1 && (
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

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-white/10">
        <TabButton active={tab === 'builds'} onClick={() => setTab('builds')}>
          Builds
        </TabButton>
        <TabButton active={tab === 'matchups'} onClick={() => setTab('matchups')}>
          Matchups
        </TabButton>
      </div>

      {/* Builds Tab */}
      {tab === 'builds' && builds && (
        <div className="space-y-8">
          {/* Core Items */}
          {builds.coreItems && builds.coreItems.length > 0 && (
            <BuildSection title="Core Items">
              <div className="space-y-2">
                {builds.coreItems.map((build) => (
                  <BuildCard key={build.buildId} build={build} />
                ))}
              </div>
            </BuildSection>
          )}

          {/* Boots */}
          {builds.boots && builds.boots.length > 0 && (
            <BuildSection title="Boots">
              <div className="space-y-2">
                {builds.boots.map((build) => (
                  <BuildCard key={build.buildId} build={build} />
                ))}
              </div>
            </BuildSection>
          )}

          {/* Starter Items */}
          {builds.starterItems && builds.starterItems.length > 0 && (
            <BuildSection title="Starter Items">
              <div className="space-y-2">
                {builds.starterItems.map((build) => (
                  <BuildCard key={build.buildId} build={build} />
                ))}
              </div>
            </BuildSection>
          )}

          {/* Runes */}
          {builds.runes && builds.runes.length > 0 && (
            <BuildSection title="Runes">
              <div className="space-y-2">
                {builds.runes.map((runeBuild) => (
                  <div
                    key={runeBuild.buildId}
                    className="card px-4 py-3 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-lol-gold">
                          {runeBuild.primaryTree}
                        </span>
                        <span className="text-xs text-lol-dim">/</span>
                        <span className="text-sm text-lol-text">
                          {runeBuild.secondaryTree}
                        </span>
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
                        <p className="font-semibold text-lol-text">
                          {runeBuild.games.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-lol-dim">Win Rate</p>
                        <p
                          className={`font-semibold ${
                            runeBuild.winRate >= 52
                              ? 'stat-green'
                              : runeBuild.winRate <= 48
                                ? 'stat-red'
                                : 'stat-neutral'
                          }`}
                        >
                          {runeBuild.winRate.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-lol-dim">Pick Rate</p>
                        <p className="font-semibold text-lol-text">
                          {runeBuild.pickRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </BuildSection>
          )}

          {/* Empty state */}
          {!builds.coreItems?.length &&
            !builds.boots?.length &&
            !builds.starterItems?.length &&
            !builds.runes?.length && (
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
                      <th
                        className={`${matchupThBase} text-right`}
                        onClick={() => handleMatchupSort('games')}
                      >
                        Games
                        {matchupSort === 'games' && (
                          <span className="ml-1 text-lol-gold">
                            {matchupOrder === 'asc' ? '\u25B2' : '\u25BC'}
                          </span>
                        )}
                      </th>
                      <th
                        className={`${matchupThBase} text-right`}
                        onClick={() => handleMatchupSort('winRate')}
                      >
                        Win Rate
                        {matchupSort === 'winRate' && (
                          <span className="ml-1 text-lol-gold">
                            {matchupOrder === 'asc' ? '\u25B2' : '\u25BC'}
                          </span>
                        )}
                      </th>
                      <th
                        className={`${matchupThBase} text-right`}
                        onClick={() => handleMatchupSort('goldDiffAt15')}
                      >
                        Gold @15
                        {matchupSort === 'goldDiffAt15' && (
                          <span className="ml-1 text-lol-gold">
                            {matchupOrder === 'asc' ? '\u25B2' : '\u25BC'}
                          </span>
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
    </div>
  );
}

/* ---------- Sub-components ---------- */

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: 'green' | 'red' | 'neutral';
}) {
  const colorClass =
    color === 'green'
      ? 'text-emerald-400'
      : color === 'red'
        ? 'text-red-400'
        : 'text-lol-text';

  return (
    <div className="bg-lol-dark/60 border border-white/10 rounded-lg px-3 py-1.5">
      <p className="text-[10px] text-lol-dim uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}

function BuildSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 text-sm font-semibold transition-colors relative
        ${
          active
            ? 'text-lol-gold'
            : 'text-lol-dim hover:text-lol-text'
        }`}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-lol-gold rounded-full" />
      )}
    </button>
  );
}
