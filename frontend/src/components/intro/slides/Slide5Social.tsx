import { useEffect, useState } from 'react';
import { IntroSlideShell } from '../intro-shared';

const STATS = [
  { label: 'Demo Patients', value: 500, suffix: '+' },
  { label: 'Consult Types', value: 4, suffix: '' },
  { label: 'Specialties', value: 12, suffix: '+' },
  { label: 'AI MediScan', value: 1, suffix: '', text: 'Powered' },
];

function useCountUp(target: number, active: boolean, duration = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) {
      setCount(0);
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setCount(target);
      return;
    }

    const start = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setCount(Math.round(eased * target));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target, duration]);

  return count;
}

function StatCard({
  label,
  value,
  suffix,
  text,
  active,
}: {
  label: string;
  value: number;
  suffix: string;
  text?: string;
  active: boolean;
}) {
  const count = useCountUp(value, active);
  return (
    <div className="rounded-2xl border border-white/10 bg-[#1A1A2E] px-4 py-5">
      <p className="text-2xl font-bold text-white sm:text-3xl">
        {text ? (
          <span>{text}</span>
        ) : (
          <>
            {count}
            {suffix}
          </>
        )}
      </p>
      <p className="mt-1 text-xs text-white/50 sm:text-sm">{label}</p>
    </div>
  );
}

export function Slide5Social({ active }: { active: boolean }) {
  return (
    <IntroSlideShell active={active} direction="forward" className="max-w-3xl">
      <h2 className="mb-8 text-3xl font-bold text-white sm:text-4xl">Built for demos that impress.</h2>
      <div className="mb-10 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((s) => (
          <StatCard key={s.label} {...s} active={active} />
        ))}
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-2">
        <blockquote className="rounded-xl border-l-4 border-blue-500 bg-white/5 p-4 text-left italic text-white/70">
          &ldquo;Booked Dr. Kavitha, paid from wallet, and joined a video consult in under two minutes.
          Perfect for our college health-tech demo.&rdquo;
          <footer className="mt-3 text-xs not-italic text-white/45">— Demo Patient, LifeCare+</footer>
        </blockquote>
        <blockquote className="rounded-xl border-l-4 border-violet-500 bg-white/5 p-4 text-left italic text-white/70">
          &ldquo;The SOS flow with live ambulance tracking and OTP verification felt production-ready
          — recruiters loved it.&rdquo;
          <footer className="mt-3 text-xs not-italic text-white/45">— Campus hackathon judge</footer>
        </blockquote>
      </div>
    </IntroSlideShell>
  );
}
