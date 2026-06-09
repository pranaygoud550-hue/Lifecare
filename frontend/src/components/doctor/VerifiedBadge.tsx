import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  verified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

/** Twitter-style blue verification checkmark */
export function VerifiedBadge({ verified, size = 'md', showLabel = false, className }: VerifiedBadgeProps) {
  if (!verified) return null;

  return (
    <span
      className={cn('inline-flex items-center gap-0.5 shrink-0', className)}
      title="Verified doctor"
    >
      <BadgeCheck
        className={cn(sizeMap[size], 'text-[#1D9BF0] fill-[#1D9BF0]/15 stroke-[2]')}
        aria-label="Verified"
      />
      {showLabel && (
        <span className="text-xs font-medium text-[#1D9BF0]">Verified</span>
      )}
    </span>
  );
}
