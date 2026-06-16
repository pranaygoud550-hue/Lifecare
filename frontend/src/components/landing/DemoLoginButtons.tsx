import { Zap, User, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDemoAuth } from '@/hooks/useDemoAuth';
import { cn } from '@/lib/utils';

const ICONS = {
  patient: User,
  doctor: Stethoscope,
} as const;

export function DemoLoginButtons({ compact, dark }: { compact?: boolean; dark?: boolean }) {
  const { accounts, signInAsDemo, loadingPhone } = useDemoAuth();

  return (
    <div
      className={cn(
        'rounded-2xl',
        dark ? 'p-3' : 'border border-primary/20 bg-white/80 backdrop-blur-sm shadow-sm p-4 sm:p-5',
        !dark && compact && 'p-4'
      )}
    >
      {!dark && (
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-amber-500" />
          <p className="text-sm font-semibold text-foreground">Try instantly — no signup</p>
        </div>
      )}
      <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
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
                'h-auto min-h-[4.5rem] py-4 px-4 flex flex-col items-start gap-1.5 text-left w-full min-w-0 overflow-hidden',
                dark
                  ? 'border-white/20 bg-white/8 text-white hover:bg-white/15 hover:border-white/35'
                  : 'border-primary/25 hover:bg-primary/5 hover:border-primary/40',
                loading && 'opacity-70'
              )}
              onClick={() => void signInAsDemo(account.phone)}
            >
              <span className="flex items-center gap-2 font-bold text-sm sm:text-base w-full min-w-0">
                <Icon className={cn('h-5 w-5 shrink-0', dark ? 'text-[#5DCAA5]' : 'text-primary')} />
                <span className="truncate">Demo as {account.label}</span>
                {loading && (
                  <span className={cn('ml-auto text-xs animate-pulse shrink-0', dark ? 'text-white/50' : 'text-muted')}>
                    …
                  </span>
                )}
              </span>
              <span
                className={cn(
                  'text-xs sm:text-sm font-normal leading-snug w-full break-words line-clamp-2',
                  dark ? 'text-white/60' : 'text-muted'
                )}
              >
                {account.description}
              </span>
            </Button>
          );
        })}
      </div>
      <p className={cn('text-[11px] sm:text-xs mt-3 text-center', dark ? 'text-white/40' : 'text-muted')}>
        Patient & doctor demos — full app access for interviews
      </p>
    </div>
  );
}
