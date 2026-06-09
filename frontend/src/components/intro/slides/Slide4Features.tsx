import { IntroSlideShell } from '../intro-shared';

const FEATURES = [
  {
    icon: '📹',
    title: 'Video Consultations',
    body: 'Book a doctor, pay from your wallet, join a WebRTC room — all in one flow.',
    delay: 0,
  },
  {
    icon: '🚑',
    title: 'Live Emergency SOS',
    body: 'One tap dispatches the nearest ambulance with real-time GPS tracking and OTP pickup.',
    delay: 150,
  },
  {
    icon: '🛒',
    title: 'Pharmacy & Health Vault',
    body: 'Order medicines, store records securely, and track prescriptions from your doctor.',
    delay: 300,
  },
];

export function Slide4Features({ active }: { active: boolean }) {
  return (
    <IntroSlideShell active={active} direction="forward" className="max-w-4xl">
      <h2 className="mb-10 text-3xl font-bold text-white sm:text-4xl">
        Everything your care journey needs.
        <br />
        <span className="text-white/75">Nothing you don&apos;t.</span>
      </h2>
      <div className="grid w-full gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <article
            key={f.title}
            className={`intro-feature-card rounded-2xl border border-blue-500/20 bg-[#1A1A2E] p-5 text-left transition hover:-translate-y-1 hover:border-blue-400/40 ${active ? 'intro-card-rise' : 'opacity-0'}`}
            style={{ animationDelay: `${f.delay}ms` }}
          >
            <span className="text-3xl" role="img" aria-hidden>
              {f.icon}
            </span>
            <h3 className="mt-3 text-base font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/55">{f.body}</p>
          </article>
        ))}
      </div>
    </IntroSlideShell>
  );
}
