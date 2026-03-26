// Champions that excel at split-pushing / 1v1 side lanes
export const SPLITPUSH_CHAMPS = new Set([
  'fiora', 'tryndamere', 'yorick', 'jax', 'camille',
  'darius', 'garen', 'nasus', 'illaoi', 'shen',
  'quinn', 'gangplank', 'shaco', 'jayce', 'renekton',
  'irelia', 'gwen', 'aatrox', 'riven', 'kled',
  'trundle', 'olaf', 'warwick',
]);

export function isSplitPusher(championName: string): boolean {
  return SPLITPUSH_CHAMPS.has(championName.toLowerCase().replace(/[\s'\-&.]/g, ''));
}
