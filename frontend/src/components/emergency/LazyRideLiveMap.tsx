import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import type { RideLiveMapProps } from './RideLiveMap';

const RideLiveMap = lazy(() =>
  import('./RideLiveMap').then((m) => ({ default: m.RideLiveMap }))
);

function MapFallback({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 ${className ?? 'h-56 w-full'}`}
    >
      <Loader2 className="h-8 w-8 animate-spin text-white/70" aria-hidden />
      <span className="sr-only">Loading map</span>
    </div>
  );
}

export function LazyRideLiveMap(props: RideLiveMapProps) {
  return (
    <Suspense fallback={<MapFallback className={props.className} />}>
      <RideLiveMap {...props} />
    </Suspense>
  );
}

export { openRideInMaps } from './RideLiveMap';
