const hospitals = [
  'Apollo Hospital, Jubilee Hills',
  'Yashoda Hospital, Somajiguda',
  'KIMS Hospital, Secunderabad',
  'Care Hospital, Banjara Hills',
  'Continental Hospital, Gachibowli',
];

const steps = [
  { n: 1, title: 'Book in 60 seconds', desc: 'Choose service type, enter patient details, and confirm pickup.' },
  { n: 2, title: 'Nearest driver dispatched', desc: 'ALS/BLS units matched by distance and vehicle type.' },
  { n: 3, title: 'Live tracking', desc: 'Share link with family. Call driver directly from tracking page.' },
  { n: 4, title: 'Hospital handover', desc: 'OTP verified pickup. Trip synced to LifeCare+ medical history.' },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="rounded-2xl border border-red-900/50 bg-red-950/30 p-6 text-center">
        <p className="text-sm uppercase tracking-widest text-red-400">24/7 Emergency</p>
        <a href="tel:108" className="mt-2 block text-4xl font-bold text-white hover:text-red-300">
          108
        </a>
        <p className="mt-2 text-slate-400">National emergency · RapidCare dispatch: 040-1234-5678</p>
      </div>

      <h1 className="mt-12 text-3xl font-bold text-white">How RapidCare Works</h1>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {steps.map((s) => (
          <div key={s.n} className="rounded-xl border border-slate-800 p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-sm font-bold">{s.n}</span>
            <h3 className="mt-3 font-semibold text-white">{s.title}</h3>
            <p className="mt-1 text-sm text-slate-400">{s.desc}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-2xl font-bold text-white">Partner Hospitals</h2>
      <ul className="mt-4 space-y-2">
        {hospitals.map((h) => (
          <li key={h} className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 text-slate-300">
            🏥 {h}
          </li>
        ))}
      </ul>

      <h2 className="mt-12 text-2xl font-bold text-white">Contact</h2>
      <p className="mt-4 text-slate-400">
        Email: dispatch@rapidcare.app · Hyderabad, Telangana
      </p>
    </div>
  );
}
