import { lazy, Suspense, type ReactNode } from 'react';
import { useIsClient } from '@/hooks/useIsClient';
import type { HospitalMapLocation, MapCoordinate } from '@/features/emergency/emergencySlice';

const LiveTrackingMap = lazy(() =>
  import('./LiveTrackingMap').then((module) => ({ default: module.LiveTrackingMap }))
);

export interface MapWrapperProps {
  patientLocation: MapCoordinate;
  ambulanceLocation?: MapCoordinate | null;
  hospitalLocation?: HospitalMapLocation | null;
  routePath?: [number, number][] | null;
  className?: string;
}

function MapFallback({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-red-950/80 border border-red-500/30 rounded-2xl ${className ?? 'h-72 w-full'}`}
    >
      <p className="text-sm text-red-200 animate-pulse">Loading live map…</p>
    </div>
  );
}

export function MapWrapper(props: MapWrapperProps) {
  const mounted = useIsClient();

  if (!mounted) {
    return <MapFallback className={props.className} />;
  }

  return (
    <Suspense fallback={<MapFallback className={props.className} />}>
      <LiveTrackingMap {...props} />
    </Suspense>
  );
}

export function ClientOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const mounted = useIsClient();
  if (!mounted) return fallback ?? null;
  return children;
}
