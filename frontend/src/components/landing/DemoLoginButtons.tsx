import { Zap, User, Stethoscope, Shield, Truck, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDemoAuth } from '@/hooks/useDemoAuth';
import { cn } from '@/lib/utils';

const ICONS = {
  patient: User,
  doctor: Stethoscope,
  admin: Shield,
  ambulance: Truck,
  pharmacy: Pill,
} as const;

export function DemoLoginButtons({ compact, dark }: { compact?: boolean; dark?: boolean }) {
  const { accounts, signInAsDemo, loadingPhone } = useDemoAuth();

  return (
    <div
      className={cn(
        'rounded-2xl border shadow-sm',
        dark
          ? 'border-white/15 bg-white/5 backdrop-blur-sm p-3'
          : 'border-primary/20 bg-white/80 backdrop-blur-sm p-4 sm:p-5',
        !dark && compact && 'p-4'
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-amber-500" />
        <p className={cn('text-sm font-semibold', dark ? 'text-white/90' : 'text-foreground')}>
          Try instantly — no signup
        </p>
      </div>
      <div className={cn('grid gap-2', compact ? 'grid-cols-1 sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3')}>
        {accounts.map((account) => {
          const Icon = ICONS[account.role as keyof typeof ICONS] ?? User;
          const loading = loadingPhone === account.phone;
          return (
            <Button
              key={account.phone}
              type="button"
              variant="outline"
              disabled={Boolean(loadingPhone)}
              className={cn(
                'h-auto py-3 px-4 flex flex-col items-start gap-1 text-left',
                dark
                  ? 'border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30'
                  : 'border-primary/25 hover:bg-primary/5 hover:border-primary/40',
                loading && 'opacity-70'
              )}
              onClick={() => void signInAsDemo(account.phone)}
            >
              <span className="flex items-center gap-2 font-semibold text-sm w-full">
                <Icon className={cn('h-4 w-4 shrink-0', dark ? 'text-[#5DCAA5]' : 'text-primary')} />
                Try as {account.label}
                {loading && (
                  <span className={cn('ml-auto text-xs animate-pulse', dark ? 'text-white/50' : 'text-muted')}>
                    …
                  </span>
                )}
              </span>
              <span
                className={cn(
                  'text-xs font-normal leading-snug',
                  dark ? 'text-white/55' : 'text-muted'
                )}
              >
                {account.description}
              </span>
            </Button>
          );
        })}
      </div>
      <p className={cn('text-[11px] mt-3 text-center', dark ? 'text-white/40' : 'text-muted')}>
        One-click demo accounts for recruiters & judges — full app access
      </p>
    </div>
  );
}
