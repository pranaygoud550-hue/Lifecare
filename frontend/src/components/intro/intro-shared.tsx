import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export const INTRO_SLIDE_COUNT = 6;
export const INTRO_BG = '#0A0A0F';
export const INTRO_SURFACE = '#1A1A2E';

export function useReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function IntroBlobBg({ variant = 'default' }: { variant?: 'default' | 'glow' | 'cta' }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {variant === 'default' && (
        <>
          <div className="intro-blob intro-blob-a absolute -left-1/4 top-1/4 h-[420px] w-[420px] rounded-full bg-blue-600/20 blur-[100px]" />
          <div className="intro-blob intro-blob-b absolute -right-1/4 bottom-1/4 h-[380px] w-[380px] rounded-full bg-violet-600/15 blur-[100px]" />
        </>
      )}
      {variant === 'glow' && (
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 45%, rgba(0,102,255,0.18) 0%, transparent 55%)',
          }}
        />
      )}
      {variant === 'cta' && <div className="intro-cta-gradient absolute inset-0 opacity-80" />}
    </div>
  );
}

type IntroShellProps = {
  children: ReactNode;
  active: boolean;
  direction: 'forward' | 'back';
  className?: string;
};

export function IntroSlideShell({ children, active, direction, className }: IntroShellProps) {
  return (
    <div
      className={cn(
        'intro-slide absolute inset-0 flex flex-col items-center justify-center px-6 py-20 text-center',
        active ? 'intro-slide-active' : direction === 'forward' ? 'intro-slide-next' : 'intro-slide-prev',
        className
      )}
      aria-hidden={!active}
    >
      {children}
    </div>
  );
}

type NavProps = {
  slide: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  showNext?: boolean;
  showSkip?: boolean;
  showBackIcon?: boolean;
};

export function IntroNav({
  slide,
  onNext,
  onBack,
  onSkip,
  showNext = true,
  showSkip = true,
  showBackIcon = false,
}: NavProps) {
  const progress = ((slide + 1) / INTRO_SLIDE_COUNT) * 100;

  return (
    <>
      <div className="absolute left-0 right-0 top-0 z-20 h-1 bg-white/10">
        <div
          className="intro-progress h-full bg-gradient-to-r from-blue-500 to-violet-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {showBackIcon && slide > 0 && (
        <button
          type="button"
          onClick={onBack}
          className="absolute left-4 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {showSkip && slide < INTRO_SLIDE_COUNT - 1 && (
        <button
          type="button"
          onClick={onSkip}
          className="absolute bottom-6 left-6 z-20 text-xs text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
        >
          Skip intro
        </button>
      )}

      {showNext && slide < INTRO_SLIDE_COUNT - 1 && (
        <button
          type="button"
          onClick={onNext}
          className="intro-next-btn absolute bottom-6 right-6 z-20 rounded-full border border-white/30 px-5 py-2.5 text-sm font-medium text-white transition"
        >
          Next →
        </button>
      )}

      <p className="absolute bottom-7 left-1/2 z-20 -translate-x-1/2 text-xs text-white/35">
        {slide + 1} / {INTRO_SLIDE_COUNT}
      </p>
    </>
  );
}

export function IntroPill({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <span
      className="intro-pill inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-100"
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </span>
  );
}
