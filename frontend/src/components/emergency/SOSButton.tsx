import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { useTriggerSOSMutation } from '@/features/api/apiSlice';
import { activateOneTapEmergency } from '@/features/emergency/emergencySlice';
import { getApiErrorMessage } from '@/lib/apiError';
import { resolveSosLocation, GpsLocationError } from '@/lib/pickupLocation';
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

  const [phase, setPhase] = useState<'idle' | 'countdown' | 'dispatching'>('idle');
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const [triggerSOS, { isLoading: sosLoading }] = useTriggerSOSMutation();

  const primeLocation = useCallback(async () => {
    if (coordsRef.current) return coordsRef.current;

    if (savedLocation?.lat != null && savedLocation?.lng != null) {
      coordsRef.current = { lat: savedLocation.lat, lng: savedLocation.lng };
      return coordsRef.current;
    }

    setLocating(true);
    setLocationError(null);
    try {
      const resolved = await resolveSosLocation();
      coordsRef.current = { lat: resolved.lat, lng: resolved.lng };
      return coordsRef.current;
    } catch (err) {
      const message =
        err instanceof GpsLocationError
          ? err.message
          : 'Could not detect your location. Enable GPS and try again.';
      setLocationError(message);
      return null;
    } finally {
      setLocating(false);
    }
  }, [savedLocation]);

  const cancelCountdown = useCallback(() => {
    setPhase('idle');
    setSecondsLeft(COUNTDOWN_SECONDS);
    setLocationError(null);
  }, []);

  const dispatchSos = useCallback(async () => {
    if (!user?._id) {
      toast.error('Sign in as a patient to use emergency SOS.');
      setPhase('idle');
      return;
    }

    const coords = coordsRef.current ?? (await primeLocation());
    if (!coords) {
      toast.error(locationError || 'Could not get your GPS location. Enable location access and try again.');
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

      setPhase('idle');
      coordsRef.current = null;
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not dispatch ambulance. Call 108 immediately.'));
      setPhase('idle');
    }
  }, [user?._id, primeLocation, locationError, triggerSOS, dispatch, emergencyType]);

  useEffect(() => {
    if (phase !== 'countdown') return;

    void primeLocation();

    let remaining = COUNTDOWN_SECONDS;
    setSecondsLeft(remaining);

    const id = setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        void dispatchSos();
      }
    }, 1000);

    return () => clearInterval(id);
  }, [phase, dispatchSos, primeLocation]);

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
    setLocationError(null);
    setSecondsLeft(COUNTDOWN_SECONDS);
    setPhase('countdown');
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

      {phase === 'countdown' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sos-countdown-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-red-900 border border-red-500/50 p-8 text-center text-white shadow-2xl">
            <p id="sos-countdown-title" className="text-sm uppercase tracking-widest text-red-200 mb-2">
              Emergency dispatch in
            </p>
            <p className="text-7xl font-black tabular-nums text-white mb-2">{secondsLeft}</p>
            <p className="text-red-100 text-sm mb-6">
              {locating
                ? 'Getting your GPS location…'
                : locationError
                  ? locationError
                  : coordsRef.current
                    ? 'Location ready — sending to dispatch'
                    : 'Allow location access if prompted'}
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={cancelCountdown}
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
