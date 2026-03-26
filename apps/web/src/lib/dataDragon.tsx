import { useState } from 'react';

export const DD_VERSION = '14.24.1';

const DD_BASE = `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}`;
const DD_IMG = `${DD_BASE}/img`;

export function championIcon(name: string): string {
  return `${DD_IMG}/champion/${name}.png`;
}

export function itemIcon(id: number | string): string {
  return `${DD_IMG}/item/${id}.png`;
}

export function championSplash(name: string, skin = 0): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${name}_${skin}.jpg`;
}

export function championLoading(name: string, skin = 0): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${name}_${skin}.jpg`;
}

export function profileIcon(iconId: number | string): string {
  return `${DD_IMG}/profileicon/${iconId}.png`;
}

/* ------------------------------------------------------------------ */
/*  Data Dragon Champion Data                                         */
/* ------------------------------------------------------------------ */

export interface DDChampion {
  id: string;       // URL-safe ID: "Aatrox", "LeeSin", "MissFortune"
  key: string;      // Numeric ID as string: "266"
  name: string;     // Display name: "Aatrox", "Lee Sin", "Miss Fortune"
  title: string;    // "the Darkin Blade"
  tags: string[];   // ["Fighter", "Tank"]
}

interface DDCache {
  champions: DDChampion[];
  byKey: Map<string, DDChampion>;
  byId: Map<string, DDChampion>;
  byName: Map<string, DDChampion>;
}

let _cache: DDCache | null = null;
let _fetchPromise: Promise<DDChampion[]> | null = null;

export async function fetchAllChampions(): Promise<DDChampion[]> {
  if (_cache) return _cache.champions;
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = (async () => {
    const res = await fetch(`${DD_BASE}/data/en_US/champion.json`);
    if (!res.ok) throw new Error('Failed to fetch champions from Data Dragon');
    const json = await res.json();
    const raw = json.data as Record<string, DDChampion>;
    const champions: DDChampion[] = Object.values(raw)
      .sort((a, b) => a.name.localeCompare(b.name));
    _cache = {
      champions,
      byKey: new Map(champions.map(c => [c.key, c])),
      byId: new Map(champions.map(c => [c.id, c])),
      byName: new Map(champions.map(c => [c.name.toLowerCase(), c])),
    };
    return champions;
  })();

  return _fetchPromise;
}

export function getChampionByKey(numericKey: string | number): DDChampion | undefined {
  return _cache?.byKey.get(String(numericKey));
}

export function getChampionById(ddId: string): DDChampion | undefined {
  return _cache?.byId.get(ddId);
}

/** Resolve any champion identifier (DD id, numeric key, or display name) to a DD icon URL */
export function resolveChampionIcon(identifier: string): string {
  if (_cache?.byId.has(identifier)) return championIcon(identifier);
  const byKey = _cache?.byKey.get(identifier);
  if (byKey) return championIcon(byKey.id);
  const byName = _cache?.byName.get(identifier.toLowerCase());
  if (byName) return championIcon(byName.id);
  return championIcon(identifier.replace(/[\s']/g, ''));
}

/** Map a DD tag to a role string */
export function tagToRole(tag: string): string {
  switch (tag) {
    case 'Marksman': return 'BOTTOM';
    case 'Support': return 'UTILITY';
    case 'Assassin': return 'MIDDLE';
    case 'Mage': return 'MIDDLE';
    case 'Fighter': return 'TOP';
    case 'Tank': return 'TOP';
    default: return 'MIDDLE';
  }
}

/* ------------------------------------------------------------------ */
/*  DDImg — a drop-in <img> replacement that shows a gray placeholder */
/*  when the Data Dragon image fails to load.                         */
/* ------------------------------------------------------------------ */

interface DDImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
}

export function DDImg({
  src,
  alt,
  className,
  fallbackClassName,
  ...rest
}: DDImgProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`${className ?? ''} ${fallbackClassName ?? ''} bg-gray-700 flex items-center justify-center text-xs text-gray-500`.trim()}
        title={alt}
        aria-label={alt}
      >
        ?
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? ''}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
