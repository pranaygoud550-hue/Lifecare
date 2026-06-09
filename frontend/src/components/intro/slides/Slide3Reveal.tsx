import { useEffect, useState } from 'react';
import { LifeCareLogo } from '@/components/brand/LifeCareLogo';
import { IntroBlobBg, IntroPill, IntroSlideShell } from '../intro-shared';

const WORDS = ['Meet', 'LifeCare', '+'];
const PILLS = [
  { emoji: '🩺', label: 'Video Consults' },
  { emoji: '🚨', label: 'Emergency SOS' },
  { emoji: '💊', label: 'Pharmacy & Wallet' },
];

export function Slide3Reveal({ active }: { active: boolean }) {
  const [visibleWords, setVisibleWords] = useState(0);
  const [subVisible, setSubVisible] = useState(false);
  const [pillsVisible, setPillsVisible] = useState(0);

  useEffect(() => {
    if (!active) {
      setVisibleWords(0);
      setSubVisible(false);
      setPillsVisible(0);
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setVisibleWords(3);
      setSubVisible(true);
      setPillsVisible(3);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    WORDS.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleWords(i + 1), 200 + i * 280));
    });
    timers.push(setTimeout(() => setSubVisible(true), 1100));
    PILLS.forEach((_, i) => {
      timers.push(setTimeout(() => setPillsVisible(i + 1), 1400 + i * 200));
    });

    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <IntroSlideShell active={active} direction="forward" className="max-w-3xl">
      <IntroBlobBg variant="glow" />
      <div className={`mb-8 ${active ? 'intro-logo-pulse' : ''}`}>
        <LifeCareLogo size={96} showWordmark={false} idSuffix="-intro" />
      </div>
      <h2 className="flex flex-wrap items-center justify-center gap-3 text-4xl font-bold text-white sm:text-5xl md:text-6xl">
        {WORDS.map((word, i) => (
          <span
            key={word}
            className={`transition-all duration-500 ${i < visibleWords ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} ${word === 'LifeCare' ? 'bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent' : ''}`}
          >
            {word}
          </span>
        ))}
      </h2>
      <p
        className={`mt-6 max-w-xl text-lg text-white/65 transition-opacity duration-700 sm:text-xl ${subVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        One platform for teleconsultation, live emergency tracking,
        digital prescriptions, and pharmacy — built for real patients.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {PILLS.map((pill, i) => (
          <div key={pill.label} className={i < pillsVisible ? 'intro-pill-enter' : 'opacity-0'}>
            <IntroPill>
              <span>{pill.emoji}</span>
              {pill.label}
            </IntroPill>
          </div>
        ))}
      </div>
    </IntroSlideShell>
  );
}
