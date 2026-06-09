import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const HospitalNearbyMap = lazy(() =>
  import('./HospitalNearbyMap').then((m) => ({ default: m.HospitalNearbyMap }))
);

export function LazyHospitalNearbyMap({ compact }: { compact?: boolean }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-muted/20">
          <Loader2 className="h-6 w-6 animate-spin text-muted" aria-hidden />
          <span className="sr-only">Loading hospital map</span>
        </div>
      }
    >
      <HospitalNearbyMap compact={compact} />
    </Suspense>
  );
}
