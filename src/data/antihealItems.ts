// Items that apply Grievous Wounds (50% heal reduction)
// itemID → display name
export const GW_ITEMS: Record<number, string> = {
  3076: "Bramble Vest",
  3033: "Mortal Reminder",
  3123: "Executioner's Calling",
  3137: "Oblivion Orb",
  3165: "Morellonomicon",
  3410: "Chemtech Putrifier",
  3013: "Shurelya's Battlesong", // No — wrong
  3011: "Chempunk Chainsword",
  3079: "Thornmail",
};

// Recommended GW items by role/damage type
export const GW_RECOMMENDATIONS = {
  ad:       { name: "Mortal Reminder",      id: 3033, reason: "ADC anti-heal — also gives armor pen" },
  fighter:  { name: "Chempunk Chainsword",  id: 3011, reason: "Fighter anti-heal — gives lethality" },
  mage:     { name: "Morellonomicon",       id: 3165, reason: "Mage anti-heal — full AP item" },
  tank:     { name: "Thornmail",            id: 3079, reason: "Tank anti-heal — reflects damage + GW on hit" },
  support:  { name: "Chemtech Putrifier",   id: 3410, reason: "Support anti-heal — applies GW to enemies you damage" },
  early_ad: { name: "Executioner's Calling", id: 3123, reason: "Cheap early anti-heal (~800g)" },
  early_ap: { name: "Oblivion Orb",          id: 3137, reason: "Cheap early anti-heal for mages" },
};

export function playerHasGW(itemIds: number[]): boolean {
  return itemIds.some((id) => id in GW_ITEMS);
}
