import { Smartphone, QrCode, Bell, FileText } from 'lucide-react';
export function AppDownloadSection() {
  return (
    <section className="py-16 md:py-20 bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
      <div className="container-custom">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-secondary font-semibold text-sm uppercase tracking-wider mb-2">Mobile app</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Download the LifeCare+ app
            </h2>
            <p className="text-slate-300 text-lg mb-8 max-w-md">
              Book doctors, track ambulances, order medicines, and manage prescriptions — all from your phone.
            </p>

            <ul className="space-y-4 mb-8">
              {[
                { icon: Bell, text: 'Appointment reminders & health alerts' },
                { icon: FileText, text: 'Digital prescriptions & health records' },
                { icon: QrCode, text: 'Quick check-in with QR at clinics' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-slate-200">
                  <Icon className="h-5 w-5 text-secondary shrink-0" />
                  <span className="text-sm">{text}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-3">
              <a
                href="#"
                aria-label="Download on App Store"
                className="inline-flex h-12 px-6 items-center bg-white text-foreground hover:bg-slate-100 rounded-xl transition-colors"
              >
                <span className="text-left">
                  <span className="block text-[10px] text-muted leading-none">Download on the</span>
                  <span className="block font-bold text-sm">App Store</span>
                </span>
              </a>
              <a
                href="#"
                aria-label="Get it on Google Play"
                className="inline-flex h-12 px-6 items-center bg-white text-foreground hover:bg-slate-100 rounded-xl transition-colors"
              >
                <span className="text-left">
                  <span className="block text-[10px] text-muted leading-none">Get it on</span>
                  <span className="block font-bold text-sm">Google Play</span>
                </span>
              </a>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-[280px] h-[560px] rounded-[3rem] border-8 border-slate-700 bg-slate-950 shadow-2xl overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-8 bg-slate-900 flex items-center justify-center">
                <div className="w-20 h-4 rounded-full bg-slate-800" />
              </div>
              <div className="pt-12 px-5 pb-5 h-full bg-gradient-to-b from-primary/20 to-slate-900 flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                  <Smartphone className="h-6 w-6 text-primary" />
                  <span className="font-bold">LifeCare+</span>
                </div>
                <div className="space-y-3 flex-1">
                  <div className="h-16 rounded-xl bg-white/10 backdrop-blur" />
                  <div className="h-24 rounded-xl bg-primary/30 border border-primary/40" />
                  <div className="h-16 rounded-xl bg-white/10" />
                  <div className="h-16 rounded-xl bg-secondary/20 border border-secondary/30" />
                </div>
                <p className="text-center text-xs text-slate-500 mt-4">Coming soon on iOS & Android</p>
              </div>
            </div>
            <div className="absolute -left-4 top-1/4 bg-card text-foreground rounded-xl shadow-lg p-3 text-xs font-medium hidden md:block">
              ⭐ 4.8 app rating
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
