import React, { useState } from 'react';

let ddVersion = '14.24.1';
fetch('https://ddragon.leagueoflegends.com/api/versions.json')
  .then((r) => r.json())
  .then((v: string[]) => { ddVersion = v[0]; })
  .catch(() => {});

export function champUrl(ddKey: string) {
  return `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/champion/${ddKey}.png`;
}
export function itemUrl(id: number) {
  return `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/item/${id}.png`;
}

const SPELL_KEYS: Record<string, string> = {
  Flash: 'SummonerFlash', Ignite: 'SummonerDot', Teleport: 'SummonerTeleport',
  Ghost: 'SummonerHaste', Heal: 'SummonerHeal', Barrier: 'SummonerBarrier',
  Exhaust: 'SummonerExhaust', Cleanse: 'SummonerBoost', Smite: 'SummonerSmite',
  Mark: 'SummonerSnowball', Clarity: 'SummonerMana',
};
export function spellUrl(displayName: string) {
  const key = SPELL_KEYS[displayName];
  if (!key) return null;
  return `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/spell/${key}.png`;
}

interface ImgProps { src: string; alt: string; className?: string; fallbackChar?: string; }
export function DDImg({ src, alt, className = '', fallbackChar }: ImgProps) {
  const [err, setErr] = useState(false);
  if (err) return (
    <div className={`${className} bg-lol-card2 flex items-center justify-center text-lol-dim text-xs font-bold`}>
      {fallbackChar ?? alt[0]}
    </div>
  );
  return <img src={src} alt={alt} className={className} onError={() => setErr(true)} />;
}
