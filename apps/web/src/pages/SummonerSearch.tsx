import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SummonerSearch() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

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
        return;
      }
    }

    setError('Please use the format: GameName#TagLine (e.g., Faker#KR1)');
  }

  return (
    <div className="max-w-lg mx-auto mt-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-lol-text mb-2">Summoner Lookup</h1>
        <p className="text-sm text-lol-dim">
          Search for any player by their Riot ID
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6">
        <label className="block text-sm font-medium text-lol-dim mb-2">
          Riot ID
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setError(''); }}
            placeholder="GameName#TagLine"
            className="flex-1 bg-lol-dark border border-white/10 rounded-lg px-4 py-3
                       text-sm text-lol-text placeholder:text-lol-dim/50
                       focus:outline-none focus:border-lol-gold/50 focus:ring-1 focus:ring-lol-gold/30
                       transition-colors"
            autoFocus
          />
          <button type="submit" className="btn-primary px-6 py-3 rounded-lg text-sm font-semibold">
            Search
          </button>
        </div>
        {error && (
          <p className="text-red-400 text-xs mt-2">{error}</p>
        )}
        <p className="text-[11px] text-lol-dim/40 mt-3">
          Examples: Faker#KR1, Doublelift#NA1, Caps#EUW
        </p>
      </form>
    </div>
  );
}
