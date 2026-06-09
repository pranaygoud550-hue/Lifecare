import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { isIntroSeen, markIntroSeen } from '@/hooks/useIntroSeen';
import { INTRO_BG, INTRO_SLIDE_COUNT, IntroNav } from './intro-shared';
import { Slide1Problem } from './slides/Slide1Problem';
import { Slide2People } from './slides/Slide2People';
import { Slide3Reveal } from './slides/Slide3Reveal';
import { Slide4Features } from './slides/Slide4Features';
import { Slide5Social } from './slides/Slide5Social';
import { Slide6CTA } from './slides/Slide6CTA';
import './intro.css';

type Props = {
  children: ReactNode;
};

export function IntroExperience({ children }: Props) {
  const [showIntro, setShowIntro] = useState(() => !isIntroSeen());
  const [mounted, setMounted] = useState(false);
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const completeIntro = useCallback(() => {
    markIntroSeen();
    setShowIntro(false);
  }, []);

  const goNext = useCallback(() => {
    setSlide((s) => Math.min(s + 1, INTRO_SLIDE_COUNT - 1));
  }, []);

  const goBack = useCallback(() => {
    setSlide((s) => Math.max(s - 1, 0));
  }, []);

  const skipIntro = useCallback(() => {
    completeIntro();
  }, [completeIntro]);

  useEffect(() => {
    if (!showIntro) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && slide < INTRO_SLIDE_COUNT - 1) {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' && slide > 0) {
        e.preventDefault();
        goBack();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        skipIntro();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showIntro, slide, goNext, goBack, skipIntro]);

  if (!showIntro) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        className={`intro-root fixed inset-0 z-[200] overflow-hidden text-white transition-opacity duration-600 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        style={{ backgroundColor: INTRO_BG }}
        role="dialog"
        aria-modal="true"
        aria-label="LifeCare+ introduction"
      >
        <div className="relative h-full w-full">
          <Slide1Problem active={slide === 0} />
          <Slide2People active={slide === 1} />
          <Slide3Reveal active={slide === 2} />
          <Slide4Features active={slide === 3} />
          <Slide5Social active={slide === 4} />
          <Slide6CTA active={slide === 5} onComplete={completeIntro} onBack={goBack} />
        </div>

        <IntroNav
          slide={slide}
          onNext={goNext}
          onBack={goBack}
          onSkip={skipIntro}
          showNext={slide < INTRO_SLIDE_COUNT - 1}
          showSkip={slide < INTRO_SLIDE_COUNT - 1}
          showBackIcon={slide > 0 && slide < INTRO_SLIDE_COUNT - 1}
        />
      </div>
      <div className="hidden" aria-hidden>
        {children}
      </div>
    </>
  );
}
