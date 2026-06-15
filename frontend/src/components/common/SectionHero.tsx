import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type SectionHeroProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  theme?: 'wellness' | 'appointments' | 'pharmacy' | 'home' | 'profile';
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

/** Bright, uplifting gradients — no dark themes */
const THEME_STYLES = {
  wellness: {
    wrapper: 'from-emerald-400 via-teal-400 to-cyan-400',
    orb1: 'bg-white/30 lc-orb-drift',
    orb2: 'bg-emerald-200/40 lc-orb-drift-reverse',
    icon: 'bg-white/30 text-white lc-wiggle',
    sparkle: 'text-emerald-100',
  },
  appointments: {
    wrapper: 'from-sky-400 via-blue-400 to-indigo-400',
    orb1: 'bg-white/30 lc-orb-drift',
    orb2: 'bg-sky-200/40 lc-orb-drift-reverse',
    icon: 'bg-white/30 text-white lc-wiggle',
    sparkle: 'text-sky-100',
  },
  pharmacy: {
    wrapper: 'from-blue-400 via-sky-400 to-cyan-400',
    orb1: 'bg-white/30 lc-orb-drift',
    orb2: 'bg-cyan-200/40 lc-orb-drift-reverse',
    icon: 'bg-white/30 text-white lc-wiggle',
    sparkle: 'text-blue-100',
  },
  home: {
    wrapper: 'from-emerald-400 via-teal-300 to-sky-400',
    orb1: 'bg-white/35 lc-orb-drift',
    orb2: 'bg-teal-200/45 lc-orb-drift-reverse',
    icon: 'bg-white/30 text-white lc-wiggle',
    sparkle: 'text-emerald-50',
  },
  profile: {
    wrapper: 'from-violet-400 via-purple-400 to-pink-400',
    orb1: 'bg-white/30 lc-orb-drift',
    orb2: 'bg-pink-200/40 lc-orb-drift-reverse',
    icon: 'bg-white/30 text-white lc-wiggle',
    sparkle: 'text-violet-100',
  },
};

export function SectionHero({
  icon: Icon,
  title,
  subtitle,
  theme = 'wellness',
  badge,
  action,
  className,
}: SectionHeroProps) {
  const styles = THEME_STYLES[theme];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br text-white shadow-lg lc-hero-enter',
        styles.wrapper,
        className
      )}
    >
      {/* Floating sparkle dots */}
      <span className={cn('absolute top-4 right-8 text-lg lc-sparkle opacity-80', styles.sparkle)} aria-hidden>
        ✦
      </span>
      <span
        className={cn('absolute top-12 right-20 text-sm lc-sparkle-delay opacity-60', styles.sparkle)}
        aria-hidden
      >
        ✦
      </span>
      <span className={cn('absolute bottom-6 right-16 text-xs lc-sparkle opacity-70', styles.sparkle)} aria-hidden>
        ✦
      </span>

      <div
        className={cn('absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl pointer-events-none', styles.orb1)}
        aria-hidden
      />
      <div
        className={cn('absolute -bottom-12 -left-12 h-40 w-40 rounded-full blur-3xl pointer-events-none', styles.orb2)}
        aria-hidden
      />
      <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={cn('p-3.5 rounded-2xl shrink-0 backdrop-blur-sm shadow-sm', styles.icon)}>
            <Icon className="h-7 w-7" strokeWidth={2} />
          </div>
          <div>
            {badge && <div className="mb-2 lc-fade-in-up">{badge}</div>}
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight lc-fade-in-up">{title}</h1>
            {subtitle && (
              <p className="text-sm sm:text-base text-white/90 mt-1.5 max-w-xl lc-fade-in-up-delay leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0 lc-fade-in-up-delay">{action}</div>}
      </div>
    </div>
  );
}
