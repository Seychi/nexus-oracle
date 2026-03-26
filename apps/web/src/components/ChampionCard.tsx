import { DDImg, championIcon } from '../lib/dataDragon';
import TierBadge from './TierBadge';

interface ChampionCardProps {
  championId: string;
  championName: string;
  role?: string;
  tier: string;
  winRate: number;
  pickRate: number;
  banRate: number;
  avgKda: number;
  onClick?: () => void;
}

export default function ChampionCard({
  championId,
  championName,
  role,
  tier,
  winRate,
  pickRate,
  banRate,
  avgKda,
  onClick,
}: ChampionCardProps) {
  return (
    <div
      onClick={onClick}
      className="card flex items-center gap-4 px-4 py-3 hover:bg-white/[0.03] cursor-pointer transition-colors"
    >
      <DDImg
        src={championIcon(championId)}
        alt={championName}
        className="w-10 h-10 rounded-full border border-white/10"
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-lol-text truncate">
          {championName}
        </p>
        {role && (
          <p className="text-xs text-lol-dim capitalize">
            {role.toLowerCase()}
          </p>
        )}
      </div>
      <TierBadge tier={tier} />
      <div className="grid grid-cols-4 gap-4 text-right text-xs w-64">
        <span className={winRate >= 52 ? 'stat-green' : winRate <= 48 ? 'stat-red' : 'stat-neutral'}>
          {winRate.toFixed(1)}%
        </span>
        <span className="text-lol-dim">{pickRate.toFixed(1)}%</span>
        <span className="text-lol-dim">{banRate.toFixed(1)}%</span>
        <span className="text-lol-blue">{avgKda.toFixed(2)}</span>
      </div>
    </div>
  );
}
