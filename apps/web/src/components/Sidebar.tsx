import { NavLink } from 'react-router-dom';

interface NavItem {
  to?: string;
  label: string;
  icon: string;
  badge?: string;
  children?: { to: string; label: string }[];
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { to: '/', label: 'Home', icon: '\u2302' },
    ],
  },
  {
    title: 'Champions',
    items: [
      { to: '/tierlist', label: 'Tier List', icon: '\u2606' },
      { to: '/champions', label: 'All Champions', icon: '\u2694' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { to: '/data-studio', label: 'Data Studio', icon: '\u2637', badge: 'NEW' },
      { to: '/leaderboards', label: 'Leaderboards', icon: '\u2655' },
      { to: '/matches', label: 'Matches', icon: '\u229A' },
    ],
  },
  {
    title: 'Players',
    items: [
      { to: '/summoner', label: 'Summoner Lookup', icon: '\u2315' },
    ],
  },
];

function linkClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
    isActive
      ? 'bg-lol-gold/15 text-lol-gold shadow-sm shadow-lol-gold/5'
      : 'text-lol-dim hover:text-lol-text hover:bg-white/5'
  }`;
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-60 bg-[#0d1117] border-r border-white/5
          flex flex-col transition-transform duration-200
          lg:sticky lg:top-0 lg:translate-x-0 lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Brand */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-white/5 shrink-0">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-lol-gold" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span className="text-lol-gold font-extrabold text-lg tracking-wide">
            NEXUS ORACLE
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx}>
              {section.title && (
                <div className="flex items-center gap-2 px-3 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-lol-dim/40">
                    {section.title}
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to!}
                    className={linkClass}
                    onClick={onClose}
                    end={item.to === '/'}
                  >
                    <span className="text-base w-5 text-center opacity-60">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-bold bg-lol-gold/20 text-lol-gold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Version & Footer */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-glow" />
            <span className="text-[10px] text-emerald-400/70 font-medium">Online</span>
          </div>
          <p className="text-[9px] text-lol-dim/30 leading-relaxed">
            NEXUS ORACLE is not endorsed by Riot Games. Riot Games and all associated properties
            are trademarks of Riot Games, Inc.
          </p>
        </div>
      </aside>
    </>
  );
}
