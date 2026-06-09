import { IntroBlobBg, IntroSlideShell } from '../intro-shared';

const CARDS = [
  { initial: 'D', name: 'Dr. Sharma', tag: 'Cardiology', anim: 'intro-card-a' },
  { initial: 'A', name: 'Ambulance', tag: 'SOS dispatch', anim: 'intro-card-b' },
  { initial: 'P', name: 'Pharmacy', tag: 'Medicines', anim: 'intro-card-c' },
];

export function Slide2People({ active }: { active: boolean }) {
  return (
    <IntroSlideShell active={active} direction="forward" className="max-w-3xl">
      <IntroBlobBg />
      <div className="relative mb-10 h-40 w-full max-w-md">
        {CARDS.map((card) => (
          <div
            key={card.name}
            className={`absolute left-1/2 top-1/2 w-36 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#1A1A2E] p-4 shadow-xl ${active ? card.anim : 'opacity-0'}`}
          >
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-sm font-bold text-white">
              {card.initial}
            </div>
            <p className="text-sm font-semibold text-white">{card.name}</p>
            <p className="text-xs text-blue-300/80">{card.tag}</p>
          </div>
        ))}
      </div>
      <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
        When care is fragmented,
        <br />
        <span className="text-white/90">patients pay the price.</span>
      </h2>
      <p className="mt-6 max-w-lg text-base leading-relaxed text-white/55 sm:text-lg">
        You need a doctor now — but booking takes forever.
        <br />
        An emergency hits — but help feels far away.
        <br />
        A prescription arrives — but the pharmacy is another app.
      </p>
    </IntroSlideShell>
  );
}
