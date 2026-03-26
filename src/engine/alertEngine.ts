import type { NormalisedGame, Alert, AntihealStatus, ObjectiveStatus, ThreatEntry, Player } from '../types';
import { formatTimer } from './objectiveTimer';

let alertId = 0;
function mkAlert(type: Alert['type'], category: Alert['category'], message: string): Alert {
  return { id: `a${alertId++}`, type, category, message, timestamp: Date.now() };
}

const LEVEL_SPIKES = [6, 9, 11, 16] as const;
const SPIKE_LABELS: Record<number, string> = {
  6: 'ult unlocked', 9: 'maxed basics', 11: 'ult lvl 2', 16: 'ult lvl 3 — max power',
};

export function generateAlerts(
  game: NormalisedGame,
  antiheal: AntihealStatus,
  objectives: ObjectiveStatus,
  threats: ThreatEntry[],
  prevEnemies: Player[] | null,
): Alert[] {
  const alerts: Alert[] = [];
  const { gameTime } = game;

  // ── Level spikes ────────────────────────────────────────────────────────────
  if (prevEnemies) {
    for (const enemy of game.enemies) {
      const prev = prevEnemies.find((p) => p.summonerName === enemy.summonerName);
      if (!prev) continue;
      for (const lvl of LEVEL_SPIKES) {
        if (prev.level < lvl && enemy.level >= lvl) {
          alerts.push(mkAlert('warning', 'spike',
            `⚡ ${enemy.championName} hit Lv.${lvl} — ${SPIKE_LABELS[lvl]}`));
        }
      }
    }
  }

  // ── Item completions (frame-to-frame delta) ─────────────────────────────────
  if (prevEnemies) {
    for (const enemy of game.enemies) {
      const prev = prevEnemies.find((p) => p.summonerName === enemy.summonerName);
      if (!prev) continue;
      const newItems = enemy.items.filter(
        (item) => !prev.items.some((pi) => pi.id === item.id),
      );
      for (const item of newItems) {
        alerts.push(mkAlert('warning', 'item',
          `🛒 ${enemy.championName} completed ${item.name}`));
      }
    }
  }

  // ── Dragon soul ─────────────────────────────────────────────────────────────
  const { dragon } = objectives;
  if (dragon.enemyAtSoul && dragon.isAlive)
    alerts.push(mkAlert('danger', 'objective',
      `🐉 SOUL POINT — enemy at ${dragon.enemySoulCount} drakes (${dragon.enemySoulType ?? 'mixed'}). MUST contest!`));
  else if (dragon.allySoulType && dragon.allySoulCount >= 3 && dragon.isAlive)
    alerts.push(mkAlert('success', 'objective',
      `🐉 Soul point — secure ${dragon.allySoulType} soul!`));

  // ── Anti-heal ───────────────────────────────────────────────────────────────
  if (antiheal.urgency === 'urgent' && !antiheal.selfHasGW)
    alerts.push(mkAlert('danger', 'antiheal',
      `⚠️ BUY ANTI-HEAL — enemy has ${antiheal.enemyHealers.join(', ')}. Suggest: ${antiheal.suggestedItem}`));
  else if (antiheal.urgency === 'recommended' && !antiheal.selfHasGW)
    alerts.push(mkAlert('warning', 'antiheal',
      `Consider anti-heal — ${antiheal.enemyHealers.join(', ')} are healing heavily`));

  // ── Objectives ──────────────────────────────────────────────────────────────
  if (objectives.dragon.isAlive && gameTime >= 5 * 60 - 30 && !dragon.enemyAtSoul)
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

  // ── Extreme threats ─────────────────────────────────────────────────────────
  const extremes = threats.filter((t) => t.priority === 'extreme');
  if (extremes.length > 0)
    alerts.push(mkAlert('danger', 'threat',
      `🎯 ${extremes[0].player.championName} is EXTREMELY fed (${extremes[0].player.kills}/${extremes[0].player.deaths}) — do not fight them alone`));

  // ── Multi-kills / streaks ───────────────────────────────────────────────────
  const recentMultis = game.events
    .filter((e) => e.EventName === 'Multikill' && e.EventTime > gameTime - 15);
  for (const m of recentMultis) {
    const streak = m.KillStreak ?? 2;
    const label = streak >= 5 ? 'PENTAKILL' : streak === 4 ? 'QUADRA KILL'
      : streak === 3 ? 'TRIPLE KILL' : 'DOUBLE KILL';
    const isAlly = game.allies.some((p) =>
      p.summonerName === m.KillerName || p.championName === m.KillerName);
    if (isAlly) {
      alerts.push(mkAlert('success', 'general', `🔥 ${m.KillerName} — ${label}!`));
    } else {
      alerts.push(mkAlert('danger', 'threat', `💀 Enemy ${m.KillerName} — ${label}! Play safe.`));
    }
  }

  // ── Dead enemies — window ───────────────────────────────────────────────────
  const deadEnemies = game.enemies.filter((e) => e.isDead);
  if (deadEnemies.length >= 3)
    alerts.push(mkAlert('success', 'general',
      `⚡ ${deadEnemies.length} enemies dead — take objectives NOW`));
  else if (deadEnemies.length >= 2)
    alerts.push(mkAlert('info', 'general',
      `${deadEnemies.length} enemies dead — push an advantage`));

  return alerts.slice(0, 10);
}
