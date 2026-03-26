import type { Player, ChampClass } from '../types';
import { getChampClass } from '../data/championClasses';

export interface TeamfightAdvice {
  roleAdvice: string;
  positioning: string;
  engageRead: string;
}

function selfRole(cls: ChampClass): TeamfightAdvice {
  switch (cls) {
    case 'Marksman': return {
      roleAdvice: 'Stay in the backline. Auto the closest target safely — don\'t overextend for the perfect target.',
      positioning: 'Hug the side wall. Position behind your frontline. Keep max auto range.',
      engageRead: 'If they have hard engage, pre-position behind a wall. Flash away from CC chains.',
    };
    case 'Mage': return {
      roleAdvice: 'Land your AoE CC first. Combo the highest-priority target. Save your safety ability.',
      positioning: 'Stay near your frontline. Use your range to poke before the fight.',
      engageRead: 'If they engage on you, use mobility/defensive (Zhonya\'s, flash) and let your team follow up.',
    };
    case 'Assassin': return {
      roleAdvice: 'Wait for your tank to engage and CC to land, THEN jump on the isolated carry.',
      positioning: 'Flank from the side. Never engage first — wait for the front line.',
      engageRead: 'If they engage on your team, clean up stragglers. Your job is the backline.',
    };
    case 'Tank': return {
      roleAdvice: 'Engage when your team is ready and cooldowns are up. Peel for your carries if you can\'t engage.',
      positioning: 'Front of your team. Body block skillshots. Zone enemies off your ADC.',
      engageRead: 'If they have better engage, play defensive and counter-engage on their frontline.',
    };
    case 'Fighter': return {
      roleAdvice: 'Find the bruiser or fed carry on their team. You out-duel most champions in extended fights.',
      positioning: 'Flank or go with your frontline. Stay in melee range of priority targets.',
      engageRead: 'If you get CC\'d, use your defensive item (Sterak\'s, Maw) and fight back. Don\'t run.',
    };
    case 'Enchanter': return {
      roleAdvice: 'Stay behind your ADC. Peel assassins and engagers. Keep shields/heals for when carries are in danger.',
      positioning: 'As far back as possible. Hug your ADC\'s hip pocket.',
      engageRead: 'If they gap-close on you, use any CC you have (Janna Q, Lulu W) and flash away.',
    };
    case 'Support': return {
      roleAdvice: 'Roam and set up picks when laning is over. Engage when odds are in your favour.',
      positioning: 'Sit between your frontline and backline. Protect whoever is getting dove.',
      engageRead: 'Vision control is king. Track the enemy jungler and call out flanks.',
    };
    default: return {
      roleAdvice: 'Stay grouped with your team. Focus the squishiest enemy.',
      positioning: 'Don\'t get caught alone. Stick to your team in the mid-game.',
      engageRead: 'React to your team\'s engage. Don\'t initiate unless you have a clear advantage.',
    };
  }
}

export function getTeamfightAdvice(self: Player): TeamfightAdvice {
  const cls = getChampClass(self.championName);
  return selfRole(cls);
}
