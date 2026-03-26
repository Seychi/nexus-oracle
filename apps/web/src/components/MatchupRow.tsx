import { DDImg, championIcon } from '../lib/dataDragon';
import type { Matchup } from '../lib/api';

interface MatchupRowProps {
  matchup: Matchup;
}

export default function MatchupRow({ matchup }: MatchupRowProps) {
  const wrColor =
    matchup.winRate >= 52
      ? 'stat-green'
      : matchup.winRate <= 48
        ? 'stat-red'
        : 'stat-neutral';

  const goldColor =
    matchup.goldDiffAt15 > 0
      ? 'stat-green'
      : matchup.goldDiffAt15 < 0
        ? 'stat-red'
        : 'stat-neutral';

  const goldSign = matchup.goldDiffAt15 > 0 ? '+' : '';

  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      {/* Opponent */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-3">
          <DDImg
            src={championIcon(matchup.opponentId)}
            alt={matchup.opponentName}
            className="w-8 h-8 rounded-full border border-white/10"
          />
          <span className="text-sm font-medium text-lol-text">
            {matchup.opponentName}
          </span>
        </div>
      </td>

      {/* Games */}
      <td className="py-2.5 px-3 text-sm text-lol-dim text-right">
        {matchup.games.toLocaleString()}
      </td>

      {/* Win Rate */}
      <td className={`py-2.5 px-3 text-sm font-semibold text-right ${wrColor}`}>
        {matchup.winRate.toFixed(1)}%
      </td>

      {/* Gold Diff @15 */}
      <td className={`py-2.5 px-3 text-sm font-semibold text-right ${goldColor}`}>
        {goldSign}{matchup.goldDiffAt15}
      </td>
    </tr>
  );
}
