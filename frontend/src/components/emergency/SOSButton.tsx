import { useCallback, useRef, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { SosCountdown } from '@/components/emergency/SosCountdown';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { useTriggerSOSMutation } from '@/features/api/apiSlice';
import { activateOneTapEmergency } from '@/features/emergency/emergencySlice';
import { getApiErrorMessage } from '@/lib/apiError';
import {
  HyderabadAreaSearch,
  type HyderabadAreaSelection,
} from '@/components/emergency/HyderabadAreaSearch';
import { GpsLocationError, resolveSosLocation } from '@/lib/pickupLocation';
import { useLazyReverseGeocodeEmergencyQuery } from '@/features/api/apiSlice';
import { setEmergencyLocation } from '@/features/emergency/emergencySlice';
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

  const [phase, setPhase] = useState<'idle' | 'locating' | 'pick-area' | 'countdown' | 'dispatching'>('idle');
  const [countdownKey, setCountdownKey] = useState(0);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const [triggerSOS, { isLoading: sosLoading }] = useTriggerSOSMutation();
  const [reverseGeocode] = useLazyReverseGeocodeEmergencyQuery();

  const cancelFlow = useCallback(() => {
    setPhase('idle');
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
    [user, triggerSOS, dispatch, emergencyType, cancelFlow]
  );

  const handleCountdownComplete = useCallback(() => {
    const coords = coordsRef.current;
    if (coords) void dispatchSos(coords);
    else setPhase('pick-area');
  }, [dispatchSos]);

  const handleAreaSelect = (selection: HyderabadAreaSelection) => {
    coordsRef.current = { lat: selection.lat, lng: selection.lng };
    setCountdownKey((k) => k + 1);
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

    if (savedLocation?.lat != null && savedLocation?.lng != null) {
      coordsRef.current = { lat: savedLocation.lat, lng: savedLocation.lng };
      setCountdownKey((k) => k + 1);
      setPhase('countdown');
      return;
    }

    setPhase('locating');
    void (async () => {
      try {
        const gps = await resolveSosLocation();
        let lat = gps.lat;
        let lng = gps.lng;
        try {
          const res = await reverseGeocode({ lat: gps.lat, lng: gps.lng }).unwrap();
          if (res.data) {
            lat = res.data.lat;
            lng = res.data.lng;
            dispatch(
              setEmergencyLocation({
                lat,
                lng,
                address: res.data.displayName,
              })
            );
          }
        } catch {
          dispatch(setEmergencyLocation({ lat, lng, address: gps.address }));
        }
        coordsRef.current = { lat, lng };
        setCountdownKey((k) => k + 1);
        setPhase('countdown');
      } catch (err) {
        const msg =
          err instanceof GpsLocationError
            ? err.message
            : 'Could not detect location. Pick your area below.';
        toast.error(msg);
        setPhase('pick-area');
      }
    })();
  };

  if (isActive) return null;

  const isBusy = phase === 'dispatching' || sosLoading;

  return (
    <>
      <button
        type="button"
        onClick={handlePress}
        disabled={phase === 'countdown' || phase === 'locating' || isBusy}
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

      {(phase === 'countdown' || phase === 'pick-area' || phase === 'locating') && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sos-countdown-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-red-900 border border-red-500/50 p-8 text-white shadow-2xl">
            {phase === 'countdown' ? (
              <SosCountdown
                key={countdownKey}
                seconds={COUNTDOWN_SECONDS}
                onComplete={handleCountdownComplete}
              >
                {(secondsLeft) => (
                  <>
                    <p id="sos-countdown-title" className="text-sm uppercase tracking-widest text-red-200 mb-2">
                      Emergency dispatch in
                    </p>
                    <p className="text-7xl font-black tabular-nums text-white mb-2">{secondsLeft}</p>
                    <p className="text-red-100 text-sm mb-6">
                      Location detected — sending ambulance to nearest hospital
                    </p>
                  </>
                )}
              </SosCountdown>
            ) : phase === 'locating' ? (
              <>
                <p id="sos-countdown-title" className="text-lg font-bold mb-2">
                  Detecting your location…
                </p>
                <Loader2 className="h-12 w-12 text-white animate-spin mx-auto mb-4" />
                <p className="text-red-100 text-sm">
                  GPS + nearest street — no typing needed
                </p>
              </>
            ) : (
              <>
                <p id="sos-countdown-title" className="text-lg font-bold mb-2">
                  Where are you in Telangana?
                </p>
                <p className="text-red-100 text-sm mb-4">
                  GPS failed — search your city or area in Telangana
                </p>
                <HyderabadAreaSearch
                  onSelect={handleAreaSelect}
                  inputClassName="h-12 bg-white text-base text-slate-900"
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
