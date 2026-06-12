import { Zap, User, Stethoscope, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDemoAuth } from '@/hooks/useDemoAuth';
import { cn } from '@/lib/utils';

const ICONS = {
  patient: User,
  doctor: Stethoscope,
  admin: Shield,
} as const;

export function DemoLoginButtons({ compact }: { compact?: boolean }) {
  const { accounts, signInAsDemo, loadingPhone } = useDemoAuth();

  return (
    <div
      className={cn(
        'rounded-2xl border border-primary/20 bg-white/80 backdrop-blur-sm shadow-sm',
        compact ? 'p-4' : 'p-5'
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-amber-500" />
        <p className="text-sm font-semibold text-foreground">Try instantly — no signup</p>
      </div>
      <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'sm:grid-cols-3')}>
        {accounts.map((account) => {
          const Icon = ICONS[account.role];
          const loading = loadingPhone === account.phone;
          return (
            <Button
              key={account.phone}
              type="button"
              variant="outline"
              disabled={Boolean(loadingPhone)}
              className={cn(
                'h-auto py-3 px-4 flex flex-col items-start gap-1 text-left border-primary/25 hover:bg-primary/5 hover:border-primary/40',
                loading && 'opacity-70'
              )}
              onClick={() => void signInAsDemo(account.phone)}
            >
              <span className="flex items-center gap-2 font-semibold text-sm w-full">
                <Icon className="h-4 w-4 text-primary shrink-0" />
                Try as {account.label}
                {loading && <span className="ml-auto text-xs text-muted animate-pulse">…</span>}
              </span>
              <span className="text-xs text-muted font-normal leading-snug">{account.description}</span>
            </Button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted mt-3 text-center">
        One-click demo accounts for recruiters & judges — full app access
      </p>
    </div>
  );
}
