import { Link } from 'react-router-dom';
import { Lock, Star, Building2 } from 'lucide-react';
import { DemoLoginButtons } from '@/components/landing/DemoLoginButtons';

const STATS = [
  { value: '98%', label: 'Patient satisfaction' },
  { value: '< 10 min', label: 'Average wait time' },
  { value: '24/7', label: 'Doctor availability' },
  { value: '500+', label: 'Hospitals network' },
] as const;

const DOCTORS = [
  { initials: 'AS', color: 'bg-teal-600' },
  { initials: 'RK', color: 'bg-emerald-500' },
  { initials: 'PM', color: 'bg-cyan-600' },
] as const;

const TRUST = [
  { icon: Lock, text: 'HIPAA compliant' },
  { icon: Star, text: '4.9/5 from 12,000 reviews' },
  { icon: Building2, text: '500+ partner hospitals' },
] as const;

export function HeroSection() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-white">
      <div className="pointer-events-none absolute -right-32 top-0 h-[480px] w-[480px] rounded-full bg-[#E1F5EE]/60 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-[320px] w-[320px] rounded-full bg-[#E1F5EE]/40 blur-3xl" aria-hidden />

      <div className="container-custom relative flex min-h-[100svh] items-center py-16 lg:py-20">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[3fr_2fr] lg:gap-16">
          {/* Left — 60% */}
          <div className="max-w-2xl">
            <span className="lc-hero-fade-up inline-flex items-center gap-2 rounded-full border border-[#1D9E75]/25 bg-[#E1F5EE] px-4 py-1.5 text-sm font-medium text-[#1D9E75]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#1D9E75]" aria-hidden />
              Trusted by 50,000+ patients
            </span>

            <h1
              className="lc-hero-fade-up mt-6 text-[2.75rem] font-medium leading-[1.12] tracking-tight text-[#0f172a] sm:text-5xl lg:text-[3rem]"
              style={{ animationDelay: '80ms' }}
            >
              Healthcare that comes to you
            </h1>

            <p
              className="lc-hero-fade-up mt-5 max-w-xl text-lg leading-relaxed text-[#64748b]"
              style={{ animationDelay: '160ms' }}
            >
              Book appointments, consult doctors, manage prescriptions and health records — all in one
              secure place.
            </p>

            <div
              className="lc-hero-fade-up mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
              style={{ animationDelay: '240ms' }}
            >
              <Link
                to="/doctors"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#1D9E75] px-8 text-base font-semibold text-white shadow-lg shadow-[#1D9E75]/25 transition hover:bg-[#188a66] hover:shadow-[#1D9E75]/35"
              >
                Book appointment
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-12 items-center justify-center rounded-xl border-2 border-[#e2e8f0] bg-white px-8 text-base font-semibold text-[#0f172a] transition hover:border-[#1D9E75]/40 hover:bg-[#E1F5EE]/50"
              >
                Learn how it works
              </a>
            </div>

            <ul
              className="lc-hero-fade-up mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2"
              style={{ animationDelay: '320ms' }}
            >
              {TRUST.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2 text-sm text-[#64748b]">
                  <Icon className="h-4 w-4 shrink-0 text-[#1D9E75]" aria-hidden />
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            <div className="lc-hero-fade-up mt-8" style={{ animationDelay: '400ms' }}>
              <DemoLoginButtons />
            </div>
          </div>

          {/* Right — 40% */}
          <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            <div className="lc-hero-float-card rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.12)] sm:p-8">
              <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-[#64748b]">
                Live platform metrics
              </p>
              <div className="grid grid-cols-2 gap-5">
                {STATS.map((stat, i) => (
                  <div
                    key={stat.label}
                    className="lc-hero-fade-up"
                    style={{ animationDelay: `${400 + i * 70}ms` }}
                  >
                    <p className="text-2xl font-bold text-[#0f172a] sm:text-3xl">{stat.value}</p>
                    <p className="mt-1 text-sm text-[#64748b]">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="lc-hero-fade-up mt-6 flex items-center gap-3"
              style={{ animationDelay: '680ms' }}
            >
              <div className="flex -space-x-3">
                {DOCTORS.map((d) => (
                  <span
                    key={d.initials}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-md ${d.color}`}
                  >
                    {d.initials}
                  </span>
                ))}
              </div>
              <p className="text-sm font-medium text-[#0f172a]">
                Our doctors are <span className="text-[#1D9E75]">online now</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
