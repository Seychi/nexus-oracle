import React from 'react';
import { useStore } from '../../store/gameStore';
import { formatTimer } from '../../engine/objectiveTimer';

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function ObjectiveCard({
  name, icon, alive, nextSpawn, gameTime, killCount, extra,
}: {
  name: string; icon: string; alive: boolean;
  nextSpawn: number | null; gameTime: number;
  killCount?: number; extra?: string;
}) {
  const spawnLabel = alive ? 'ALIVE'
    : nextSpawn ? formatTimer(nextSpawn, gameTime)
    : 'Not available';
  const isAlive  = alive;
  const isUrgent = !alive && nextSpawn && nextSpawn - gameTime < 90;

  return (
    <div className={`flex items-center justify-between p-2 rounded border
      ${isAlive    ? 'bg-lol-green/10 border-lol-green/40' :
        isUrgent   ? 'bg-lol-orange/10 border-lol-orange/40' :
                     'bg-lol-card border-white/[0.07]'}`}>
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <div>
          <div className="text-[10px] font-bold text-lol-text">{name}</div>
          {extra && <div className="text-[8px] text-lol-dim">{extra}</div>}
          {killCount !== undefined && killCount > 0 && (
            <div className="text-[8px] text-lol-dim">{killCount} killed</div>
          )}
        </div>
      </div>
      <span className={`text-[10px] font-bold
        ${isAlive ? 'text-lol-green' : isUrgent ? 'text-lol-orange' : 'text-lol-dim'}`}>
        {spawnLabel}
      </span>
    </div>
  );
}

const DRAKE_ICONS: Record<string, string> = {
  Fire: '🔥', Infernal: '🔥', Water: '💧', Ocean: '💧',
  Air: '🌪', Cloud: '🌪', Earth: '🪨', Mountain: '🪨',
  Hextech: '⚡', Chemtech: '☠', Elder: '✨',
};

function DragonSoulCard() {
  const { analysis } = useStore();
  if (!analysis) return null;
  const { dragon } = analysis.objectives;
  if (dragon.allySoulCount + dragon.enemySoulCount === 0) return null;

  const drakeIcon = (type: string) => DRAKE_ICONS[type] ?? '🐉';

  return (
    <div className={`rounded p-2 border ${dragon.enemyAtSoul
      ? 'bg-lol-enemy/10 border-lol-enemy/40'
      : 'bg-lol-card border-white/[0.07]'}`}>
      <div className="text-[9px] font-bold text-lol-gold uppercase tracking-widest mb-2">Dragon Soul</div>

      {/* Ally */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] text-lol-ally font-medium">Your Team</span>
        <div className="flex items-center gap-1">
          {dragon.allyDrakeTypes.map((t, i) => (
            <span key={i} className="text-xs" title={t}>{drakeIcon(t)}</span>
          ))}
          {Array.from({ length: Math.max(0, 4 - dragon.allySoulCount) }).map((_, i) => (
            <div key={`ae${i}`} className="w-3 h-3 rounded-full bg-white/10" />
          ))}
          {dragon.allySoulType && (
            <span className="text-[8px] text-lol-ally ml-1 font-bold">{dragon.allySoulType}</span>
          )}
        </div>
      </div>

      {/* Enemy */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-lol-enemy font-medium">Enemy Team</span>
        <div className="flex items-center gap-1">
          {dragon.enemyDrakeTypes.map((t, i) => (
            <span key={i} className="text-xs" title={t}>{drakeIcon(t)}</span>
          ))}
          {Array.from({ length: Math.max(0, 4 - dragon.enemySoulCount) }).map((_, i) => (
            <div key={`ee${i}`} className="w-3 h-3 rounded-full bg-white/10" />
          ))}
          {dragon.enemySoulType && (
            <span className="text-[8px] text-lol-enemy ml-1 font-bold">{dragon.enemySoulType}</span>
          )}
        </div>
      </div>

      {dragon.enemyAtSoul && (
        <div className="mt-1.5 text-[9px] text-lol-enemy font-bold animate-pulse">
          ENEMY AT SOUL POINT — MUST CONTEST!
        </div>
      )}
    </div>
  );
}

function GamePhaseCard() {
  const { analysis, game } = useStore();
  if (!analysis || !game) return null;
  const phase = analysis.gamePhase;
  const advice = phase === 'early'
    ? 'Focus on CS, trade when you have level/item advantage, and establish vision control.'
    : phase === 'mid'
    ? 'Rotate to objectives, group for Dragon/Baron, and set up vision around objectives.'
    : 'Group for teamfights, push advantages after Baron/Dragon, and close the game out.';

  const phaseColors = { early: 'text-lol-green', mid: 'text-lol-gold', late: 'text-lol-enemy' };

  return (
    <div className="bg-lol-card border border-white/[0.07] rounded p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-lol-dim uppercase tracking-widest">Game Phase</span>
        <span className={`text-[11px] font-bold uppercase ${phaseColors[phase]}`}>{phase}</span>
      </div>
      <p className="text-[10px] text-lol-text leading-relaxed">{advice}</p>
      <div className="text-[8px] text-lol-dim mt-1">Game time: {fmt(game.gameTime)}</div>
    </div>
  );
}

function SplitPushCard() {
  const { analysis } = useStore();
  if (!analysis?.splitPushAdvice) return null;
  return (
    <div className="bg-lol-card border border-lol-purple/30 rounded p-2">
      <div className="text-[9px] font-bold text-lol-purple uppercase tracking-widest mb-1">Split Push</div>
      <p className="text-[10px] text-lol-text leading-relaxed">{analysis.splitPushAdvice}</p>
    </div>
  );
}

function BuffTimers() {
  const { analysis } = useStore();
  if (!analysis) return null;
  const { buffs } = analysis;
  if (!buffs.baronBuff && !buffs.elderBuff) return null;

  return (
    <div className="flex flex-col gap-1">
      {buffs.baronBuff && (
        <div className="bg-lol-purple/15 border border-lol-purple/40 rounded p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">👑</span>
            <div>
              <div className="text-[10px] font-bold text-lol-purple">Baron Buff Active</div>
              <div className="text-[8px] text-lol-dim">Push lanes, siege turrets</div>
            </div>
          </div>
          <span className="text-[12px] font-bold text-lol-purple tabular-nums">
            {Math.floor(buffs.baronBuff.remaining / 60)}:{String(Math.floor(buffs.baronBuff.remaining % 60)).padStart(2, '0')}
          </span>
        </div>
      )}
      {buffs.elderBuff && (
        <div className="bg-lol-gold/15 border border-lol-gold/40 rounded p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">✨</span>
            <div>
              <div className="text-[10px] font-bold text-lol-gold">Elder Dragon Active</div>
              <div className="text-[8px] text-lol-dim">Execute enemies below threshold — fight NOW</div>
            </div>
          </div>
          <span className="text-[12px] font-bold text-lol-gold tabular-nums">
            {Math.floor(buffs.elderBuff.remaining / 60)}:{String(Math.floor(buffs.elderBuff.remaining % 60)).padStart(2, '0')}
          </span>
        </div>
      )}
    </div>
  );
}

function DeadEnemiesBar() {
  const { game } = useStore();
  if (!game) return null;
  const dead = game.enemies.filter((e) => e.isDead);
  if (!dead.length) return null;

  return (
    <div className="bg-lol-green/10 border border-lol-green/30 rounded p-2">
      <div className="text-[9px] font-bold text-lol-green uppercase tracking-widest mb-1">
        {dead.length} Enemies Dead — Take Objectives!
      </div>
      <div className="flex gap-1 flex-wrap">
        {dead.map((e) => (
          <span key={e.summonerName} className="text-[9px] bg-lol-green/10 border border-lol-green/30 text-lol-green px-1.5 py-0.5 rounded-full">
            {e.championName} ({Math.ceil(e.respawnTimer)}s)
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MacroTab() {
  const { analysis, game } = useStore();
  if (!analysis || !game) return null;
  const { objectives } = analysis;
  const t = game.gameTime;

  return (
    <div className="flex flex-col gap-2 p-2 overflow-y-auto">
      <BuffTimers />
      <DeadEnemiesBar />
      <GamePhaseCard />

      <div>
        <div className="text-[9px] font-bold text-lol-gold uppercase tracking-widest mb-1.5">Objectives</div>
        <div className="flex flex-col gap-1.5">
          <ObjectiveCard
            name="Dragon" icon="🐉"
            alive={objectives.dragon.isAlive}
            nextSpawn={objectives.dragon.nextSpawnTime}
            gameTime={t}
            killCount={objectives.dragon.killCount}
            extra={objectives.dragon.types.slice(-1)[0] ?? undefined}
          />
          <ObjectiveCard
            name="Baron Nashor" icon="💀"
            alive={objectives.baron.isAlive}
            nextSpawn={objectives.baron.nextSpawnTime}
            gameTime={t}
            killCount={objectives.baron.killCount}
          />
          <ObjectiveCard
            name="Rift Herald" icon="🔔"
            alive={objectives.herald.isAlive}
            nextSpawn={objectives.herald.nextSpawnTime}
            gameTime={t}
          />
        </div>
      </div>

      <DragonSoulCard />
      <SplitPushCard />
    </div>
  );
}
