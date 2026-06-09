import { cn } from '@/lib/utils';

type LifeCareLogoProps = {
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  className?: string;
  animated?: boolean;
  idSuffix?: string;
};

/**
 * LifeCare+ brand mark — shield-cross with pulse line and "+" accent.
 * Uses unique gradient IDs per instance so multiple logos can render on one page.
 */
export function LifeCareLogo({
  size = 112,
  showWordmark = false,
  wordmarkClassName,
  className,
  animated = false,
  idSuffix = '',
}: LifeCareLogoProps) {
  const gradId = `lc-logo-grad${idSuffix}`;
  const glowId = `lc-logo-glow${idSuffix}`;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        role="img"
        aria-label="LifeCare+ logo"
        className={cn(animated && 'splash-logo-mark')}
      >
        <defs>
          <linearGradient id={gradId} x1="18" y1="12" x2="102" y2="108" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0066FF" />
            <stop offset="1" stopColor="#00C48C" />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0066FF" floodOpacity="0.25" />
          </filter>
        </defs>

        <rect
          x="8"
          y="8"
          width="104"
          height="104"
          rx="28"
          fill={`url(#${gradId})`}
          filter={`url(#${glowId})`}
        />

        {/* Medical cross */}
        <path d="M60 34v52" stroke="#fff" strokeWidth="11" strokeLinecap="round" />
        <path d="M38 60h44" stroke="#fff" strokeWidth="11" strokeLinecap="round" />

        {/* Vitals pulse — signature mark */}
        <path
          d="M34 60h8l4-8 4 14 4-18 4 12h20"
          stroke="#B8FFE8"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animated ? 'splash-logo-pulse' : undefined}
        />

        {/* "+" accent for LifeCare+ */}
        <circle cx="88" cy="32" r="7" fill="#fff" />
        <path d="M88 28v8M84 32h8" stroke="#0066FF" strokeWidth="2.2" strokeLinecap="round" />
      </svg>

      {showWordmark && (
        <p className={cn('mt-3 text-3xl font-bold tracking-tight', wordmarkClassName)}>
          LifeCare<span className="text-primary">+</span>
        </p>
      )}
    </div>
  );
}
