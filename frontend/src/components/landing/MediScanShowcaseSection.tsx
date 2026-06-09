import { Link } from 'react-router-dom';
import { Brain, Camera, Scan, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MediScanShowcaseSection() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden bg-[#070b14] text-white">
      <div className="mediscan-orb mediscan-orb-1 top-10 left-[10%]" />
      <div className="mediscan-orb mediscan-orb-2 top-20 right-[15%]" />

      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-violet-500/20 border border-violet-400/30 text-violet-200 mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Only on LifeCare+
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mediscan-text-gradient leading-tight mb-4">
              MediScan AI Studio
            </h2>
            <p className="text-lg text-white/70 mb-8 leading-relaxed">
              Go beyond appointments and pharmacy. Our flagship AI imaging experience analyzes your
              skin, chest, and eyes with cinematic visuals, live camera capture, and personalized care
              recommendations.
            </p>
            <ul className="space-y-4 mb-10">
              {[
                {
                  icon: Camera,
                  title: 'Live skin camera',
                  desc: 'Front-camera scan for pimples, pigmentation & OTC care tips',
                },
                {
                  icon: Scan,
                  title: 'Medical-grade uploads',
                  desc: 'Chest X-ray & retina with heatmaps and confidence scores',
                },
                {
                  icon: Brain,
                  title: 'Doctor-ready',
                  desc: 'Share results, book specialists, link to appointments',
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15">
                    <item.icon className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-white/60">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 border-0 text-white"
                asChild
              >
                <Link to="/register">Get started — try MediScan</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/25 text-white hover:bg-white/10 bg-transparent"
                asChild
              >
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="aspect-[4/5] max-h-[480px] rounded-3xl mediscan-glass-strong p-6 relative overflow-hidden">
              <div
                className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mediscan-scan-line shadow-[0_0_12px_rgba(34,211,238,0.8)]"
                aria-hidden
              />
              <div className="h-full flex flex-col justify-between">
                <div>
                  <p className="text-xs text-cyan-300/80 font-mono uppercase tracking-widest mb-2">
                    AI Analysis Live
                  </p>
                  <p className="text-2xl font-bold text-white">Skin Check</p>
                  <p className="text-sm text-white/50 mt-1">Confidence 87%</p>
                </div>
                <div className="space-y-3">
                  {['Acne mapping', 'Pigmentation', 'Care routine'].map((label, i) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                          style={{ width: `${92 - i * 12}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/70 w-24">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
                  <p className="text-sm text-white/80">Your personal AI health scanner</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
