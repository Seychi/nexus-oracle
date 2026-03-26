import { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import SearchAutocomplete from './components/SearchAutocomplete';
import HomePage from './pages/HomePage';
import TierList from './pages/TierList';
import ChampionPage from './pages/ChampionPage';
import SummonerPage from './pages/SummonerPage';
import SummonerSearch from './pages/SummonerSearch';
import ChampionGrid from './pages/ChampionGrid';

function TopBar({ onMenuToggle }: { onMenuToggle: () => void }) {
  return (
    <header className="sticky top-0 z-30 h-14 bg-[#0d1117]/95 backdrop-blur border-b border-white/5 flex items-center px-4 gap-4">
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden text-lol-dim hover:text-lol-text transition-colors p-1"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Brand (mobile) */}
      <Link to="/" className="lg:hidden flex items-center gap-2 shrink-0">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-lol-gold" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <span className="text-lol-gold font-extrabold text-base tracking-wide">NEXUS ORACLE</span>
      </Link>

      <div className="flex-1" />

      {/* Search with autocomplete */}
      <div className="hidden sm:block w-72">
        <SearchAutocomplete compact placeholder="Search champion or summoner..." />
      </div>
    </header>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuToggle={() => setSidebarOpen((v) => !v)} />

        <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tierlist" element={<TierList />} />
            <Route path="/champions" element={<ChampionGrid />} />
            <Route path="/champion/:championId" element={<ChampionPage />} />
            <Route path="/summoner" element={<SummonerSearch />} />
            <Route path="/summoner/:gameName/:tagLine" element={<SummonerPage />} />
          </Routes>
        </main>

        <footer className="text-center text-[10px] text-lol-dim/40 py-4 border-t border-white/5 px-4">
          NEXUS ORACLE is not endorsed by Riot Games and does not reflect the views or opinions of
          Riot Games or anyone officially involved in producing or managing Riot Games properties.
          Riot Games and all associated properties are trademarks or registered trademarks of Riot
          Games, Inc.
        </footer>
      </div>
    </div>
  );
}
