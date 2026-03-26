import React from 'react';
import { useStore, type TabId } from '../../store/gameStore';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview',   label: 'Overview',   icon: '📊' },
  { id: 'teamfight',  label: 'Teamfight',  icon: '⚔️' },
  { id: 'items',      label: 'Items',      icon: '🛒' },
  { id: 'macro',      label: 'Macro',      icon: '🗺️' },
];

export default function TabNav() {
  const { activeTab, setTab, analysis } = useStore();
  const alertCount = analysis?.alerts.filter((a) => a.type === 'danger').length ?? 0;

  return (
    <div className="flex border-b border-white/[0.07] bg-lol-bg/80">
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        const badge  = tab.id === 'overview' && alertCount > 0;
        return (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`flex-1 py-1.5 text-2xs font-semibold tracking-wide transition-colors relative
              ${active
                ? 'text-lol-gold border-b-2 border-lol-gold bg-lol-gold/5'
                : 'text-lol-dim hover:text-lol-text hover:bg-white/5'}`}
          >
            <span className="hidden sm:inline">{tab.icon} </span>{tab.label}
            {badge && (
              <span className="absolute top-0.5 right-1 w-3.5 h-3.5 bg-lol-enemy text-white rounded-full text-[8px] flex items-center justify-center">
                {alertCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
