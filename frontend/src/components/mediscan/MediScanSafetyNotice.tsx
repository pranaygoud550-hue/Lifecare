import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_TEXT =
  'MediScan is an AI screening assistant only — not a medical diagnosis. Results help you discuss concerns with a licensed clinician. In an emergency, call 108 or visit the nearest hospital.';

export function MediScanSafetyNotice({
  className,
  compact,
  dark,
}: {
  className?: string;
  compact?: boolean;
  dark?: boolean;
}) {
  return (
    <div
      role="note"
      className={cn(
        'flex gap-3 rounded-xl border text-sm leading-relaxed',
        compact ? 'p-3' : 'p-4',
        dark
          ? 'border-amber-400/30 bg-amber-500/10 text-amber-50'
          : 'border-amber-200 bg-amber-50 text-amber-950',
        className
      )}
    >
      <AlertTriangle
        className={cn('shrink-0', compact ? 'h-4 w-4 mt-0.5' : 'h-5 w-5', dark ? 'text-amber-300' : 'text-amber-600')}
        aria-hidden
      />
      <p>{DEFAULT_TEXT}</p>
    </div>
  );
}
