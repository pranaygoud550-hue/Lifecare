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

  const finish = useCallback(
    (path?: string) => {
      markOnboardingComplete();
      onDone();
      if (path) navigate(path);
    },
    [navigate, onDone]
  );

  const goTo = useCallback(
    (next: number, dir: 'next' | 'prev') => {
      if (next < 0 || next >= ONBOARDING_SLIDES.length) return;
      setDirection(dir);
      setIndex(next);
      setAnimKey((k) => k + 1);
    },
    []
  );

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

  const Icon = slide.icon;

  return (
    <div
      className={`lc-onboard fixed inset-0 z-[99] flex flex-col overflow-hidden bg-[#0a1628] bg-gradient-to-b ${slide.gradient}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Ambient glow */}
      <div
        key={`glow-${index}`}
        className="lc-onboard-glow pointer-events-none absolute left-1/2 top-[28%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
        style={{ background: slide.glow }}
        aria-hidden
      />

      {/* Story-style progress */}
      <div className="relative z-20 flex gap-1.5 px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        {ONBOARDING_SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            className="h-1 flex-1 overflow-hidden rounded-full bg-white/15"
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

      <button
        type="button"
        onClick={() => finish('/')}
        className="absolute right-4 top-[max(2.5rem,env(safe-area-inset-top))] z-20 rounded-full px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
      >
        Skip
      </button>

      {/* Slide content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-4 pt-6">
        <div
          key={`slide-${animKey}`}
          className={`lc-onboard-panel w-full max-w-lg text-center ${direction === 'next' ? 'lc-onboard-enter-next' : 'lc-onboard-enter-prev'}`}
        >
          <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
            {slide.eyebrow}
          </p>

          <div
            className="lc-onboard-icon-wrap relative mx-auto mb-10 flex h-44 w-44 items-center justify-center rounded-[2.5rem]"
            style={{
              background: `linear-gradient(145deg, ${slide.accent}22, transparent 60%)`,
              boxShadow: `0 0 80px ${slide.glow}`,
            }}
          >
            <div
              className="absolute inset-3 rounded-[2rem] border border-white/10"
              style={{ background: `${slide.accent}12` }}
            />
            <Icon
              className="lc-onboard-icon relative h-20 w-20"
              style={{ color: slide.accent }}
              strokeWidth={1.25}
            />
            <div
              className="absolute -bottom-2 h-1 w-16 rounded-full opacity-60"
              style={{ background: slide.accent }}
            />
          </div>

          <h1 className="text-[2.35rem] sm:text-[2.75rem] font-bold leading-[1.08] tracking-tight text-white">
            {slide.title}
            <br />
            <span style={{ color: slide.accent }}>{slide.highlight}</span>
          </h1>

          <p className="lc-onboard-desc mx-auto mt-5 max-w-md text-base sm:text-lg leading-relaxed text-white/65">
            {slide.description}
          </p>
        </div>
      </div>

      {/* Footer controls */}
      <div className="relative z-20 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        {isLast ? (
          <div className="mx-auto w-full max-w-md space-y-4 lc-onboard-footer-in">
            <Button
              className="w-full h-12 gap-2 text-base font-semibold shadow-lg"
              onClick={() => finish('/login')}
            >
              <LogIn className="h-5 w-5" />
              Get started — Log in
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 gap-2 text-base border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => finish('/register')}
            >
              <UserPlus className="h-5 w-5" />
              Create free account
            </Button>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
              <DemoLoginButtons compact dark />
            </div>
            <button
              type="button"
              onClick={() => finish('/')}
              className="flex w-full items-center justify-center gap-2 py-3 text-sm font-medium text-white/55 hover:text-white transition-colors"
            >
              <Compass className="h-4 w-4" />
              Explore without signing in
            </button>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-md items-center justify-between gap-4">
            <button
              type="button"
              onClick={prev}
              disabled={index === 0}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/80 disabled:opacity-30 hover:bg-white/10 transition-colors"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-sm text-white/50">
              {ONBOARDING_SLIDES.map((_, i) => (
                <span
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === index ? 'h-2 w-6 bg-white' : 'h-2 w-2 bg-white/25'
                  }`}
                />
              ))}
            </div>

            <Button
              type="button"
              size="lg"
              className="h-11 gap-2 rounded-full px-6 font-semibold shadow-lg"
              style={{ backgroundColor: slide.accent }}
              onClick={next}
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
