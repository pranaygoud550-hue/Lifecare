import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { useTriggerSOSMutation } from '@/features/api/apiSlice';
import { activateOneTapEmergency } from '@/features/emergency/emergencySlice';
import { getApiErrorMessage } from '@/lib/apiError';
import {
  HyderabadAreaSearch,
  type HyderabadAreaSelection,
} from '@/components/emergency/HyderabadAreaSearch';
import { HYDERABAD_SERVICE_LABEL } from '@/data/hyderabadAreas';
import type { EmergencyType } from '@/types';

const COUNTDOWN_SECONDS = 5;

interface SOSButtonProps {
  emergencyType?: EmergencyType;
  className?: string;
}

export function SOSButton({ emergencyType = 'other', className = '' }: SOSButtonProps) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { isActive, location: savedLocation } = useAppSelector((s) => s.emergency);

  const [phase, setPhase] = useState<'idle' | 'pick-area' | 'countdown' | 'dispatching'>('idle');
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const [triggerSOS, { isLoading: sosLoading }] = useTriggerSOSMutation();

  const cancelFlow = useCallback(() => {
    setPhase('idle');
    setSecondsLeft(COUNTDOWN_SECONDS);
    coordsRef.current = null;
  }, []);

  const dispatchSos = useCallback(
    async (coords: { lat: number; lng: number }) => {
      if (!user?._id) {
        toast.error('Sign in as a patient to use emergency SOS.');
        setPhase('idle');
        return;
      }

      setPhase('dispatching');
      try {
        const result = await triggerSOS({
          patientLat: coords.lat,
          patientLng: coords.lng,
          emergencyType,
          patientId: user._id,
        }).unwrap();

        dispatch(
          activateOneTapEmergency({
            requestId: result.data.requestId,
            dispatch: result.data,
            status: 'searching',
            patientLocation: coords,
          })
        );

        if (result.data.isDelayed) {
          toast.warn(`Ambulance dispatched — ETA ${result.data.calculatedETA} min (heavy traffic).`);
        } else {
          toast.success(`Help is on the way — ETA ${result.data.calculatedETA} min.`);
        }

        cancelFlow();
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Could not dispatch ambulance. Call 108 immediately.'));
        setPhase('pick-area');
      }
    },
    [user?._id, triggerSOS, dispatch, emergencyType, cancelFlow]
  );

  useEffect(() => {
    if (phase !== 'countdown') return;

    let remaining = COUNTDOWN_SECONDS;
    setSecondsLeft(remaining);

    const id = setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        const coords = coordsRef.current;
        if (coords) void dispatchSos(coords);
        else setPhase('pick-area');
      }
    }, 1000);

    return () => clearInterval(id);
  }, [phase, dispatchSos]);

  const handleAreaSelect = (selection: HyderabadAreaSelection) => {
    coordsRef.current = { lat: selection.lat, lng: selection.lng };
    setSecondsLeft(COUNTDOWN_SECONDS);
    setPhase('countdown');
  };

  const handlePress = () => {
    if (!user) {
      toast.error('Sign in to send an emergency SOS.');
      return;
    }

    if (user.userType !== 'patient') {
      toast.info('Emergency SOS is available for patient accounts.');
      return;
    }

    if (isActive) return;

    coordsRef.current = null;
    setSecondsLeft(COUNTDOWN_SECONDS);

    if (savedLocation?.lat != null && savedLocation?.lng != null) {
      coordsRef.current = { lat: savedLocation.lat, lng: savedLocation.lng };
      setPhase('countdown');
    } else {
      setPhase('pick-area');
    }
  };

  if (isActive) return null;

  const isBusy = phase === 'dispatching' || sosLoading;

  return (
    <>
      <button
        type="button"
        onClick={handlePress}
        disabled={phase === 'countdown' || isBusy}
        className={`
          fixed bottom-24 right-4 z-40 md:bottom-8 md:right-8
          flex items-center justify-center gap-2
          min-h-[3.75rem] px-6 rounded-full
          bg-red-600 hover:bg-red-700 active:bg-red-800
          text-white font-bold text-base shadow-lg shadow-red-600/40
          animate-pulse hover:animate-none
          disabled:opacity-90 disabled:cursor-not-allowed
          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-400
          ${className}
        `}
        aria-label="Emergency SOS — Get Help Now"
      >
        {isBusy ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin shrink-0" />
            Dispatching ambulance…
          </>
        ) : (
          <>
            <AlertTriangle className="h-5 w-5 shrink-0" />
            SOS — Get Help Now
          </>
        )}
      </button>

      {(phase === 'countdown' || phase === 'pick-area') && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sos-countdown-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-red-900 border border-red-500/50 p-8 text-white shadow-2xl">
            {phase === 'countdown' ? (
              <>
                <p id="sos-countdown-title" className="text-sm uppercase tracking-widest text-red-200 mb-2">
                  Emergency dispatch in
                </p>
                <p className="text-7xl font-black tabular-nums text-white mb-2">{secondsLeft}</p>
                <p className="text-red-100 text-sm mb-6">
                  Hyderabad area selected — sending to dispatch
                </p>
              </>
            ) : (
              <>
                <p id="sos-countdown-title" className="text-lg font-bold mb-2">
                  Where are you in Hyderabad?
                </p>
                <p className="text-red-100 text-sm mb-4">
                  SOS is available in {HYDERABAD_SERVICE_LABEL} only. Pick your area to dispatch help.
                </p>
                <HyderabadAreaSearch
                  onSelect={handleAreaSelect}
                  inputClassName="h-12 bg-white text-base text-slate-900"
                  showPopular
                  showLandmark
                />
              </>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full mt-4 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={cancelFlow}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel — false alarm
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
