import { ShieldCheck, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  level: number;
  className?: string;
  showLabel?: boolean;
}

const TIERS = [
  { label: 'Starter', icon: null, color: '' },
  {
    label: 'Silver',
    icon: ShieldCheck,
    color: 'text-tradealo-primary',
    tooltip: 'Identidad verificada',
  },
  {
    label: 'Gold',
    icon: ShieldCheck,
    color: 'text-amber-500',
    tooltip: 'Usuario Gold',
  },
] as const;

export function TierBadge({ level, className, showLabel }: Props) {
  const tier = TIERS[level] ?? TIERS[0];
  if (!tier.icon) return null;

  return (
    <span
      className={cn('inline-flex items-center gap-1', className)}
      title={tier.tooltip}
      aria-label={tier.tooltip}
    >
      <tier.icon size={15} className={tier.color} />
      {level >= 2 && <Star size={10} className="text-amber-500 fill-amber-500" />}
      {showLabel && (
        <span className="text-xs font-medium text-tradealo-text-muted">
          {tier.label}
        </span>
      )}
    </span>
  );
}
