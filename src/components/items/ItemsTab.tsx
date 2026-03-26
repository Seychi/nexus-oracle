import React from 'react';
import { useStore } from '../../store/gameStore';
import { DDImg, champUrl, itemUrl } from '../shared/ChampIcon';

function AntihealPanel() {
  const { analysis } = useStore();
  if (!analysis) return null;
  const { antiheal } = analysis;
  if (antiheal.urgency === 'none') return (
    <div className="bg-lol-green/10 border border-lol-green/30 rounded p-2 text-[10px] text-lol-green">
      ✅ No significant healing on enemy team
    </div>
  );

  const urgencyColor = antiheal.urgency === 'urgent' ? 'border-lol-enemy bg-lol-enemy/10 text-lol-enemy'
    : antiheal.urgency === 'recommended'              ? 'border-lol-orange bg-lol-orange/10 text-lol-orange'
    : 'border-lol-gold bg-lol-gold/10 text-lol-gold';

  return (
    <div className={`border rounded p-2 flex flex-col gap-1 ${urgencyColor}`}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-widest">Anti-Heal Audit</span>
        <span className="text-[8px] font-bold uppercase">{antiheal.urgency}</span>
      </div>
      <div className="text-[10px]">
        Healers: <strong>{antiheal.enemyHealers.join(', ')}</strong>
      </div>
      <div className="text-[10px] flex items-center gap-1.5">
        <span>{antiheal.selfHasGW ? '✅ You have GW' : '❌ You lack GW'}</span>
        {antiheal.allyGWCount > 0 && <span className="text-lol-dim">· {antiheal.allyGWCount} ally has it</span>}
      </div>
      {antiheal.suggestedItem && !antiheal.selfHasGW && (
        <div className="text-[10px] font-semibold">→ Buy: {antiheal.suggestedItem}</div>
      )}
    </div>
  );
}

function DamageChart() {
  const { analysis } = useStore();
  if (!analysis) return null;
  const { damageProfile: dp } = analysis;

  const bars = [
    { label: 'AD', pct: dp.adPercent, color: 'bg-lol-enemy', champs: dp.adChamps },
    { label: 'AP', pct: dp.apPercent, color: 'bg-lol-purple', champs: dp.apChamps },
    { label: 'Mixed', pct: dp.mixedPercent, color: 'bg-lol-gold', champs: [] },
  ];

  return (
    <div className="bg-lol-card border border-white/[0.07] rounded p-2">
      <div className="text-[9px] font-bold text-lol-gold uppercase tracking-widest mb-2">Enemy Damage Profile</div>
      <div className="flex flex-col gap-1.5">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="flex justify-between text-[9px] mb-0.5">
              <span className="text-lol-dim">{b.label} {b.champs.length > 0 && `(${b.champs.join(', ')})`}</span>
              <span className="text-lol-text font-semibold">{b.pct}%</span>
            </div>
            <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
              <div className={`h-full ${b.color} rounded-full transition-all`} style={{ width: `${b.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-lol-text">
        Primary: <strong className="text-lol-gold">{dp.primaryType}</strong> —{' '}
        {dp.primaryType === 'AD' ? 'prioritise Armor' : dp.primaryType === 'AP' ? 'prioritise Magic Resist' : 'build both'}
      </div>
    </div>
  );
}

function Recommendations() {
  const { analysis } = useStore();
  if (!analysis?.itemRecommendations.length) return null;
  const priorityColor = (p: string) => p === 'high' ? 'text-lol-enemy' : p === 'medium' ? 'text-lol-orange' : 'text-lol-dim';

  return (
    <div>
      <div className="text-[9px] font-bold text-lol-gold uppercase tracking-widest mb-1.5">Item Suggestions</div>
      <div className="flex flex-col gap-1.5">
        {analysis.itemRecommendations.map((rec, i) => (
          <div key={i} className="bg-lol-card border border-white/[0.07] rounded p-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-lol-text">{rec.name}</span>
              <span className={`text-[8px] font-bold uppercase ${priorityColor(rec.priority)}`}>{rec.priority}</span>
            </div>
            <div className="text-[9px] text-lol-dim mt-0.5">{rec.reason}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EnemyItems() {
  const { game } = useStore();
  if (!game) return null;
  return (
    <div>
      <div className="text-[9px] font-bold text-lol-gold uppercase tracking-widest mb-1.5">Enemy Builds</div>
      <div className="flex flex-col gap-1.5">
        {game.enemies.map((p) => (
          <div key={p.summonerName} className="flex items-center gap-1.5">
            <DDImg src={champUrl(p.ddKey)} alt={p.championName} className="w-6 h-6 rounded flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[9px] text-lol-dim truncate">{p.championName}</div>
              <div className="flex gap-0.5 mt-0.5">
                {p.items.map((item) => (
                  <DDImg key={item.slot} src={itemUrl(item.id)} alt={item.name} className="w-4 h-4 rounded" />
                ))}
                {p.items.length === 0 && <span className="text-[8px] text-lol-dim">No items</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ItemsTab() {
  return (
    <div className="flex flex-col gap-2 p-2 overflow-y-auto">
      <AntihealPanel />
      <DamageChart />
      <Recommendations />
      <EnemyItems />
    </div>
  );
}
