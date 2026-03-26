// ── Primitives ───────────────────────────────────────────────────────────────
export type Team         = 'ORDER' | 'CHAOS';
export type ChampClass   = 'Tank' | 'Fighter' | 'Assassin' | 'Mage' | 'Marksman' | 'Enchanter' | 'Support' | 'Unknown';
export type TeamArchetype= 'Engage' | 'Poke' | 'Protect-the-carry' | 'Splitpush' | 'Pick' | 'Teamfight' | 'Balanced';
export type DamageType   = 'AD' | 'AP' | 'Mixed';
export type AlertType    = 'danger' | 'warning' | 'info' | 'success';
export type AlertCategory= 'antiheal' | 'item' | 'objective' | 'threat' | 'spell' | 'general';
export type GamePhase    = 'early' | 'mid' | 'late';
export type ThreatPriority = 'extreme' | 'high' | 'medium' | 'low';

// ── Items / Abilities ─────────────────────────────────────────────────────────
export interface Item {
  id: number;
  name: string;
  slot: number;
}

export interface Ability {
  key: 'Q' | 'W' | 'E' | 'R';
  name: string;
  level: number;
}

// ── Active Player Stats ───────────────────────────────────────────────────────
export interface ChampionStats {
  ad: number;
  ap: number;
  armor: number;
  mr: number;
  abilityHaste: number;
  crit: number;
  attackSpeed: number;
  moveSpeed: number;
  currentHp: number;
  maxHp: number;
  currentMana: number;
  maxMana: number;
  lifeSteal: number;
  lethality: number;
  magicPen: number;
  magicPenPercent: number;
  armorPenPercent: number;
  tenacity: number;
  omnivamp: number;
}

// ── Player ────────────────────────────────────────────────────────────────────
export interface Player {
  summonerName: string;
  championName: string;
  ddKey: string;       // DDragon image key e.g. "MissFortune"
  team: Team;
  level: number;
  isDead: boolean;
  respawnTimer: number;
  items: Item[];
  keystone: string;
  primaryTree: string;
  secondaryTree: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  wardScore: number;
  summonerSpells: [string, string];
  position: string;
  isSelf: boolean;
}

// ── Events ────────────────────────────────────────────────────────────────────
export interface GameEvent {
  EventID: number;
  EventName: string;
  EventTime: number;
  KillerName?: string;
  VictimName?: string;
  Assisters?: string[];
  DragonType?: string;
  TurretKilled?: string;
  InhibKilled?: string;
  BaronKilled?: string;
  HeraldKilled?: string;
}

// ── Raw API shape ─────────────────────────────────────────────────────────────
export interface RawLiveData {
  activePlayer: {
    summonerName: string;
    level: number;
    currentGold: number;
    championStats: Record<string, number>;
    abilities: Record<string, { displayName: string; abilityLevel: number }>;
    fullRunes: {
      keystone: { displayName: string };
      primaryRuneTree: { displayName: string };
      secondaryRuneTree: { displayName: string };
    };
  };
  allPlayers: Array<{
    summonerName: string;
    championName: string;
    rawChampionName: string;
    team: string;
    level: number;
    isDead: boolean;
    respawnTimer: number;
    position: string;
    items: Array<{ itemID: number; displayName: string; slot: number }>;
    runes: {
      keystone?: { displayName: string };
      primaryRuneTree?: { displayName: string };
      secondaryRuneTree?: { displayName: string };
    };
    scores: { kills: number; deaths: number; assists: number; creepScore: number; wardScore: number };
    summonerSpells: {
      summonerSpellOne: { displayName: string };
      summonerSpellTwo: { displayName: string };
    };
  }>;
  events: { Events: GameEvent[] };
  gameData: { gameTime: number; gameMode: string; mapName: string; mapNumber: number; mapTerrain: string };
}

// ── Normalised game data (sent from main → renderer) ─────────────────────────
export interface NormalisedGame {
  gameTime: number;
  gameMode: string;
  mapTerrain: string;
  selfTeam: Team;
  allies: Player[];
  enemies: Player[];
  selfStats: ChampionStats;
  selfAbilities: Ability[];
  gold: number;
  events: GameEvent[];
}

// ── Analysis outputs ──────────────────────────────────────────────────────────
export interface ThreatEntry {
  player: Player;
  score: number;
  reasons: string[];
  champClass: ChampClass;
  priority: ThreatPriority;
}

export interface AntihealStatus {
  enemyHealers: string[];          // champion names
  selfHasGW: boolean;
  allyGWCount: number;
  urgency: 'none' | 'consider' | 'recommended' | 'urgent';
  suggestedItem: string | null;
}

export interface DamageProfile {
  adPercent: number;
  apPercent: number;
  mixedPercent: number;
  primaryType: DamageType;
  adChamps: string[];
  apChamps: string[];
}

export interface CompAnalysis {
  enemyClasses: Partial<Record<ChampClass, string[]>>;
  allyClasses: Partial<Record<ChampClass, string[]>>;
  enemyArchetype: TeamArchetype;
  allyArchetype: TeamArchetype;
  engageAdvantage: 'ally' | 'enemy' | 'even';
  matchupWarnings: string[];
  enemyEngagers: string[];
  allyEngagers: string[];
  enemyHealers: string[];
}

export interface ObjectiveStatus {
  dragon: { killCount: number; types: string[]; nextSpawnTime: number | null; isAlive: boolean };
  baron:  { killCount: number; nextSpawnTime: number | null; isAlive: boolean };
  herald: { killed: boolean; nextSpawnTime: number | null; isAlive: boolean };
}

export interface GoldTracker {
  allyEstimate: number;
  enemyEstimate: number;
  diff: number;
  leading: 'ally' | 'enemy' | 'even';
}

export interface Alert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  message: string;
  timestamp: number;
}

export interface ItemRecommendation {
  name: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  counters: string;
}

export interface GameAnalysis {
  threats: ThreatEntry[];
  focusTarget: ThreatEntry | null;
  antiheal: AntihealStatus;
  damageProfile: DamageProfile;
  comp: CompAnalysis;
  objectives: ObjectiveStatus;
  gold: GoldTracker;
  alerts: Alert[];
  gamePhase: GamePhase;
  itemRecommendations: ItemRecommendation[];
  splitPushAdvice: string | null;
  claudeAnalysis: string | null;
  isAnalysing: boolean;
}
