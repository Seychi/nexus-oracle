import { create } from 'zustand';
import type {
  NormalisedGame, GameAnalysis, Alert,
  ThreatEntry, AntihealStatus, DamageProfile,
  CompAnalysis, ObjectiveStatus, GoldTracker, ItemRecommendation,
} from '../types';
import { rankThreats } from '../engine/threatRanker';
import { auditAntiheal } from '../engine/antihealAudit';
import { analyzeComp } from '../engine/compAnalyzer';
import { computeObjectives, computeBuffs } from '../engine/objectiveTimer';
import { computeGold } from '../engine/goldTracker';
import { profileDamage } from '../engine/damageProfiler';
import { recommendItems } from '../engine/itemAdvisor';
import { generateAlerts } from '../engine/alertEngine';
import { getSplitAdvice } from '../engine/splitpushAdvisor';
import { predictWin } from '../engine/winPredictor';
import { trackLanes } from '../engine/laneTracker';
import { adviseRecall } from '../engine/recallAdvisor';

export type GameStatus = 'waiting' | 'in-game' | 'champ-select';
export type TabId = 'overview' | 'teamfight' | 'items' | 'macro' | 'ai';

interface Store {
  // Status
  status: GameStatus;
  activeTab: TabId;

  // Raw game data
  game: NormalisedGame | null;

  // Computed analysis
  analysis: GameAnalysis | null;

  // Actions
  setStatus: (s: GameStatus) => void;
  setGame:   (g: NormalisedGame) => void;
  setTab:    (t: TabId) => void;
  setClaudeAnalysis: (text: string) => void;
  setAnalysing:      (v: boolean)  => void;
}

let prevGame: NormalisedGame | null = null;

function runAnalysis(game: NormalisedGame): GameAnalysis {
  const self      = game.allies.find((p) => p.isSelf) ?? game.allies[0];
  const selfLevel = self?.level ?? 1;
  const threats   = rankThreats(game.enemies, game.selfStats, selfLevel);
  const antiheal  = auditAntiheal(game.enemies, game.allies, self);
  const comp      = analyzeComp(game.allies, game.enemies);
  const objectives = computeObjectives(game.events, game.gameTime, game.allies, game.enemies);
  const gold      = computeGold(game.allies, game.enemies);
  const damageProfile = profileDamage(game.enemies);
  const itemRecommendations = self ? recommendItems(game.enemies, self, game.selfStats) : [];
  const alerts    = generateAlerts(game, antiheal, objectives, threats, prevGame?.enemies ?? null);
  const splitPushAdvice = self ? getSplitAdvice(self, game.enemies, game.gameTime) : null;
  const winPrediction = predictWin(game, gold, objectives);
  const laneStates = trackLanes(game.allies, game.enemies);
  const recallAdvice = self ? adviseRecall(game.gold, game.selfStats, self.items) : null;
  const buffs = computeBuffs(game.events, game.gameTime, game.allies);

  const gamePhase = game.gameTime < 15 * 60 ? 'early'
    : game.gameTime < 30 * 60               ? 'mid'
    : 'late';

  return {
    threats,
    focusTarget: threats[0] ?? null,
    antiheal,
    damageProfile,
    comp,
    objectives,
    gold,
    alerts,
    gamePhase,
    itemRecommendations,
    splitPushAdvice,
    winPrediction,
    laneStates,
    recallAdvice,
    buffs,
    claudeAnalysis: null,
    isAnalysing: false,
  };
}

export const useStore = create<Store>((set, get) => ({
  status:    'waiting',
  activeTab: 'overview',
  game:      null,
  analysis:  null,

  setStatus: (status) => set({ status }),

  setGame: (game) => {
    const analysis = runAnalysis(game);
    prevGame = game;
    const prev = get().analysis;
    set({
      game,
      analysis: {
        ...analysis,
        claudeAnalysis: prev?.claudeAnalysis ?? null,
        isAnalysing: prev?.isAnalysing ?? false,
      },
    });
  },

  setTab: (activeTab) => set({ activeTab }),

  setClaudeAnalysis: (text) =>
    set((s) => ({ analysis: s.analysis ? { ...s.analysis, claudeAnalysis: text, isAnalysing: false } : s.analysis })),

  setAnalysing: (v) =>
    set((s) => ({ analysis: s.analysis ? { ...s.analysis, isAnalysing: v } : s.analysis })),
}));
