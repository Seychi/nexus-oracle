import React, { useEffect, useState } from 'react';
import type { ChampSelectState, ChampSelectPlayer, PlayerProfile } from '../../types';
import { DDImg, champUrl, itemUrl } from '../shared/ChampIcon';
import Markdown from 'react-markdown';

const POS_ICONS: Record<string, string> = {
  TOP: '🛡', JUNGLE: '🌿', MIDDLE: '🔮', BOTTOM: '🏹', UTILITY: '💚', '': '❓',
};

const TIER_COLORS: Record<string, string> = {
  IRON: 'text-gray-400', BRONZE: 'text-amber-700', SILVER: 'text-gray-300',
  GOLD: 'text-yellow-400', PLATINUM: 'text-cyan-300', EMERALD: 'text-emerald-400',
  DIAMOND: 'text-blue-300', MASTER: 'text-purple-400', GRANDMASTER: 'text-red-400',
  CHALLENGER: 'text-yellow-200',
};

interface StatsData {
  champion?: {
    stats?: { winRate: number; pickRate: number; games: number; tier: string | null; avgKills: number; avgDeaths: number; avgAssists: number };
    builds?: Record<string, Array<{ items: number[]; winRate: number; games: number; pickRate: number }>>;
  };
  matchups?: Array<{ opponentId: number; winRate: number; games: number }>;
  laneMatchup?: { opponentId: number; winRate: number; games: number; avgGoldDiff15: number };
}

const TIER_BADGE: Record<string, string> = {
  'S+': 'bg-red-500/20 text-red-400', S: 'bg-orange-500/20 text-orange-400',
  A: 'bg-blue-500/20 text-blue-400', B: 'bg-green-500/20 text-green-400',
  C: 'bg-gray-500/20 text-gray-400',
};

function ProfileBadge({ profile }: { profile: PlayerProfile | undefined }) {
  if (!profile) return null;
  const color = TIER_COLORS[profile.tier] ?? 'text-lol-dim';

  return (
    <div className="flex flex-col gap-0.5 mt-1">
      <div className="flex items-center gap-1">
        <span className={`text-[9px] font-bold ${color}`}>{profile.rank}</span>
        {profile.lp > 0 && <span className="text-[7px] text-lol-dim">{profile.lp}LP</span>}
      </div>
      {profile.wins + profile.losses > 0 && (
        <div className="text-[8px] text-lol-dim">
          {profile.wins}W {profile.losses}L ·{' '}
          <span className={profile.winRate >= 52 ? 'text-lol-green' : profile.winRate < 48 ? 'text-lol-enemy' : 'text-lol-dim'}>
            {profile.winRate}% WR
          </span>
        </div>
      )}
      {profile.topChampions.length > 0 && (
        <div className="flex gap-1 mt-0.5">
          {profile.topChampions.map((c, i) => (
            <DDImg key={i} src={champUrl(c.name)} alt={c.name} className="w-4 h-4 rounded" />
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerSlot({ p, side, profile }: {
  p: ChampSelectPlayer; side: 'ally' | 'enemy'; profile?: PlayerProfile;
}) {
  const hasPick = p.championId > 0 && p.championName && !p.championName.startsWith('#');
  const accent = side === 'ally' ? 'border-l-lol-ally' : 'border-l-lol-enemy';

  return (
    <div className={`p-1.5 bg-lol-card border border-white/[0.07] border-l-2 ${accent} rounded`}>
      <div className="flex items-center gap-1.5">
        {hasPick ? (
          <DDImg src={champUrl(p.championName)} alt={p.championName} className="w-8 h-8 rounded" />
        ) : (
          <div className="w-8 h-8 rounded bg-white/[0.06] flex items-center justify-center text-lol-dim text-xs">?</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-lol-text truncate">
              {hasPick ? p.championName : 'Picking…'}
            </span>
            {p.isLocalPlayer && (
              <span className="text-[7px] bg-lol-gold/20 border border-lol-gold/30 text-lol-gold px-1 rounded-full">YOU</span>
            )}
          </div>
          <div className="text-[8px] text-lol-dim">
            {POS_ICONS[p.assignedPosition] ?? ''} {p.assignedPosition || 'Fill'}
          </div>
        </div>
      </div>
      <ProfileBadge profile={profile} />
    </div>
  );
}

function StatsPanel({ stats }: { stats: StatsData | null }) {
  if (!stats?.champion?.stats) return null;
  const s = stats.champion.stats;
  const builds = stats.champion.builds;
  const matchup = stats.laneMatchup;

  return (
    <div className="bg-lol-card border border-white/[0.07] rounded p-2.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] text-lol-blue font-bold uppercase tracking-widest">Stats Data</span>
        {s.tier && (
          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${TIER_BADGE[s.tier] ?? TIER_BADGE.C}`}>
            {s.tier}
          </span>
        )}
      </div>

      {/* Win rate / pick rate / games */}
      <div className="flex gap-3 text-[9px] mb-2">
        <span className={s.winRate >= 0.52 ? 'text-lol-green font-bold' : s.winRate < 0.48 ? 'text-lol-enemy font-bold' : 'text-lol-text'}>
          {(s.winRate * 100).toFixed(1)}% WR
        </span>
        <span className="text-lol-dim">{(s.pickRate * 100).toFixed(1)}% PR</span>
        <span className="text-lol-dim">{s.games.toLocaleString()} games</span>
        <span className="text-lol-dim">{s.avgKills.toFixed(1)}/{s.avgDeaths.toFixed(1)}/{s.avgAssists.toFixed(1)} KDA</span>
      </div>

      {/* Matchup WR if available */}
      {matchup && (
        <div className={`text-[9px] mb-2 p-1.5 rounded ${matchup.winRate >= 0.52 ? 'bg-lol-green/10 border border-lol-green/20' : matchup.winRate < 0.48 ? 'bg-lol-enemy/10 border border-lol-enemy/20' : 'bg-white/[0.03] border border-white/[0.07]'}`}>
          <span className="text-lol-dim">Lane matchup: </span>
          <span className={matchup.winRate >= 0.52 ? 'text-lol-green font-bold' : matchup.winRate < 0.48 ? 'text-lol-enemy font-bold' : 'text-lol-text font-bold'}>
            {(matchup.winRate * 100).toFixed(1)}% WR
          </span>
          <span className="text-lol-dim"> ({matchup.games} games)</span>
          {matchup.avgGoldDiff15 !== 0 && (
            <span className={matchup.avgGoldDiff15 > 0 ? 'text-lol-green' : 'text-lol-enemy'}>
              {' '}· {matchup.avgGoldDiff15 > 0 ? '+' : ''}{Math.round(matchup.avgGoldDiff15)}g @15
            </span>
          )}
        </div>
      )}

      {/* Top builds */}
      {builds?.CORE && builds.CORE.length > 0 && (
        <div className="mb-1.5">
          <div className="text-[8px] text-lol-dim uppercase tracking-wider mb-1">Top Build</div>
          <div className="flex items-center gap-1">
            {builds.CORE[0].items.map((id, i) => (
              <DDImg key={i} src={itemUrl(id)} alt={`item-${id}`} className="w-6 h-6 rounded border border-white/10" />
            ))}
            <span className={`text-[8px] ml-1 ${builds.CORE[0].winRate >= 0.52 ? 'text-lol-green' : 'text-lol-dim'}`}>
              {(builds.CORE[0].winRate * 100).toFixed(1)}% WR
            </span>
          </div>
        </div>
      )}

      {builds?.BOOTS && builds.BOOTS.length > 0 && (
        <div className="flex items-center gap-1 text-[8px]">
          <span className="text-lol-dim">Boots:</span>
          {builds.BOOTS.slice(0, 3).map((b, i) => (
            <DDImg key={i} src={itemUrl(b.items[0])} alt="boots" className="w-5 h-5 rounded border border-white/10" />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChampSelectView() {
  const [csState, setCsState] = useState<ChampSelectState | null>(null);
  const [runeAdvice, setRuneAdvice] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [profiles, setProfiles] = useState<Map<number, PlayerProfile>>(new Map());
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    const api = window.electronAPI;
    api.onChampSelectData((d) => setCsState(d as ChampSelectState));
    api.onRuneAdvice((text) => { setRuneAdvice(text); setAnalysing(false); });
    api.onAnalysing((v) => setAnalysing(v));
    api.onPlayerProfiles((d) => {
      const arr = d as PlayerProfile[];
      setProfiles((prev) => {
        const next = new Map(prev);
        for (const p of arr) next.set(p.summonerId, p);
        return next;
      });
    });
    api.onChampSelectStats((d) => setStats(d as StatsData));
  }, []);

  if (!csState) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-lol-dark/90 rounded-b">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/[0.07] flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-lol-gold">CHAMP SELECT</div>
          <div className="text-[8px] text-lol-dim">{csState.phase} · {csState.timeLeft}s</div>
        </div>
        {csState.localPlayerChampion && (
          <div className="text-[10px] text-lol-text font-semibold">
            {csState.localPlayerChampion} {csState.localPlayerPosition}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {/* Teams side by side */}
        <div className="flex gap-1.5">
          <div className="flex-1 flex flex-col gap-1">
            <div className="text-[9px] font-bold text-lol-ally uppercase tracking-widest">Your Team</div>
            {csState.myTeam.map((p) => (
              <PlayerSlot key={p.cellId} p={p} side="ally" profile={profiles.get(p.summonerId)} />
            ))}
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className="text-[9px] font-bold text-lol-enemy uppercase tracking-widest">Enemy Team</div>
            {csState.theirTeam.length > 0 ? (
              csState.theirTeam.map((p) => (
                <PlayerSlot key={p.cellId} p={p} side="enemy" profile={profiles.get(p.summonerId)} />
              ))
            ) : (
              <div className="text-[9px] text-lol-dim italic p-2">Enemy picks hidden</div>
            )}
          </div>
        </div>

        {/* Stats API data */}
        <StatsPanel stats={stats} />

        {/* Rune & Build Advice (AI) */}
        <div className="bg-lol-card border border-white/[0.07] rounded p-2.5">
          <div className="text-[9px] text-lol-gold font-bold uppercase tracking-widest mb-2">
            AI Runes & Build
          </div>

          {analysing && !runeAdvice ? (
            <div className="flex items-center gap-2 py-4 justify-center text-lol-dim text-xs">
              <div className="w-4 h-4 border-2 border-lol-gold/30 border-t-lol-gold rounded-full animate-spin" />
              Analysing matchup…
            </div>
          ) : runeAdvice ? (
            <div className="text-[10px] text-lol-text leading-relaxed prose prose-invert max-w-none
              [&_h3]:text-[11px] [&_h3]:font-bold [&_h3]:text-lol-gold [&_h3]:mt-2 [&_h3]:mb-1
              [&_ul]:pl-3 [&_li]:mb-0.5 [&_strong]:text-white [&_p]:mb-1">
              <Markdown>{runeAdvice}</Markdown>
            </div>
          ) : (
            <div className="text-[10px] text-lol-dim text-center py-3">
              Waiting for champion picks to analyse…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
