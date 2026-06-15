import { Link } from 'react-router-dom';
import { Brain, Camera, ScanLine, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MediScanHeroProps {
  compact?: boolean;
  onStartSkin?: () => void;
  activeStep?: 'discover' | 'analyze' | 'results';
}

const STEPS = [
  { id: 'discover', label: 'Choose scan' },
  { id: 'analyze', label: 'AI analysis' },
  { id: 'results', label: 'Your insights' },
] as const;

export function MediScanHero({ compact, onStartSkin, activeStep = 'discover' }: MediScanHeroProps) {
  return (
    <header
      className={cn(
        'relative overflow-hidden rounded-3xl mediscan-glass-strong',
        compact ? 'px-5 py-6' : 'px-6 py-10 sm:px-10 sm:py-12'
      )}
    >
      <div className="mediscan-orb mediscan-orb-1 -top-20 -left-16" aria-hidden />
      <div className="mediscan-orb mediscan-orb-2 top-0 right-0" aria-hidden />
      <div className="mediscan-orb mediscan-orb-3 bottom-0 left-1/3" aria-hidden />

      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-violet-500/30 to-cyan-500/30 border border-white/20 text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" />
            LifeCare+ Exclusive
          </span>
          <span className="text-xs text-white/50">Not available on basic telehealth apps</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <h1
              className={cn(
                'font-bold tracking-tight mediscan-text-gradient',
                compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl md:text-5xl'
              )}
            >
              MediScan AI Studio
            </h1>
            <p className={cn('text-white/70 mt-3', compact ? 'text-sm' : 'text-base sm:text-lg')}>
              AI-assisted screening for skin, chest X-ray, and retina images — patterns to discuss with
              your clinician. Not a diagnosis.
            </p>

            {!compact && (
              <div className="flex flex-wrap gap-4 mt-6">
                {[
                  { icon: Zap, label: 'Results in ~30 sec' },
                  { icon: Brain, label: 'Screening assistant' },
                  { icon: ScanLine, label: '3 scan modalities' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 text-sm text-white/80"
                  >
                    <item.icon className="h-4 w-4 text-cyan-400" />
                    {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {!compact && (
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              {onStartSkin ? (
                <Button
                  size="lg"
                  type="button"
                  className="gap-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white border-0 shadow-lg shadow-cyan-500/25 h-12 px-6"
                  onClick={onStartSkin}
                >
                  <Camera className="h-5 w-5" />
                  Start skin camera
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white border-0 shadow-lg shadow-cyan-500/25 h-12 px-6"
                  asChild
                >
                  <Link to="/dashboard/mediscan?mode=skin">
                    <Camera className="h-5 w-5" />
                    Start skin camera
                  </Link>
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                className="gap-2 h-12 border-white/25 text-white hover:bg-white/10 bg-transparent"
                asChild
              >
                <a href="#mediscan-scanner">Explore all scans</a>
              </Button>
            </div>
          )}
        </div>

        <nav
          className="flex gap-2 mt-8 overflow-x-auto pb-1"
          aria-label="MediScan progress"
        >
          {STEPS.map((step, i) => {
            const stepIndex = STEPS.findIndex((s) => s.id === activeStep);
            const done = i < stepIndex;
            const current = step.id === activeStep;
            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                  current && 'bg-white/15 text-white ring-1 ring-cyan-400/50',
                  done && 'text-cyan-300/90',
                  !current && !done && 'text-white/40'
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    current && 'bg-cyan-500 text-white',
                    done && 'bg-cyan-500/30 text-cyan-200',
                    !current && !done && 'bg-white/10'
                  )}
                >
                  {done ? '✓' : i + 1}
                </span>
                {step.label}
              </div>
            );
          })}
        </nav>
      </div>

      {!compact && (
        <div
          className="absolute inset-0 mediscan-shimmer pointer-events-none opacity-30 rounded-3xl"
          aria-hidden
        />
      )}
    </header>
  );
}
