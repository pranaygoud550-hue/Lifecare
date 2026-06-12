import { useEffect, useState } from 'react';

const BRAND = 'LifeCare';
const STATS = [
  { value: '500+', label: 'Hospitals' },
  { value: '50K+', label: 'Patients' },
  { value: '24/7', label: 'Care' },
] as const;

export interface SplashScreenProps {
  onComplete?: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), 3800);
    const doneTimer = setTimeout(() => onComplete?.(), 4200);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`lc-splash fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-[#0a1628] ${exiting ? 'lc-splash-exit' : ''}`}
      role="presentation"
      aria-hidden={exiting}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(29,158,117,0.18) 0%, transparent 55%), radial-gradient(circle at 20% 80%, rgba(29,158,117,0.08) 0%, transparent 40%)',
        }}
      />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center px-6">
        {/* Heart + cross — 0.3s */}
        <div className="lc-splash-heart mb-3">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden>
            <rect x="24" y="8" width="8" height="40" rx="2" fill="#1D9E75" opacity="0.9" />
            <rect x="8" y="24" width="40" height="8" rx="2" fill="#1D9E75" />
            <path
              d="M28 44c-8-6-14-11-14-18a7 7 0 0114-3 7 7 0 0114 3c0 7-6 12-14 18z"
              fill="none"
              stroke="#5DCAA5"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.6"
            />
          </svg>
        </div>

        {/* ECG line — 0.8s */}
        <svg
          className="lc-splash-ecg mb-8 w-full max-w-md"
          viewBox="0 0 400 48"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            className="lc-splash-ecg-path"
            d="M0 24 H40 L48 24 L52 8 L56 40 L60 24 L68 24 L76 24 L80 12 L84 36 L88 24 L120 24 H160 L168 24 L172 6 L176 42 L180 24 L220 24 H280 L288 24 L292 10 L296 38 L300 24 L340 24 H400"
            stroke="#1D9E75"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>

        {/* LifeCare letters — 1.4s */}
        <h1 className="flex text-[52px] font-bold leading-none tracking-tight text-white">
          {BRAND.split('').map((letter, i) => (
            <span
              key={`${letter}-${i}`}
              className="lc-splash-letter inline-block"
              style={{ animationDelay: `${1400 + i * 80}ms` }}
            >
              {letter}
            </span>
          ))}
          <span
            className="lc-splash-letter inline-block text-[#1D9E75]"
            style={{ animationDelay: `${1400 + BRAND.length * 80}ms` }}
          >
            +
          </span>
        </h1>

        {/* Tagline — 1.9s */}
        <p className="lc-splash-tagline mt-4 text-center text-base font-medium text-[#5DCAA5]">
          Your health. Our priority.
        </p>

        {/* Micro stats — 2.3s */}
        <div className="lc-splash-stats mt-8 flex w-full max-w-sm items-center justify-center gap-0 text-center">
          {STATS.map((stat, i) => (
            <div key={stat.label} className="flex flex-1 items-center justify-center">
              {i > 0 && <span className="mr-4 h-6 w-px bg-[#1e3a5f]" aria-hidden />}
              <div className={i > 0 ? 'ml-4' : ''}>
                <p className="text-sm font-bold text-white">{stat.value}</p>
                <p className="text-[11px] text-[#94a3b8]">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar — 2.8s */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#1e3a5f]/60">
        <div className="lc-splash-progress h-full bg-[#1D9E75]" />
      </div>
    </div>
  );
}

export default SplashScreen;
