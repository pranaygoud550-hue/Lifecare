'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

const services = [
  { icon: '🚑', title: 'Emergency Ambulance', desc: 'Immediate dispatch with ALS/BLS units across Hyderabad.' },
  { icon: '🏥', title: 'Non-Emergency Transport', desc: 'Scheduled patient transfers between hospitals and home.' },
  { icon: '🧪', title: 'Diagnostic Pickup', desc: 'Lab sample collection with cold-chain vehicles.' },
];

export default function HomePage() {
  const [stats, setStats] = useState({ ambulancesAvailable: 0, averageResponseMinutes: 8, bookingsToday: 0 });

  useEffect(() => {
    api.getStats().then((r) => setStats(r.data)).catch(() => undefined);
    const t = setInterval(() => api.getStats().then((r) => setStats(r.data)).catch(() => undefined), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-red-900/30 bg-gradient-to-br from-slate-950 via-red-950/40 to-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-red-400">Hyderabad&apos;s fastest dispatch</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white md:text-6xl">
            Emergency Medical Transport — Anywhere in Hyderabad
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-300">
            Book an ambulance in 60 seconds. Track it live. Arrive safe.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/book" className="rounded-xl bg-red-600 px-8 py-4 font-semibold text-white shadow-lg shadow-red-900/40 hover:bg-red-500">
              Book Now
            </Link>
            <a href="tel:108" className="rounded-xl border border-slate-600 px-8 py-4 font-semibold text-white hover:bg-slate-900">
              Emergency: 108
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-800 bg-slate-900/50">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-6 sm:grid-cols-3">
          <Stat label="Ambulances available" value={String(stats.ambulancesAvailable)} live />
          <Stat label="Average response time" value={`${stats.averageResponseMinutes} mins`} />
          <Stat label="Bookings today" value={String(stats.bookingsToday)} live />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-2xl font-bold text-white">Our Services</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {services.map((s) => (
            <div key={s.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-red-800/50">
              <div className="text-4xl">{s.icon}</div>
              <h3 className="mt-4 text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-800 bg-slate-900/30 py-12 text-center">
        <p className="text-slate-400">Powered by RapidCare · Synced with LifeCare+</p>
      </section>
    </div>
  );
}

function Stat({ label, value, live }: { label: string; value: string; live?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-center">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">
        {value}
        {live && <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />}
      </p>
    </div>
  );
}
