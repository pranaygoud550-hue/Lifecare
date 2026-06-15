import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, LogIn, UserPlus, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DemoLoginButtons } from '@/components/landing/DemoLoginButtons';
import { ONBOARDING_SLIDE_MS, ONBOARDING_SLIDES } from './onboardingSlides';

const COMPLETE_KEY = 'lifecare-onboarding-complete';

export function markOnboardingComplete() {
  localStorage.setItem(COMPLETE_KEY, '1');
}

export function isOnboardingComplete() {
  return localStorage.getItem(COMPLETE_KEY) === '1';
}

/** @deprecated use isOnboardingComplete */
export function isWelcomeSkipped() {
  return isOnboardingComplete();
}

/** @deprecated use markOnboardingComplete */
export function markWelcomeSkipped() {
  markOnboardingComplete();
}

export function LifeCareOnboarding({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [animKey, setAnimKey] = useState(0);
  const touchStart = useRef<number | null>(null);
  const isLast = index === ONBOARDING_SLIDES.length - 1;
  const slide = ONBOARDING_SLIDES[index];
  const Icon = slide.icon;

  const finish = useCallback(
    (path?: string) => {
      markOnboardingComplete();
      onDone();
      if (path) navigate(path);
    },
    [navigate, onDone]
  );

  const goTo = useCallback((next: number, dir: 'next' | 'prev') => {
    if (next < 0 || next >= ONBOARDING_SLIDES.length) return;
    setDirection(dir);
    setIndex(next);
    setAnimKey((k) => k + 1);
  }, []);

  const next = useCallback(() => {
    if (isLast) return;
    goTo(index + 1, 'next');
  }, [goTo, index, isLast]);

  const prev = useCallback(() => {
    if (index === 0) return;
    goTo(index - 1, 'prev');
  }, [goTo, index]);

  useEffect(() => {
    if (isLast) return;
    const timer = setTimeout(next, ONBOARDING_SLIDE_MS);
    return () => clearTimeout(timer);
  }, [index, isLast, next]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStart.current;
    touchStart.current = null;
    if (dx < -48) next();
    else if (dx > 48) prev();
  };

  return (
    <div
      className={`lc-onboard lc-onboard-cinema fixed inset-0 z-[199] flex flex-col overflow-hidden bg-[#050a12] bg-gradient-to-b ${slide.gradient}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="dialog"
      aria-label="LifeCare+ introduction"
    >
      {/* Cinematic letterbox */}
      <div className="lc-onboard-letterbox-top pointer-events-none absolute inset-x-0 top-0 z-30 h-[env(safe-area-inset-top,0px)] min-h-0 bg-black/40 sm:h-3" />
      <div className="lc-onboard-letterbox-bottom pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[env(safe-area-inset-bottom,0px)] min-h-0 bg-black/40 sm:h-3" />

      {/* Animated mesh + vignette */}
      <div
        key={`mesh-${index}`}
        className="lc-onboard-ken-burns pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 35%, ${slide.glow}, transparent 70%)`,
        }}
        aria-hidden
      />
      <div className="lc-onboard-vignette pointer-events-none absolute inset-0" aria-hidden />
      <div
        key={`glow-${index}`}
        className="lc-onboard-glow pointer-events-none absolute left-1/2 top-[32%] h-[min(90vw,520px)] w-[min(90vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
        style={{ background: slide.glow }}
        aria-hidden
      />

      {/* Story progress */}
      <div className="relative z-40 flex gap-1.5 px-5 sm:px-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
        {ONBOARDING_SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            className="h-1 flex-1 overflow-hidden rounded-full bg-white/10"
            onClick={() => goTo(i, i > index ? 'next' : 'prev')}
          >
            <div
              className={`h-full rounded-full bg-white transition-all ${
                i < index ? 'w-full' : i === index ? 'lc-onboard-segment-active' : 'w-0'
              }`}
              style={
                i === index
                  ? { animationDuration: `${ONBOARDING_SLIDE_MS}ms`, backgroundColor: slide.accent }
                  : i < index
                    ? { backgroundColor: slide.accent }
                    : undefined
              }
            />
          </button>
        ))}
      </div>

      <div className="relative z-40 flex items-center justify-between px-5 sm:px-8 pt-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40">
          LifeCare+ · {slide.index} / 06
        </p>
        <button
          type="button"
          onClick={() => finish('/')}
          className="rounded-full px-4 py-2 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          Skip intro
        </button>
      </div>

      {/* Slide body */}
      <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-5 sm:px-10 pb-4 pt-4 min-h-0">
        <div
          key={`slide-${animKey}`}
          className={`lc-onboard-panel relative w-full max-w-4xl text-center ${direction === 'next' ? 'lc-onboard-enter-next' : 'lc-onboard-enter-prev'}`}
        >
          <p className="mb-4 sm:mb-6 text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
            {slide.eyebrow}
          </p>

          <p
            className="lc-onboard-watermark pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[55%] text-[8rem] sm:text-[12rem] font-black leading-none text-white/[0.03] select-none"
            aria-hidden
          >
            {slide.index}
          </p>

          <div
            className="lc-onboard-icon-wrap relative mx-auto mb-8 sm:mb-12 flex h-36 w-36 sm:h-52 sm:w-52 items-center justify-center rounded-[2.5rem] sm:rounded-[3rem]"
            style={{
              background: `linear-gradient(145deg, ${slide.accent}28, transparent 55%)`,
              boxShadow: `0 0 100px ${slide.glow}, inset 0 0 40px ${slide.accent}15`,
            }}
          >
            <div
              className="absolute inset-3 sm:inset-4 rounded-[2rem] sm:rounded-[2.5rem] border border-white/15"
              style={{ background: `${slide.accent}10` }}
            />
            <Icon
              className="lc-onboard-icon relative h-16 w-16 sm:h-28 sm:w-28"
              style={{ color: slide.accent }}
              strokeWidth={1.15}
            />
          </div>

          <h1 className="text-[2.5rem] sm:text-6xl md:text-7xl font-black leading-[1.05] tracking-tight text-white px-2">
            {slide.title}
            <br />
            <span
              className="lc-onboard-highlight bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, ${slide.accent}, #ffffff)`,
              }}
            >
              {slide.highlight}
            </span>
          </h1>

          <p className="mt-4 sm:mt-6 text-lg sm:text-2xl font-semibold text-white/85 px-2">
            {slide.tagline}
          </p>

          <p className="lc-onboard-desc mx-auto mt-4 sm:mt-6 max-w-2xl text-base sm:text-xl leading-relaxed text-white/60 px-2">
            {slide.description}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-40 px-5 sm:px-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        {isLast ? (
          <div className="mx-auto w-full max-w-lg space-y-3 sm:space-y-4 lc-onboard-footer-in">
            <p className="text-center text-sm text-white/50 mb-1">Try the demo — Patient or Doctor</p>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-md">
              <DemoLoginButtons compact dark />
            </div>
            <Button
              className="w-full h-12 sm:h-14 gap-2 text-base sm:text-lg font-semibold shadow-xl"
              onClick={() => finish('/login')}
            >
              <LogIn className="h-5 w-5" />
              Sign in with mobile OTP
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 gap-2 text-base border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => finish('/register')}
            >
              <UserPlus className="h-5 w-5" />
              Create free account
            </Button>
            <button
              type="button"
              onClick={() => finish('/')}
              className="flex w-full items-center justify-center gap-2 py-3 text-sm font-medium text-white/50 hover:text-white transition-colors"
            >
              <Compass className="h-4 w-4" />
              Browse without signing in
            </button>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4">
            <button
              type="button"
              onClick={prev}
              disabled={index === 0}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-white/80 disabled:opacity-30 hover:bg-white/10 transition-colors"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <p className="text-sm sm:text-base font-medium text-white/45 tabular-nums">
              {index + 1} of {ONBOARDING_SLIDES.length}
            </p>

            <Button
              type="button"
              size="lg"
              className="h-12 gap-2 rounded-full px-8 text-base font-bold shadow-lg"
              style={{ backgroundColor: slide.accent }}
              onClick={next}
            >
              Continue
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
