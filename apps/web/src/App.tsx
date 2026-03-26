import { useState, type FormEvent } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import TierList from './pages/TierList';
import ChampionPage from './pages/ChampionPage';
import SummonerPage from './pages/SummonerPage';

function Navbar() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = search.trim();
    if (!trimmed) return;

    // Expect format: GameName#TagLine
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

    // If no # separator, try using the whole string with a default region tag
    navigate(`/summoner/${encodeURIComponent(trimmed)}/${encodeURIComponent('NA1')}`);
    setSearch('');
  }

  return (
    <nav className="sticky top-0 z-50 bg-lol-card/95 backdrop-blur border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 text-lol-gold"
            fill="currentColor"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span className="text-lol-gold font-extrabold text-lg tracking-wide">
            NEXUS ORACLE
          </span>
        </Link>

        {/* Links */}
        <Link
          to="/"
          className="text-sm font-medium text-lol-dim hover:text-lol-text transition-colors"
        >
          Tier List
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search summoner... (Name#Tag)"
              className="w-64 bg-lol-dark border border-white/10 rounded-md px-3 py-1.5 text-sm
                         text-lol-text placeholder:text-lol-dim/60
                         focus:outline-none focus:border-lol-gold/50 focus:ring-1 focus:ring-lol-gold/30
                         transition-colors"
            />
            <svg
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-lol-dim/60 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <button
            type="submit"
            className="btn-primary text-sm py-1.5 px-3 rounded-md"
          >
            Search
          </button>
        </form>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/" element={<TierList />} />
          <Route path="/champion/:championId" element={<ChampionPage />} />
          <Route
            path="/summoner/:gameName/:tagLine"
            element={<SummonerPage />}
          />
        </Routes>
      </main>
      <footer className="text-center text-xs text-lol-dim/50 py-4 border-t border-white/5">
        NEXUS ORACLE is not endorsed by Riot Games and does not reflect the views or opinions of
        Riot Games or anyone officially involved in producing or managing Riot Games properties.
        Riot Games and all associated properties are trademarks or registered trademarks of Riot
        Games, Inc.
      </footer>
    </div>
  );
}
