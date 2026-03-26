import type { NormalisedGame } from '../types';

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function fmtPlayer(p: NormalisedGame['allies'][0]) {
  const kda = `${p.kills}/${p.deaths}/${p.assists}`;
  const spells = p.summonerSpells.join('/');
  const items = p.items.map((i) => i.name).join(', ') || 'no items';
  return `  • ${p.championName}(Lv.${p.level})${p.isSelf ? ' ←YOU' : ''} ${kda} KDA ${p.cs}CS [${spells}] | ${p.keystone}/${p.secondaryTree} | ${items}`;
}

export function buildPrompt(game: NormalisedGame): string {
  const ss = game.selfStats;
  const statsBlock = `AD:${ss.ad} AP:${ss.ap} Armor:${ss.armor} MR:${ss.mr} AH:${ss.abilityHaste} Crit:${ss.crit}% AS:${ss.attackSpeed} Lethality:${ss.lethality} MagPen:${ss.magicPen}`;
  const abilitiesBlock = game.selfAbilities.map((a) => `${a.key}(${a.name})Lv${a.level}`).join(' ');

  return `You are a high-elo League of Legends coach. Game: ${game.gameMode} ${fmt(game.gameTime)}, gold: ${game.gold}g

YOUR STATS: ${statsBlock}
YOUR ABILITIES: ${abilitiesBlock}

ALLIES:
${game.allies.map(fmtPlayer).join('\n')}

ENEMIES:
${game.enemies.map(fmtPlayer).join('\n')}

Give sharp, high-elo advice in these sections (bullets only, no fluff):

### 🎯 Focus Target
Exact target and burst order.

### ⚠️ Watch Out For
Specific threats to you personally based on your stats vs their damage.

### ⚔️ Win Condition
How your comp wins vs theirs right now.

### 🛒 Next Item
The single best item for you to buy next and exactly why.

### 📍 Do This Now
One concrete macro action for the next 60 seconds.`;
}
