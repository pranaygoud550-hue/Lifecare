import { lazy, Suspense } from 'react';

const EmergencyActiveView = lazy(() =>
  import('./EmergencyActiveView').then((m) => ({ default: m.EmergencyActiveView }))
);

export function LazyEmergencyActiveView() {
  return (
    <Suspense fallback={null}>
      <EmergencyActiveView />
    </Suspense>
  );
}
