# NEXUS ORACLE — League of Legends Strategic Overlay

## Project Overview

An Electron desktop app that acts as a real-time strategic overlay for League of Legends. It connects to Riot's **Live Client Data API** (localhost:2999) during active games and provides AI-powered analysis including team comp analysis, itemization advice, teamfight strategy, objective timing, healing vs antiheal tracking, and macro decision-making.

## Tech Stack

- **Runtime**: Electron (desktop overlay with transparency + always-on-top)
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Build**: Vite
- **Data Sources**:
  - Riot Live Client Data API (`https://127.0.0.1:2999/liveclientdata/*`) — real-time in-game data, no API key needed
  - Riot Data Dragon (`https://ddragon.leagueoflegends.com/cdn/...`) — static champion/item/rune assets
  - Community Dragon (`https://raw.communitydragon.org/latest/...`) — supplementary assets
  - Anthropic Claude API (optional) — AI-powered analysis via `@anthropic-ai/sdk`
- **State Management**: Zustand
- **Styling**: Tailwind CSS with custom dark gaming theme

## Architecture

```
nexus-oracle/
├── electron/
│   ├── main.ts              # Electron main process, overlay window setup
│   ├── preload.ts            # Context bridge for IPC
│   └── tray.ts               # System tray with toggle overlay
├── src/
│   ├── App.tsx               # Main app shell with tab navigation
│   ├── main.tsx              # React entry point
│   ├── index.html            # HTML template
│   ├── api/
│   │   ├── liveClient.ts     # Poll Live Client Data API every 1-2s
│   │   ├── dataDragon.ts     # Fetch & cache static data (champions, items, runes)
│   │   └── claudeAnalysis.ts # Optional: Send game state to Claude API for deeper analysis
│   ├── engine/
│   │   ├── compAnalyzer.ts   # Team composition classification & matchup analysis
│   │   ├── itemAdvisor.ts    # Contextual item recommendations based on enemy comp
│   │   ├── teamfightCoach.ts # Role-based teamfight positioning & target priority
│   │   ├── objectiveTimer.ts # Dragon/Baron/Herald spawn tracking & call-to-action
│   │   ├── antihealAudit.ts  # Healing sources vs Grievous Wounds coverage
│   │   ├── goldTracker.ts    # Gold advantage estimation from CS/KDA
│   │   ├── splitpushAdvisor.ts # When to split vs group
│   │   └── threatRanker.ts   # Enemy threat scoring by KDA, items, level
│   ├── data/
│   │   ├── championClasses.ts # Champion → class mapping (Tank, Assassin, Mage, etc.)
│   │   ├── healingChamps.ts   # Champions with significant healing
│   │   ├── antihealItems.ts   # Items that apply Grievous Wounds
│   │   ├── splitpushChamps.ts # Strong split-pushers
│   │   └── engageChamps.ts    # Engage/initiation champions
│   ├── store/
│   │   └── gameStore.ts      # Zustand store: game state, player data, analysis results
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx         # App header with connection status, game timer
│   │   │   ├── TabNav.tsx         # Tab navigation (Overview, Teamfight, Items, Macro)
│   │   │   └── OverlayFrame.tsx   # Draggable, resizable overlay container
│   │   ├── overview/
│   │   │   ├── GoldAdvantageBar.tsx
│   │   │   ├── TeamPanel.tsx      # Ally/enemy team with champion icons, KDA, items
│   │   │   ├── CompBreakdown.tsx  # Class distribution visualization
│   │   │   ├── AlertFeed.tsx      # Critical alerts (buy antiheal, enemy power spike, etc.)
│   │   │   └── EventTimeline.tsx  # Recent game events (dragons, barons, kills)
│   │   ├── teamfight/
│   │   │   ├── ThreatRanking.tsx  # Enemy sorted by threat level
│   │   │   ├── FocusPriority.tsx  # Who to target based on your role
│   │   │   ├── PositioningTips.tsx # Role-specific positioning advice
│   │   │   └── EngageAnalysis.tsx # Which team has engage advantage
│   │   ├── items/
│   │   │   ├── ItemRecommendations.tsx # Contextual build suggestions
│   │   │   ├── AntihealAudit.tsx      # Healing vs antiheal status
│   │   │   ├── EnemyItemBreakdown.tsx  # What each enemy has built
│   │   │   └── DamageTypeChart.tsx     # AP vs AD vs Tank distribution
│   │   └── macro/
│   │       ├── ObjectiveTracker.tsx    # Dragon/Baron/Herald status
│   │       ├── GamePhaseIndicator.tsx  # Early/Mid/Late with advice
│   │       ├── SplitpushPlan.tsx       # Split vs group decision
│   │       └── MapInfo.tsx            # Terrain type, game mode
│   └── styles/
│       └── globals.css        # Tailwind base + custom gaming theme CSS vars
├── CLAUDE.md                  # This file
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.yml       # Electron packaging config
├── tailwind.config.ts
└── .env.example               # ANTHROPIC_API_KEY (optional)
```

## Key Data Flows

### 1. Live Client Data API (core — no API key)
The Riot game client exposes a local HTTPS API at `https://127.0.0.1:2999` during active games. It uses a self-signed certificate (must be ignored or use the root cert from Riot).

**Endpoints to poll every 1-2 seconds:**
- `GET /liveclientdata/allgamedata` — everything: active player, all players, events, game stats
- `GET /liveclientdata/playerlist` — all 10 players with items, runes, scores, team, level
- `GET /liveclientdata/activeplayer` — your champion stats, gold, abilities, runes
- `GET /liveclientdata/eventdata` — game events (kills, dragons, barons, turrets)
- `GET /liveclientdata/gamestats` — game time, mode, map terrain

**Key data returned per player:**
```json
{
  "championName": "Jinx",
  "team": "ORDER",
  "level": 11,
  "position": "BOTTOM",
  "isDead": false,
  "respawnTimer": 0.0,
  "scores": { "kills": 7, "deaths": 2, "assists": 4, "creepScore": 195, "wardScore": 6 },
  "items": [{ "itemID": 3031, "displayName": "Infinity Edge", "count": 1, "slot": 0 }],
  "runes": { "keystone": { "displayName": "Lethal Tempo", "id": 8008 } },
  "summonerSpells": { "summonerSpellOne": { "displayName": "Heal" }, "summonerSpellTwo": { "displayName": "Flash" } }
}
```

**Active player also has full champion stats:**
```json
{
  "championStats": {
    "attackDamage": 187, "abilityPower": 0, "armor": 68, "magicResist": 38,
    "attackSpeed": 1.24, "critChance": 0.4, "maxHealth": 1520, "currentHealth": 1320,
    "moveSpeed": 330, "lifeSteal": 0.12, "abilityHaste": 0,
    "armorPenetrationFlat": 0, "bonusArmorPenetrationPercent": 0.35,
    "physicalLethality": 0, "magicPenetrationFlat": 0
  }
}
```

**SSL Note:** The game client uses a self-signed cert. In Electron, configure:
```ts
// In main process, or use the Riot root cert
app.commandLine.appendSwitch('ignore-certificate-errors');
// Or better: use the Riot-provided PEM file from
// https://static.developer.riotgames.com/docs/lol/riotgames.pem
```

### 2. Data Dragon (static data — cached)
Fetch once per patch and cache locally:
- Champions: `https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion.json`
- Items: `https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/item.json`
- Runes: `https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/runesReforged.json`
- Summoner spells: `https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/summoner.json`
- Version list: `https://ddragon.leagueoflegends.com/api/versions.json`
- Champion icons: `https://ddragon.leagueoflegends.com/cdn/{version}/img/champion/{name}.png`
- Item icons: `https://ddragon.leagueoflegends.com/cdn/{version}/img/item/{id}.png`

### 3. Claude API Analysis (optional premium feature)
If ANTHROPIC_API_KEY is set, send compressed game state to Claude for:
- Natural language strategic advice
- More nuanced comp analysis
- Specific champion matchup tips
- Dynamic item build paths

Use `@anthropic-ai/sdk` with `claude-sonnet-4-20250514` model. Keep requests lean (summarize the game state, don't send raw JSON).

## Analysis Engine Specifications

### Team Comp Analyzer
- Classify each champion into: Tank, Assassin, Mage, Marksman, Fighter, Enchanter, Support
- Detect team archetypes: Poke, Engage, Protect-the-carry, Splitpush, Pick
- Generate matchup warnings (e.g., "enemy has 3 AP — stack MR")

### Item Advisor
- Cross-reference enemy champions + their current items with recommended counter-builds
- Track healing sources vs antiheal coverage (Grievous Wounds audit)
- Recommend defensive items when enemy has specific threats (assassins → GA/Zhonya's)
- Suggest penetration items when enemy stacks armor/MR

### Teamfight Coach
- Rank enemies by threat (weighted KDA + items + level)
- Role-specific advice: ADC stays backline, Assassin waits for CC, Tank engages or peels
- Identify focus targets (squishiest carry vs most-fed enemy)
- Engage advantage analysis (which team has more hard engage)

### Objective Timer
- Track dragon count and types, baron kills, herald kills
- Game phase detection (early/mid/late) with phase-appropriate advice
- Spawn timer reminders based on game time

### Gold Tracker
- Estimate gold from CS (≈22g per CS), kills (≈300g), assists (≈150g)
- Show gold differential with visual bar
- Identify which lanes are winning/losing

## Electron Overlay Behavior

- **Always on top** during game, semi-transparent background
- **Draggable** — user can position anywhere on screen
- **Collapsible** — minimize to a small floating icon
- **System tray** — toggle visibility, quit app
- **Hotkey** — configurable toggle (default: Ctrl+Shift+O)
- **Auto-detect game** — poll for Live Client API availability, show "waiting for game" when not in game
- **Frameless window** with custom title bar
- **Click-through** option for parts of the overlay that shouldn't block game input

## Riot API Policies — IMPORTANT

Per Riot's Game Integrity policy:
- ✅ Display static data available prior to the game
- ✅ Show player stats, KDA, items, runes during the game (this is visible to all players)
- ✅ Provide educational analysis and suggestions
- ✅ Highlight important decisions and give multiple choices
- track enemy ability cooldowns (not visible in game client)
- calculate hidden MMR/ELO
- provide information not already available in the game client
- identify deliberately hidden players


## Legal Disclaimer (must be shown in app)

"NEXUS ORACLE is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc."

## Development Commands

```bash
# Install dependencies
npm install

# Run in development mode (Electron + Vite hot reload)
npm run dev

# Build for production
npm run build

# Package as distributable
npm run package
```

