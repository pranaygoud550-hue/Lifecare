import { lazy, Suspense, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import {
  closeEmergency,
  dismissEmergencyModal,
  setGuest,
  skipGuest,
} from '@/features/emergency/emergencySlice';
import { cn } from '@/lib/utils';

const GuestContactStep = lazy(() =>
  import('./GuestContactStep').then((m) => ({ default: m.GuestContactStep }))
);
const HelpTypeChooserStep = lazy(() =>
  import('./HelpTypeChooserStep').then((m) => ({ default: m.HelpTypeChooserStep }))
);
const EmergencyDispatchStep = lazy(() =>
  import('./EmergencyDispatchStep').then((m) => ({ default: m.EmergencyDispatchStep }))
);
const HospitalRideStep = lazy(() =>
  import('./HospitalRideStep').then((m) => ({ default: m.HospitalRideStep }))
);
const TriageStep = lazy(() => import('./TriageStep').then((m) => ({ default: m.TriageStep })));
const EmergencySOSView = lazy(() =>
  import('./EmergencySOSView').then((m) => ({ default: m.EmergencySOSView }))
);
const HelpComingView = lazy(() =>
  import('./HelpComingView').then((m) => ({ default: m.HelpComingView }))
);

function StepFallback() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Loader2 className="h-10 w-10 animate-spin text-white/80" aria-hidden />
    </div>
  );
}

function modalTheme(step: string, helpType: string | null): string {
  if (step === 'choose') return 'bg-slate-900';
  if (step === 'help-coming' && helpType === 'hospital_ride') return 'bg-sky-900';
  if (step === 'hospital-ride' || helpType === 'hospital_ride') return 'bg-sky-900';
  if (step === 'emergency-dispatch' || helpType === 'emergency') return 'bg-red-700';
  return 'bg-red-700';
}

function headerTitle(step: string, helpType: string | null): string {
  if (step === 'choose') return 'I Need Help';
  if (step === 'help-coming' && helpType === 'hospital_ride') return 'Your ride';
  if (step === 'hospital-ride' || helpType === 'hospital_ride') return 'Hospital ride';
  if (step === 'emergency-dispatch' || helpType === 'emergency') return 'Medical emergency';
  if (step === 'guest') return helpType === 'hospital_ride' ? 'Hospital ride' : 'Medical emergency';
  return 'I Need Help';
}

function headerSubtitle(step: string, helpType: string | null): string | null {
  if (step === 'choose') return 'Choose emergency ambulance or hospital transport';
  if (helpType === 'hospital_ride') return 'Non-emergency · Medical cab to nearest hospital';
  if (helpType === 'emergency') return 'Ambulance SOS · Nearest hospital connected';
  return null;
}

export function EmergencyFlowModal() {
  const dispatch = useAppDispatch();
  const { isOpen, step, helpType, isActive } = useAppSelector((s) => s.emergency);
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (!isOpen || !isAuthenticated || !user || step !== 'guest') return;
    dispatch(
      setGuest({
        name: `${user.profile.firstName} ${user.profile.lastName}`.trim(),
        phone: user.phone,
      })
    );
    dispatch(skipGuest());
  }, [isOpen, isAuthenticated, user, step, dispatch]);

  if (!isOpen) return null;

  const theme = modalTheme(step, helpType);
  const subtitle = headerSubtitle(step, helpType);

  return (
    <div
      className={cn('fixed inset-0 z-[100] flex flex-col', theme)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-dialog-title"
    >
      <div
        className={cn(
          'flex flex-col shrink-0 px-4 py-3 border-b border-white/10',
          step === 'choose'
            ? 'bg-slate-950'
            : step === 'hospital-ride' || (step === 'help-coming' && helpType === 'hospital_ride')
              ? 'bg-sky-950'
              : 'bg-red-800'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <h1 id="emergency-dialog-title" className="text-lg font-bold text-white truncate">
              {headerTitle(step, helpType)}
            </h1>
            {subtitle && (
              <p className="text-xs text-white/70 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              dispatch(isActive ? dismissEmergencyModal() : closeEmergency())
            }
            className="p-2 rounded-full text-white hover:bg-white/10 min-h-[48px] min-w-[48px] flex items-center justify-center shrink-0"
            aria-label="Close help"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <Suspense fallback={<StepFallback />}>
          {step === 'choose' && <HelpTypeChooserStep />}
          {step === 'guest' && <GuestContactStep />}
          {step === 'emergency-dispatch' && <EmergencyDispatchStep />}
          {step === 'hospital-ride' && <HospitalRideStep />}
          {step === 'triage' && <TriageStep />}
          {step === 'sos' && <EmergencySOSView />}
          {step === 'help-coming' && <HelpComingView />}
        </Suspense>
      </div>
    </div>
  );
}
