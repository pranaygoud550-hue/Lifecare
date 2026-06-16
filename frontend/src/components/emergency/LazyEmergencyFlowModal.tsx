import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const EmergencyFlowModal = lazy(() =>
  import('./EmergencyFlowModal').then((m) => ({ default: m.EmergencyFlowModal }))
);

export function LazyEmergencyFlowModal() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-red-900/95">
          <Loader2 className="h-12 w-12 animate-spin text-white" aria-hidden />
        </div>
      }
    >
      <EmergencyFlowModal />
    </Suspense>
  );
}
