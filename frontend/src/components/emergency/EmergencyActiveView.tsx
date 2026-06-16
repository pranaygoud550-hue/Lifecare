import { useEffect, useMemo, useState } from 'react';
import { useVisiblePollingInterval } from '@/hooks/usePageVisible';
import {
  Ambulance, Building2, Brain, Clock, Loader2, Phone, Sparkles,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapWrapper } from '@/components/emergency/MapWrapper';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { useEmergencySocket } from '@/hooks/useEmergencySocket';
import { usePatientEmergencyLocationStream } from '@/hooks/usePatientEmergencyLocationStream';
import {
  useCancelEmergencyMutation,
  useGetLiveETAQuery,
  useGetNavigationEtaQuery,
} from '@/features/api/apiSlice';
import {
  clearEmergency,
  dismissArrivedAlert,
  updateAmbulanceLocation,
  updateEta,
  updateStatus,
  updateNavigationRoute,
} from '@/features/emergency/emergencySlice';
import { getApiErrorMessage } from '@/lib/apiError';
import type { EmergencyRequestStatus } from '@/types';

const STATUS_STEPS: { key: EmergencyRequestStatus | 'onTheWay'; label: string }[] = [
  { key: 'searching', label: 'Searching' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'onTheWay', label: 'On the way' },
  { key: 'arrived', label: 'Arrived' },
];

function formatCountdown(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function statusToStepIndex(status: EmergencyRequestStatus): number {
  switch (status) {
    case 'searching':
      return 0;
    case 'dispatched':
      return 1;
    case 'pickedUp':
    case 'atHospital':
      return 3;
    case 'arrived':
      return 3;
    case 'completed':
    case 'cancelled':
      return 3;
    default:
      return 2;
  }
}

function driverInitials(name?: string | null) {
  if (!name) return 'DR';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
}

export function EmergencyActiveView() {
  const dispatch = useAppDispatch();
  const {
    requestId,
    status,
    ambulanceLocation,
    patientLocation,
    hospitalLocation,
    driverName,
    vehicleNumber,
    driverPhone,
    eta,
    isDelayed,
    hasArrivedAlert,
    dispatchSnapshot,
    smartRecommendation,
    pickupOtp,
    navigationRoutePath,
  } = useAppSelector((s) => s.emergency);

  useEmergencySocket();
  usePatientEmergencyLocationStream();

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  const etaPollMs = useVisiblePollingInterval(10000);
  const { data: etaData, isFetching: etaFetching } = useGetLiveETAQuery(requestId ?? '', {
    skip: !requestId,
    pollingInterval: etaPollMs,
  });
  const { data: navData } = useGetNavigationEtaQuery(requestId ?? '', {
    skip: !requestId,
    pollingInterval: etaPollMs,
  });

  const [cancelEmergency, { isLoading: cancelling }] = useCancelEmergencyMutation();

  const liveEta = etaData?.data;
  const navEta = navData?.data;
  const calculatedMinutes = navEta?.calculatedETA ?? liveEta?.calculatedETA ?? eta ?? dispatchSnapshot?.calculatedETA ?? null;
  const estimatedArrival = liveEta?.estimatedArrival ?? dispatchSnapshot?.estimatedArrival;
  const currentStatus = liveEta?.status ?? status;

  useEffect(() => {
    if (liveEta?.status) {
      dispatch(updateStatus(liveEta.status));
    }
    if (liveEta?.assignedAmbulance?.currentLocation) {
      dispatch(
        updateAmbulanceLocation({
          lat: liveEta.assignedAmbulance.currentLocation.lat,
          lng: liveEta.assignedAmbulance.currentLocation.lng,
          eta: liveEta.calculatedETA,
        })
      );
    } else if (liveEta?.calculatedETA != null) {
      dispatch(updateEta(liveEta.calculatedETA));
    }
  }, [liveEta, dispatch]);

  useEffect(() => {
    if (!navEta) return;
    dispatch(
      updateNavigationRoute({
        path: navEta.decodedPath ?? null,
        eta: navEta.calculatedETA ?? null,
        nextInstruction: navEta.steps?.[0] ?? null,
      })
    );
  }, [navEta, dispatch]);

  useEffect(() => {
    if (!estimatedArrival) {
      setSecondsRemaining(calculatedMinutes != null ? calculatedMinutes * 60 : null);
      return;
    }

    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(estimatedArrival).getTime() - Date.now()) / 1000));
      setSecondsRemaining(diff);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [estimatedArrival, calculatedMinutes]);

  const activeStep = useMemo(() => {
    const idx = statusToStepIndex(currentStatus);
    if (currentStatus === 'dispatched' && secondsRemaining != null && secondsRemaining > 0) {
      return Math.max(idx, 2);
    }
    return idx;
  }, [currentStatus, secondsRemaining]);

  const handleCancel = async () => {
    if (!requestId) return;
    try {
      await cancelEmergency(requestId).unwrap();
      dispatch(clearEmergency());
      toast.info('Emergency request cancelled.');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not cancel emergency.'));
    } finally {
      setShowCancelConfirm(false);
    }
  };

  if (!patientLocation) return null;

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-red-950 text-white">
      <div className="min-h-full flex flex-col">
        <header className="bg-red-700 px-4 py-4 shadow-lg">
          <div className="container-custom flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Ambulance className="h-6 w-6 animate-pulse" />
              <div>
                <p className="text-xs uppercase tracking-wider text-red-100">Emergency active</p>
                <p className="font-bold">{requestId}</p>
              </div>
            </div>
            {(isDelayed || dispatchSnapshot?.isDelayed) && (
              <span className="text-xs font-semibold bg-amber-500 text-amber-950 px-2 py-1 rounded-full">
                Delayed
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 container-custom py-6 space-y-6">
          <section className="text-center rounded-2xl bg-red-900/60 border border-red-500/30 p-6">
            <div className="flex items-center justify-center gap-2 text-red-200 mb-2">
              <Clock className="h-5 w-5" />
              <span className="text-sm uppercase tracking-wide">Ambulance arrives in</span>
              {etaFetching && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <p className="text-6xl font-black tabular-nums tracking-tight">
              {secondsRemaining != null ? formatCountdown(secondsRemaining) : '—:—'}
            </p>
            {calculatedMinutes != null && (
              <p className="text-red-200 text-sm mt-2">Updated ETA ~{calculatedMinutes} min</p>
            )}
          </section>

          <section className="grid grid-cols-4 gap-1 text-center text-[10px] sm:text-xs">
            {STATUS_STEPS.map((step, index) => {
              const isActiveStep = index <= activeStep;
              const isCurrent = index === activeStep;
              return (
                <div key={step.label} className="flex flex-col items-center gap-1">
                  <div
                    className={`h-2 w-full rounded-full ${
                      isActiveStep ? 'bg-red-400' : 'bg-red-900'
                    } ${isCurrent ? 'ring-2 ring-white/50' : ''}`}
                  />
                  <span className={isActiveStep ? 'text-white font-semibold' : 'text-red-300'}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </section>

          <section>
            <p className="text-xs uppercase tracking-wide text-red-200 mb-2 px-1">Live tracking</p>
            <MapWrapper
              className="h-72 w-full"
              patientLocation={patientLocation}
              ambulanceLocation={ambulanceLocation}
              hospitalLocation={hospitalLocation}
              routePath={navigationRoutePath ?? navEta?.decodedPath ?? null}
            />
          </section>

          <section className="rounded-2xl bg-red-900/40 border border-red-500/20 p-4 flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-red-400">
              <AvatarFallback className="bg-red-800 text-white text-lg">
                {driverInitials(driverName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-red-200 uppercase tracking-wide">Your driver</p>
              <p className="font-bold text-lg truncate">{driverName || 'Assigning driver…'}</p>
              <p className="text-red-100 text-sm">Vehicle {vehicleNumber || '—'}</p>
            </div>
          </section>

          {hospitalLocation && (
            <section className="rounded-2xl bg-red-900/40 border border-red-500/20 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-red-300 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-red-200 uppercase tracking-wide mb-1">
                    {smartRecommendation ? 'AI-recommended hospital' : 'Nearest hospital'}
                  </p>
                  <p className="font-semibold">{hospitalLocation.name}</p>
                  {dispatchSnapshot?.nearestHospital?.address && (
                    <p className="text-sm text-red-100 mt-1">{dispatchSnapshot.nearestHospital.address}</p>
                  )}
                </div>
              </div>

              {smartRecommendation && (
                <div className="rounded-xl bg-violet-950/50 border border-violet-400/30 p-3 text-sm">
                  <p className="flex items-center gap-2 font-semibold text-violet-200 mb-2">
                    <Sparkles className="h-4 w-4" />
                    Smart match from your MediScan
                  </p>
                  <p className="text-violet-100/90 leading-relaxed">{smartRecommendation.reason}</p>
                  {smartRecommendation.scanContext && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 bg-violet-900/60 px-2 py-1 rounded-full">
                        <Brain className="h-3 w-3" />
                        {smartRecommendation.scanContext.prediction}
                      </span>
                      <span className="text-violet-300">
                        {smartRecommendation.scanContext.confidence}% confidence
                      </span>
                    </div>
                  )}
                  {smartRecommendation.alternatives && smartRecommendation.alternatives.length > 0 && (
                    <p className="text-xs text-violet-300/80 mt-2">
                      Alternatives: {smartRecommendation.alternatives.map((a) => a.name).join(' · ')}
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pb-8">
            {driverPhone ? (
              <Button
                asChild
                className="flex-1 bg-white text-red-700 hover:bg-red-50 font-bold h-12"
              >
                <a href={`tel:${driverPhone.replace(/\s/g, '')}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call Driver
                </a>
              </Button>
            ) : (
              <Button disabled className="flex-1 h-12 bg-white/20">
                <Phone className="h-4 w-4 mr-2" />
                Driver phone unavailable
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 border-red-400/50 text-red-100 hover:bg-red-900 hover:text-white"
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel Emergency
            </Button>
          </div>
        </main>
      </div>

      {hasArrivedAlert && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-green-700/95 p-6 text-center">
          <div className="max-w-md space-y-4">
            <Ambulance className="h-20 w-20 mx-auto animate-bounce" />
            <h2 className="text-4xl font-black">Ambulance has arrived!</h2>
            <p className="text-green-100 text-lg">Help is at your location. Stay calm — the crew is with you.</p>
            {pickupOtp && (
              <div className="rounded-xl bg-white/15 border border-white/30 p-4">
                <p className="text-sm text-green-100 mb-1">Your safety code — share with the crew</p>
                <p className="text-5xl font-black tracking-[0.3em]">{pickupOtp}</p>
              </div>
            )}
            <Button
              className="bg-white text-green-800 hover:bg-green-50 font-bold h-12 px-8"
              onClick={() => dispatch(dismissArrivedAlert())}
            >
              OK — I see them
            </Button>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-red-950 border border-red-500/40 p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-2">Cancel emergency?</h2>
            <p className="text-red-100 text-sm mb-6">
              Only cancel if you are safe and no longer need an ambulance. Dispatch may already be en route.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-red-400/40 text-white hover:bg-red-900"
                onClick={() => setShowCancelConfirm(false)}
              >
                Keep waiting
              </Button>
              <Button
                type="button"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={cancelling}
                onClick={() => void handleCancel()}
              >
                {cancelling ? 'Cancelling…' : 'Yes, cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
