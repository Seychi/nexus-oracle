import type { NormalisedGame, GoldTracker, ObjectiveStatus, GameEvent, WinPrediction, WinFactor } from '../types';

export function predictWin(
  game: NormalisedGame, gold: GoldTracker, objectives: ObjectiveStatus,
): WinPrediction {
  const factors: WinFactor[] = [];

  // ── Gold advantage ─────────────────────────────────────────────────────────
  const goldFactor = Math.tanh(gold.diff / 5000);
  factors.push({
    name: 'Gold',
    value: `${gold.diff > 0 ? '+' : ''}${(gold.diff / 1000).toFixed(1)}k`,
    impact: gold.diff > 500 ? 'positive' : gold.diff < -500 ? 'negative' : 'neutral',
  });

  // ── Kill advantage ─────────────────────────────────────────────────────────
  const allyKills  = game.allies.reduce((s, p) => s + p.kills, 0);
  const enemyKills = game.enemies.reduce((s, p) => s + p.kills, 0);
  const killDiff   = allyKills - enemyKills;
  const killFactor = Math.tanh(killDiff / 10);
  factors.push({
    name: 'Kills',
    value: `${killDiff > 0 ? '+' : ''}${killDiff}`,
    impact: killDiff > 2 ? 'positive' : killDiff < -2 ? 'negative' : 'neutral',
  });

  // ── Dragon advantage ───────────────────────────────────────────────────────
  const drakeDiff   = objectives.dragon.allySoulCount - objectives.dragon.enemySoulCount;
  const drakeFactor = Math.tanh(drakeDiff / 3);
  factors.push({
    name: 'Dragons',
    value: `${objectives.dragon.allySoulCount} vs ${objectives.dragon.enemySoulCount}`,
    impact: drakeDiff > 0 ? 'positive' : drakeDiff < 0 ? 'negative' : 'neutral',
  });

  // ── Level advantage ────────────────────────────────────────────────────────
  const allyAvgLvl  = game.allies.reduce((s, p) => s + p.level, 0) / (game.allies.length || 1);
  const enemyAvgLvl = game.enemies.reduce((s, p) => s + p.level, 0) / (game.enemies.length || 1);
  const lvlDiff     = allyAvgLvl - enemyAvgLvl;
  const lvlFactor   = Math.tanh(lvlDiff / 3);
  factors.push({
    name: 'Levels',
    value: `${lvlDiff > 0 ? '+' : ''}${lvlDiff.toFixed(1)} avg`,
    impact: lvlDiff > 0.5 ? 'positive' : lvlDiff < -0.5 ? 'negative' : 'neutral',
  });

  // ── Turret advantage ───────────────────────────────────────────────────────
  const allyNames = new Set(game.allies.map((p) => p.summonerName.toLowerCase()));
  let allyTurrets = 0;
  let enemyTurrets = 0;
  for (const e of game.events) {
    if (e.EventName === 'TurretKilled' && e.KillerName) {
      if (allyNames.has(e.KillerName.toLowerCase())) allyTurrets++;
      else enemyTurrets++;
    }
  }
  const turretDiff   = allyTurrets - enemyTurrets;
  const turretFactor = Math.tanh(turretDiff / 4);
  if (allyTurrets + enemyTurrets > 0) {
    factors.push({
      name: 'Turrets',
      value: `${allyTurrets} vs ${enemyTurrets}`,
      impact: turretDiff > 0 ? 'positive' : turretDiff < 0 ? 'negative' : 'neutral',
    });
  }

  // ── Weighted score → probability ───────────────────────────────────────────
  const raw = goldFactor * 0.30 + killFactor * 0.20 + drakeFactor * 0.15 +
              lvlFactor * 0.15 + turretFactor * 0.20;
  const probability = Math.max(10, Math.min(90, Math.round(50 + raw * 40)));

  return { probability, factors };
}
