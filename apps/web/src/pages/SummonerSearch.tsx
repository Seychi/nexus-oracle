import SearchAutocomplete from '../components/SearchAutocomplete';

export default function SummonerSearch() {
  return (
    <div className="max-w-lg mx-auto mt-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-lol-text mb-2">Summoner Lookup</h1>
        <p className="text-sm text-lol-dim">
          Search for any player by their Riot ID
        </p>
      </div>

      <div className="card p-6">
        <label className="block text-sm font-medium text-lol-dim mb-2">Riot ID</label>
        <SearchAutocomplete
          placeholder="GameName#TagLine"
          autoFocus
        />
        <p className="text-[11px] text-lol-dim/40 mt-3">
          Examples: Faker#KR1, Doublelift#NA1, Caps#EUW
        </p>
      </div>
    </div>
  );
}
