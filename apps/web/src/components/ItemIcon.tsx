import { useState } from 'react';
import { itemIcon } from '../lib/dataDragon';

interface ItemIconProps {
  itemId: number;
  itemName?: string;
  size?: number;
  className?: string;
}

export default function ItemIcon({
  itemId,
  itemName,
  size = 32,
  className,
}: ItemIconProps) {
  const [failed, setFailed] = useState(false);

  if (!itemId || itemId === 0) {
    return (
      <div
        className={`bg-lol-dark/60 border border-white/5 rounded ${className ?? ''}`}
        style={{ width: size, height: size }}
      />
    );
  }

  if (failed) {
    return (
      <div
        className={`bg-gray-700 rounded flex items-center justify-center text-[8px] text-gray-500 ${className ?? ''}`}
        style={{ width: size, height: size }}
        title={itemName}
      >
        ?
      </div>
    );
  }

  return (
    <div className="relative group">
      <img
        src={itemIcon(itemId)}
        alt={itemName ?? `Item ${itemId}`}
        width={size}
        height={size}
        loading="lazy"
        className={`rounded border border-white/10 ${className ?? ''}`}
        onError={() => setFailed(true)}
      />
      {itemName && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1
                      bg-lol-dark border border-white/10 rounded text-xs text-lol-text
                      whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none
                      transition-opacity z-50"
        >
          {itemName}
        </div>
      )}
    </div>
  );
}
