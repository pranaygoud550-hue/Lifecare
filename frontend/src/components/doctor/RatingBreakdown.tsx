import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingBreakdownProps {
  breakdown: Record<number, number>;
  total: number;
  averageRating: number;
  className?: string;
}

export function RatingBreakdown({ breakdown, total, averageRating, className }: RatingBreakdownProps) {
  const stars = [5, 4, 3, 2, 1] as const;
  const maxCount = Math.max(...stars.map((s) => breakdown[s] || 0), 1);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-4xl font-bold text-foreground">{averageRating.toFixed(1)}</p>
          <div className="flex justify-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={cn(
                  'h-4 w-4',
                  i <= Math.round(averageRating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-border'
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted mt-1">{total} ratings</p>
        </div>

        <div className="flex-1 space-y-1.5">
          {stars.map((star) => {
            const count = breakdown[star] || 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-sm">
                <span className="w-8 text-muted text-right">{star} ★</span>
                <div className="flex-1 h-2.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-xs text-muted text-right">{Math.round(pct)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
