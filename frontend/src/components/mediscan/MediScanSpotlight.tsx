import { Link } from 'react-router-dom';
import { ArrowRight, Camera, ScanLine, Sparkles } from 'lucide-react';
/** Featured dashboard card — MediScan as a flagship attraction */
export function MediScanSpotlight() {
  return (
    <Link
      to="/dashboard/mediscan"
      className="group relative block overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0c4a6e] p-6 sm:p-8 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 hover:-translate-y-0.5"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 group-hover:bg-cyan-400/30 transition-colors" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/25 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-lg mediscan-pulse-ring">
          <ScanLine className="h-8 w-8" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-400/20 text-cyan-200 border border-cyan-400/30">
              <Sparkles className="h-3 w-3" />
              Featured experience
            </span>
            <span className="text-[10px] font-semibold text-violet-200/80 uppercase">AI Studio</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            MediScan AI — your smart health scanner
          </h2>
          <p className="text-sm text-white/70 max-w-xl leading-relaxed">
            Unlike routine bookings or pharmacy orders, MediScan is an immersive AI lab: front-camera
            skin check with product tips, chest X-ray analysis, and eye screening — all in one place.
          </p>
          <div className="flex flex-wrap gap-3 mt-4 text-xs text-white/60">
            <span className="flex items-center gap-1">
              <Camera className="h-3.5 w-3.5 text-cyan-400" /> Skin camera
            </span>
            <span>·</span>
            <span>Instant AI results</span>
            <span>·</span>
            <span>Doctor sharing</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0" onClick={(e) => e.preventDefault()}>
          <span className="inline-flex items-center justify-center gap-2 rounded-lg bg-white text-violet-900 hover:bg-white/90 font-semibold shadow-md px-4 py-2.5 text-sm group-hover:gap-3 transition-all pointer-events-none">
            Enter MediScan
            <ArrowRight className="h-4 w-4" />
          </span>
          <Link
            to="/dashboard/mediscan?mode=skin"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center rounded-lg border border-white/30 text-white hover:bg-white/10 bg-transparent px-4 py-2 text-sm font-medium text-center"
          >
            Quick skin check
          </Link>
        </div>
      </div>
    </Link>
  );
}
