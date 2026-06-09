import { cn } from '@/lib/utils';

interface ConfidenceRingProps {
  value: number;
  size?: number;
  className?: string;
}

export function ConfidenceRing({ value, size = 120, className }: ConfidenceRingProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const color =
    clamped >= 75 ? 'stroke-green-500' : clamped >= 50 ? 'stroke-amber-500' : 'stroke-red-500';

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-all duration-700', color)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{clamped.toFixed(0)}%</span>
        <span className="text-xs text-muted">confidence</span>
      </div>
    </div>
  );
}
