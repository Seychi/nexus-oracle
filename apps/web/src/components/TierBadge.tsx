interface TierBadgeProps {
  tier: string;
  className?: string;
}

const TIER_STYLES: Record<string, string> = {
  'S+': 'bg-tier-s-plus/20 text-tier-s-plus border-tier-s-plus/40',
  S: 'bg-tier-s/20 text-tier-s border-tier-s/40',
  A: 'bg-tier-a/20 text-tier-a border-tier-a/40',
  B: 'bg-tier-b/20 text-tier-b border-tier-b/40',
  C: 'bg-tier-c/20 text-tier-c border-tier-c/40',
};

export default function TierBadge({ tier, className }: TierBadgeProps) {
  const normalized = tier?.toUpperCase().trim() ?? 'C';
  const style = TIER_STYLES[normalized] ?? TIER_STYLES['C'];

  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs
                  font-bold border ${style} ${className ?? ''}`}
    >
      {normalized}
    </span>
  );
}
