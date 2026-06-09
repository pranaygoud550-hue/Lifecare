import { LifeCareLogo } from '@/components/brand/LifeCareLogo';

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-[#e8f4fd] via-white to-[#e6faf5] overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          background:
            'radial-gradient(circle at 50% 35%, rgba(0,102,255,0.12) 0%, transparent 55%), radial-gradient(circle at 80% 80%, rgba(0,196,140,0.1) 0%, transparent 40%)',
        }}
      />

      <div className="relative mb-6 splash-logo-enter">
        <LifeCareLogo size={128} animated idSuffix="-splash" />
      </div>

      <h1 className="text-3xl font-bold splash-fade-in">
        LifeCare<span className="text-primary">+</span>
      </h1>
      <p className="text-muted mt-2 text-sm splash-fade-in-delay">
        Healthcare at your doorstep
      </p>

      <div className="mt-10 w-48 h-1 rounded-full bg-border overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full splash-progress-bar" />
      </div>
    </div>
  );
}
