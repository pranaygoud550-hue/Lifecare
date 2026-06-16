import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const LiveTransportMap = lazy(() =>
  import('./LiveTransportMap').then((m) => ({ default: m.LiveTransportMap }))
);

interface LiveTransportMapProps {
  patient: { lat: number; lng: number };
  driver?: { lat: number; lng: number } | null;
  className?: string;
}

function MapFallback({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-black/20 ${className ?? 'h-72 w-full'}`}
    >
      <Loader2 className="h-8 w-8 animate-spin text-white/70" aria-hidden />
      <span className="sr-only">Loading map</span>
    </div>
  );
}

export function LazyLiveTransportMap(props: LiveTransportMapProps) {
  return (
    <Suspense fallback={<MapFallback className={props.className} />}>
      <LiveTransportMap {...props} />
    </Suspense>
  );
}
