import ItemIcon from './ItemIcon';
import type { Build } from '../lib/api';

interface BuildCardProps {
  build: Build;
  className?: string;
}

export default function BuildCard({ build, className }: BuildCardProps) {
  const isHighWr = build.winRate >= 55;

  return (
    <div
      className={`card px-4 py-3 flex items-center gap-4 ${isHighWr ? 'ring-1 ring-lol-gold/30' : ''} ${className ?? ''}`}
    >
      {/* Items */}
      <div className="flex items-center gap-1.5">
        {build.items
          .sort((a, b) => a.order - b.order)
          .map((item) => (
            <ItemIcon
              key={`${build.buildId}-${item.itemId}-${item.order}`}
              itemId={item.itemId}
              itemName={item.itemName}
              size={36}
            />
          ))}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 ml-auto text-xs shrink-0">
        <div className="text-center">
          <p className="text-lol-dim">Games</p>
          <p className="font-semibold text-lol-text">
            {build.games.toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-lol-dim">Win Rate</p>
          <p
            className={`font-semibold ${
              build.winRate >= 52
                ? 'stat-green'
                : build.winRate <= 48
                  ? 'stat-red'
                  : 'stat-neutral'
            }`}
          >
            {build.winRate.toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-lol-dim">Pick Rate</p>
          <p className="font-semibold text-lol-text">
            {build.pickRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* High WR badge */}
      {isHighWr && (
        <span className="text-[10px] font-bold text-lol-gold bg-lol-gold/10 border border-lol-gold/30 px-1.5 py-0.5 rounded">
          HOT
        </span>
      )}
    </div>
  );
}
