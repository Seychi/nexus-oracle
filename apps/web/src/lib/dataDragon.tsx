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

export function championSplash(name: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${name}_0.jpg`;
}

export function profileIcon(iconId: number | string): string {
  return `${DD_IMG}/profileicon/${iconId}.png`;
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
