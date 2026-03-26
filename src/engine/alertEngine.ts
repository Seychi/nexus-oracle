import type { NormalisedGame, Alert, AntihealStatus, ObjectiveStatus, ThreatEntry } from '../types';
import { formatTimer } from './objectiveTimer';

let alertId = 0;
function mkAlert(type: Alert['type'], category: Alert['category'], message: string): Alert {
  return { id: `a${alertId++}`, type, category, message, timestamp: Date.now() };
}

export function generateAlerts(
  game: NormalisedGame,
  antiheal: AntihealStatus,
  objectives: ObjectiveStatus,
  threats: ThreatEntry[],
): Alert[] {
  const alerts: Alert[] = [];
  const { gameTime } = game;

  // ── Anti-heal ──────────────────────────────────────────────────────────────
  if (antiheal.urgency === 'urgent' && !antiheal.selfHasGW)
    alerts.push(mkAlert('danger', 'antiheal',
      `⚠️ BUY ANTI-HEAL — enemy has ${antiheal.enemyHealers.join(', ')}. Suggest: ${antiheal.suggestedItem}`));
  else if (antiheal.urgency === 'recommended' && !antiheal.selfHasGW)
    alerts.push(mkAlert('warning', 'antiheal',
      `Consider anti-heal — ${antiheal.enemyHealers.join(', ')} are healing heavily`));

  // ── Objectives ────────────────────────────────────────────────────────────
  if (objectives.dragon.isAlive && gameTime >= 5 * 60 - 30)
    alerts.push(mkAlert('info', 'objective', '🐉 Dragon is ALIVE — contest or secure'));

  if (objectives.baron.isAlive && gameTime >= 20 * 60 - 60)
    alerts.push(mkAlert('danger', 'objective', '💀 Baron is ALIVE — group now'));

  if (!objectives.dragon.isAlive && objectives.dragon.nextSpawnTime) {
    const t = formatTimer(objectives.dragon.nextSpawnTime, gameTime);
    if (t !== 'UP NOW' && objectives.dragon.nextSpawnTime - gameTime < 90)
      alerts.push(mkAlert('warning', 'objective', `🐉 Dragon respawns in ${t} — prepare`));
  }

  if (!objectives.baron.isAlive && objectives.baron.nextSpawnTime) {
    const t = formatTimer(objectives.baron.nextSpawnTime, gameTime);
    if (t !== 'UP NOW' && objectives.baron.nextSpawnTime - gameTime < 90)
      alerts.push(mkAlert('warning', 'objective', `💀 Baron respawns in ${t} — prepare`));
  }

  if (objectives.herald.isAlive && gameTime >= 8 * 60)
    alerts.push(mkAlert('info', 'objective', '🔔 Rift Herald is ALIVE — take it for early towers'));

  // ── Extreme threats ───────────────────────────────────────────────────────
  const extremes = threats.filter((t) => t.priority === 'extreme');
  if (extremes.length > 0)
    alerts.push(mkAlert('danger', 'threat',
      `🎯 ${extremes[0].player.championName} is EXTREMELY fed (${extremes[0].player.kills}/${extremes[0].player.deaths}) — do not fight them alone`));

  // ── Dead enemies — window ────────────────────────────────────────────────
  const deadEnemies = game.enemies.filter((e) => e.isDead);
  if (deadEnemies.length >= 3)
    alerts.push(mkAlert('success', 'general',
      `⚡ ${deadEnemies.length} enemies dead — take objectives NOW`));
  else if (deadEnemies.length >= 2)
    alerts.push(mkAlert('info', 'general',
      `${deadEnemies.length} enemies dead — push an advantage`));

  // ── Power spike: completed item ───────────────────────────────────────────
  const spikedEnemy = threats.find((t) => t.player.items.length >= 3 && t.priority !== 'low');
  if (spikedEnemy)
    alerts.push(mkAlert('warning', 'item',
      `⚡ ${spikedEnemy.player.championName} has ${spikedEnemy.player.items.length} items — power spike reached`));

  return alerts.slice(0, 6); // cap displayed alerts
}
