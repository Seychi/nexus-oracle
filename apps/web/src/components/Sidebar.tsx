import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: '\u2302' },
  {
    label: 'Champions',
    icon: '\u2694',
    children: [
      { to: '/tierlist', label: 'Tier List' },
      { to: '/champions', label: 'All Champions' },
    ],
  },
  { to: '/summoner', label: 'Summoner Lookup', icon: '\u2315' },
];

function linkClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-2.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-lol-gold/15 text-lol-gold'
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
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) =>
            item.children ? (
              <div key={item.label}>
                <div className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-lol-dim/60">
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </div>
                <div className="ml-4 space-y-0.5">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={linkClass}
                      onClick={onClose}
                    >
                      <span className="text-lol-dim/40">&#8250;</span>
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to!}
                className={linkClass}
                onClick={onClose}
                end={item.to === '/'}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            ),
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 text-[10px] text-lol-dim/40 leading-relaxed">
          NEXUS ORACLE is not endorsed by Riot Games. Riot Games and all associated properties
          are trademarks of Riot Games, Inc.
        </div>
      </aside>
    </>
  );
}
