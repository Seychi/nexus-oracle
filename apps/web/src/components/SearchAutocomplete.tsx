import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllChampions, type DDChampion, championIcon, DDImg } from '../lib/dataDragon';

const RECENT_KEY = 'nexus-oracle-recent-searches';
const MAX_RECENT = 8;

interface RecentSearch {
  type: 'summoner';
  gameName: string;
  tagLine: string;
  timestamp: number;
}

function getRecent(): RecentSearch[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveRecentSearch(gameName: string, tagLine: string) {
  const recent = getRecent().filter(
    (r) => !(r.gameName === gameName && r.tagLine === tagLine),
  );
  recent.unshift({ type: 'summoner', gameName, tagLine, timestamp: Date.now() });
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

interface Props {
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  onSearch?: (gameName: string, tagLine: string) => void;
  autoFocus?: boolean;
  compact?: boolean;
}

export default function SearchAutocomplete({
  placeholder = 'Champion or Summoner (Name#Tag)...',
  className = '',
  inputClassName = '',
  onSearch,
  autoFocus = false,
  compact = false,
}: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [champions, setChampions] = useState<DDChampion[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAllChampions().then(setChampions).catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const recent = getRecent();
  const q = query.trim().toLowerCase();
  const hasHash = query.includes('#');

  // Champion matches
  const champMatches = q.length >= 1 && !hasHash
    ? champions
        .filter((c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
        .slice(0, 5)
    : [];

  // Recent matches
  const recentMatches = q.length === 0
    ? recent.slice(0, 5)
    : recent.filter(
        (r) =>
          r.gameName.toLowerCase().includes(q) ||
          `${r.gameName}#${r.tagLine}`.toLowerCase().includes(q),
      ).slice(0, 3);

  // Build suggestion list
  type Suggestion =
    | { type: 'champion'; champ: DDChampion }
    | { type: 'recent'; search: RecentSearch }
    | { type: 'summoner-search'; gameName: string; tagLine: string };

  const suggestions: Suggestion[] = [];

  // Add summoner search option if query has #
  if (hasHash && q.length > 2) {
    const hashIdx = query.lastIndexOf('#');
    const gameName = query.slice(0, hashIdx).trim();
    const tagLine = query.slice(hashIdx + 1).trim();
    if (gameName && tagLine) {
      suggestions.push({ type: 'summoner-search', gameName, tagLine });
    }
  }

  // Add recent searches
  for (const r of recentMatches) {
    suggestions.push({ type: 'recent', search: r });
  }

  // Add champion matches
  for (const c of champMatches) {
    suggestions.push({ type: 'champion', champ: c });
  }

  const showDropdown = open && suggestions.length > 0;

  const handleSelect = useCallback(
    (suggestion: Suggestion) => {
      setOpen(false);
      setQuery('');
      if (suggestion.type === 'champion') {
        navigate(`/champion/${suggestion.champ.id}`);
      } else if (suggestion.type === 'recent') {
        const { gameName, tagLine } = suggestion.search;
        saveRecentSearch(gameName, tagLine);
        if (onSearch) onSearch(gameName, tagLine);
        else navigate(`/summoner/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
      } else if (suggestion.type === 'summoner-search') {
        const { gameName, tagLine } = suggestion;
        saveRecentSearch(gameName, tagLine);
        if (onSearch) onSearch(gameName, tagLine);
        else navigate(`/summoner/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
      }
    },
    [navigate, onSearch],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    if (selectedIdx >= 0 && selectedIdx < suggestions.length) {
      handleSelect(suggestions[selectedIdx]);
      return;
    }

    const hashIdx = trimmed.lastIndexOf('#');
    if (hashIdx > 0 && hashIdx < trimmed.length - 1) {
      const gameName = trimmed.slice(0, hashIdx).trim();
      const tagLine = trimmed.slice(hashIdx + 1).trim();
      if (gameName && tagLine) {
        saveRecentSearch(gameName, tagLine);
        setQuery('');
        setOpen(false);
        if (onSearch) onSearch(gameName, tagLine);
        else navigate(`/summoner/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
        return;
      }
    }

    // Check champion match
    const champMatch = champions.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() || c.id.toLowerCase() === trimmed.toLowerCase(),
    );
    if (champMatch) {
      setQuery('');
      setOpen(false);
      navigate(`/champion/${champMatch.id}`);
      return;
    }

    // Default: treat as summoner with NA1 tag
    saveRecentSearch(trimmed, 'NA1');
    setQuery('');
    setOpen(false);
    if (onSearch) onSearch(trimmed, 'NA1');
    else navigate(`/summoner/${encodeURIComponent(trimmed)}/${encodeURIComponent('NA1')}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const h = compact ? 'py-1.5' : 'py-3';

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setSelectedIdx(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={`w-full bg-[#0d1117]/80 border border-white/10 rounded-lg px-4 ${h}
                       text-sm text-lol-text placeholder:text-lol-dim/50
                       focus:outline-none focus:border-lol-gold/50 focus:ring-1 focus:ring-lol-gold/30
                       transition-colors ${inputClassName}`}
            autoComplete="off"
          />
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lol-dim/40 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <button type="submit" className={`btn-primary px-4 ${h} rounded-lg text-sm font-semibold`}>
          Search
        </button>
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0d1117] border border-white/10 rounded-lg shadow-xl overflow-hidden max-h-80 overflow-y-auto">
          {suggestions.map((s, idx) => {
            const isSelected = idx === selectedIdx;
            const base = `flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
              isSelected ? 'bg-lol-gold/10' : 'hover:bg-white/[0.04]'
            }`;

            if (s.type === 'summoner-search') {
              return (
                <div key="summoner-search" className={base} onClick={() => handleSelect(s)}>
                  <svg className="w-4 h-4 text-lol-dim shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <div>
                    <p className="text-sm text-lol-text">
                      Search summoner <span className="font-semibold text-lol-gold">{s.gameName}#{s.tagLine}</span>
                    </p>
                  </div>
                </div>
              );
            }

            if (s.type === 'recent') {
              return (
                <div key={`recent-${s.search.gameName}-${s.search.tagLine}`} className={base} onClick={() => handleSelect(s)}>
                  <svg className="w-4 h-4 text-lol-dim/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-lol-text">
                    {s.search.gameName}<span className="text-lol-dim">#{s.search.tagLine}</span>
                  </p>
                </div>
              );
            }

            return (
              <div key={`champ-${s.champ.id}`} className={base} onClick={() => handleSelect(s)}>
                <DDImg
                  src={championIcon(s.champ.id)}
                  alt={s.champ.name}
                  className="w-7 h-7 rounded-full border border-white/10 shrink-0"
                />
                <div>
                  <p className="text-sm text-lol-text font-medium">{s.champ.name}</p>
                  <p className="text-[10px] text-lol-dim">{s.champ.tags.join(', ')}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
