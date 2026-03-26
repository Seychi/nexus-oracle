import { useState, type FormEvent } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import TierList from './pages/TierList';
import ChampionPage from './pages/ChampionPage';
import SummonerPage from './pages/SummonerPage';
import SummonerSearch from './pages/SummonerSearch';
import ChampionGrid from './pages/ChampionGrid';

function TopBar({ onMenuToggle }: { onMenuToggle: () => void }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = search.trim();
    if (!trimmed) return;

    const hashIdx = trimmed.lastIndexOf('#');
    if (hashIdx > 0 && hashIdx < trimmed.length - 1) {
      const gameName = trimmed.slice(0, hashIdx).trim();
      const tagLine = trimmed.slice(hashIdx + 1).trim();
      if (gameName && tagLine) {
        navigate(`/summoner/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
        setSearch('');
        return;
      }
    }

    navigate(`/summoner/${encodeURIComponent(trimmed)}/${encodeURIComponent('NA1')}`);
    setSearch('');
  }

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

      {/* Brand (visible on mobile when sidebar is hidden) */}
      <Link to="/" className="lg:hidden flex items-center gap-2 shrink-0">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-lol-gold" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <span className="text-lol-gold font-extrabold text-base tracking-wide">NEXUS ORACLE</span>
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search (desktop) */}
      <form onSubmit={handleSubmit} className="hidden sm:flex items-center gap-2">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search summoner... (Name#Tag)"
            className="w-56 bg-lol-dark border border-white/10 rounded-md px-3 py-1.5 text-sm
                       text-lol-text placeholder:text-lol-dim/50
                       focus:outline-none focus:border-lol-gold/50 focus:ring-1 focus:ring-lol-gold/30
                       transition-colors"
          />
          <svg
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-lol-dim/40 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <button type="submit" className="btn-primary text-sm py-1.5 px-3 rounded-md">
          Search
        </button>
      </form>
    </header>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
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
