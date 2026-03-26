import { create } from 'zustand';
import type {
  NormalisedGame, GameAnalysis, Alert,
  ThreatEntry, AntihealStatus, DamageProfile,
  CompAnalysis, ObjectiveStatus, GoldTracker, ItemRecommendation,
} from '../types';
import { rankThreats } from '../engine/threatRanker';
import { auditAntiheal } from '../engine/antihealAudit';
import { analyzeComp } from '../engine/compAnalyzer';
import { computeObjectives } from '../engine/objectiveTimer';
import { computeGold } from '../engine/goldTracker';
import { profileDamage } from '../engine/damageProfiler';
import { recommendItems } from '../engine/itemAdvisor';
import { generateAlerts } from '../engine/alertEngine';
import { getSplitAdvice } from '../engine/splitpushAdvisor';

export type GameStatus = 'waiting' | 'in-game';
export type TabId = 'overview' | 'teamfight' | 'items' | 'macro';

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

function runAnalysis(game: NormalisedGame): GameAnalysis {
  const self    = game.allies.find((p) => p.isSelf) ?? game.allies[0];
  const threats = rankThreats(game.enemies, game.selfStats);
  const antiheal = auditAntiheal(game.enemies, game.allies, self);
  const comp     = analyzeComp(game.allies, game.enemies);
  const objectives = computeObjectives(game.events, game.gameTime);
  const gold     = computeGold(game.allies, game.enemies);
  const damageProfile = profileDamage(game.enemies);
  const itemRecommendations = self ? recommendItems(game.enemies, self, game.selfStats) : [];
  const alerts   = generateAlerts(game, antiheal, objectives, threats);
  const splitPushAdvice = self ? getSplitAdvice(self, game.enemies, game.gameTime) : null;

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
    // Preserve claude analysis across updates
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
