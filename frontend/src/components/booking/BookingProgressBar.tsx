import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookingProgressBarProps {
  steps: string[];
  currentStep: number;
}

export function BookingProgressBar({ steps, currentStep }: BookingProgressBarProps) {
  const progress = steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 0;

  return (
    <div className="mb-8">
      <div className="h-2 bg-border rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>

      <div className="flex justify-between gap-2">
        {steps.map((label, i) => (
          <div key={label} className="flex flex-col items-center flex-1 min-w-0">
            <div
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold shrink-0 transition-colors',
                i < currentStep && 'bg-primary text-white',
                i === currentStep && 'bg-primary text-white ring-4 ring-primary/20',
                i > currentStep && 'bg-border text-muted'
              )}
            >
              {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={cn(
                'mt-2 text-xs sm:text-sm text-center truncate w-full',
                i <= currentStep ? 'text-foreground font-medium' : 'text-muted'
              )}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
