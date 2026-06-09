import { useEffect, useState } from 'react';
import { IntroBlobBg, IntroSlideShell } from '../intro-shared';

const LINE1 = 'Most healthcare apps';
const LINE2 = "don't talk to each other.";

export function Slide1Problem({ active }: { active: boolean }) {
  const [labelVisible, setLabelVisible] = useState(false);
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [bodyVisible, setBodyVisible] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setLabelVisible(false);
      setLine1('');
      setLine2('');
      setBodyVisible(false);
      setHintVisible(false);
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setLabelVisible(true);
      setLine1(LINE1);
      setLine2(LINE2);
      setBodyVisible(true);
      setHintVisible(true);
      return;
    }

    const t0 = setTimeout(() => setLabelVisible(true), 300);
    let i = 0;
    const type1 = setInterval(() => {
      i += 1;
      setLine1(LINE1.slice(0, i));
      if (i >= LINE1.length) clearInterval(type1);
    }, 45);

    const t1 = setTimeout(() => {
      let j = 0;
      const type2 = setInterval(() => {
        j += 1;
        setLine2(LINE2.slice(0, j));
        if (j >= LINE2.length) clearInterval(type2);
      }, 40);
    }, 1000);

    const t2 = setTimeout(() => setBodyVisible(true), 2200);
    const t3 = setTimeout(() => setHintVisible(true), 2800);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [active]);

  return (
    <IntroSlideShell active={active} direction="forward" className="max-w-2xl">
      <IntroBlobBg />
      <p
        className={`mb-6 text-sm uppercase tracking-[0.2em] text-blue-300/80 transition-opacity duration-700 ${labelVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        Every patient deserves one connected journey…
      </p>
      <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
        <span className="block min-h-[1.2em]">{line1}</span>
        <span className="block min-h-[1.2em] bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
          {line2}
        </span>
      </h2>
      <p
        className={`mt-8 max-w-lg text-base leading-relaxed text-white/60 transition-opacity duration-700 sm:text-lg ${bodyVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        Book a doctor in one app. Call an ambulance in another. Buy medicines somewhere else.
        <br />
        Your records? Scattered. Your time? Wasted.
      </p>
      <div
        className={`mt-12 text-white/40 transition-opacity duration-700 ${hintVisible ? 'opacity-100 intro-bounce' : 'opacity-0'}`}
        aria-hidden
      >
        ↓
      </div>
    </IntroSlideShell>
  );
}
