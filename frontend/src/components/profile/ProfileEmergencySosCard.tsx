import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Building2, Loader2, MapPin, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { useTriggerSOSMutation, useLazyGetEmergencyNearbyHospitalsQuery } from '@/features/api/apiSlice';
import { activateOneTapEmergency } from '@/features/emergency/emergencySlice';
import { resolveSosLocation, GpsLocationError } from '@/lib/pickupLocation';
import { getApiErrorMessage } from '@/lib/apiError';
import type { EmergencyHospitalInfo } from '@/types';

const COUNTDOWN_SECONDS = 5;
const LOCATE_MIN_MS = 2000;

type Phase = 'idle' | 'locating' | 'hospital' | 'countdown' | 'dispatching';

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

export function ProfileEmergencySosCard() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const { isActive } = useAppSelector((s) => s.emergency);

  const [phase, setPhase] = useState<Phase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [nearestHospital, setNearestHospital] = useState<EmergencyHospitalInfo | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const [triggerSOS, { isLoading }] = useTriggerSOSMutation();
  const [fetchHospitals] = useLazyGetEmergencyNearbyHospitalsQuery();

  const cancel = useCallback(() => {
    setPhase('idle');
    setSecondsLeft(COUNTDOWN_SECONDS);
    setNearestHospital(null);
    coordsRef.current = null;
  }, []);

  const dispatchSos = useCallback(async () => {
    const coords = coordsRef.current;
    if (!user?._id || !coords) {
      toast.error('Sign in as a patient to use emergency SOS.');
      navigate('/login');
      cancel();
      return;
    }

    setPhase('dispatching');
    try {
      const result = await triggerSOS({
        patientLat: coords.lat,
        patientLng: coords.lng,
        emergencyType: 'other',
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
        toast.warn(`Ambulance dispatched — ETA ${result.data.calculatedETA} min (traffic delay).`);
      } else {
        toast.success(`Help is on the way — ETA ${result.data.calculatedETA} min.`);
      }
      cancel();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not dispatch ambulance. Call 108 immediately.'));
      cancel();
    }
  }, [user?._id, triggerSOS, dispatch, navigate, cancel]);

  const startSosFlow = useCallback(async () => {
    if (!user) {
      toast.error('Sign in to send an emergency SOS.');
      navigate('/login');
      return;
    }
    if (user.userType !== 'patient') {
      toast.info('Emergency SOS is available for patient accounts.');
      return;
    }
    if (isActive) return;

    setPhase('locating');
    setNearestHospital(null);
    const startedAt = Date.now();

    let resolved;
    try {
      resolved = await resolveSosLocation();
    } catch (err) {
      const message =
        err instanceof GpsLocationError
          ? err.message
          : 'Could not detect your location. Enable GPS and try again.';
      toast.error(message);
      setPhase('idle');
      return;
    }

    coordsRef.current = { lat: resolved.lat, lng: resolved.lng };
    setPickupAddress(resolved.address);

    const elapsed = Date.now() - startedAt;
    if (elapsed < LOCATE_MIN_MS) {
      await new Promise((r) => setTimeout(r, LOCATE_MIN_MS - elapsed));
    }

    setPhase('hospital');
    let nearest: EmergencyHospitalInfo | null = null;
    try {
      const res = await fetchHospitals({ lat: resolved.lat, lng: resolved.lng, radius: 15 }).unwrap();
      nearest = res.data?.hospitals?.[0] ?? null;
      setNearestHospital(nearest);
    } catch {
      toast.info('Could not load nearby hospitals — ambulance will still be dispatched.');
    }

    await new Promise((r) => setTimeout(r, 1500));
    setSecondsLeft(COUNTDOWN_SECONDS);
    setPhase('countdown');
  }, [user, isActive, navigate, fetchHospitals]);

  useEffect(() => {
    if (phase !== 'countdown') return;

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
  }, [phase, dispatchSos]);

  const busy = phase !== 'idle' || isLoading;

  return (
    <>
      <Card className="overflow-hidden border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100/80">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-red-900">
                {t('dashboard.profileSosTitle', 'Emergency SOS')}
              </h3>
              <p className="mt-1 text-sm text-red-800/90">
                {t(
                  'dashboard.profileSosDesc',
                  'We detect your location, find the nearest hospital, then dispatch an ambulance.'
                )}
              </p>
              <Button
                type="button"
                variant="danger"
                className="mt-4 w-full sm:w-auto"
                disabled={busy || isActive}
                onClick={() => void startSosFlow()}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {phase === 'locating'
                      ? t('dashboard.sosLocating', 'Detecting location…')
                      : phase === 'hospital'
                        ? t('dashboard.sosFindingHospital', 'Finding nearest hospital…')
                        : t('dashboard.sosDispatching', 'Dispatching…')}
                  </>
                ) : (
                  t('dashboard.profileSosCta', 'SOS — Get Help Now')
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {(phase === 'locating' || phase === 'hospital' || phase === 'countdown' || phase === 'dispatching') && (
        <div
          className="fixed inset-0 z-[105] flex items-center justify-center bg-red-950/92 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-sos-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-red-900 p-6 sm:p-8 text-center text-white shadow-2xl">
            {phase === 'locating' && (
              <>
                <Loader2 className="mx-auto h-14 w-14 animate-spin text-red-200 mb-4" />
                <h2 id="profile-sos-title" className="text-xl font-bold">
                  {t('dashboard.sosLocating', 'Detecting your location…')}
                </h2>
                <p className="mt-2 text-red-100 text-sm">Please allow GPS access if prompted.</p>
              </>
            )}

            {phase === 'hospital' && (
              <>
                <Building2 className="mx-auto h-14 w-14 text-cyan-300 mb-4" />
                <h2 id="profile-sos-title" className="text-xl font-bold">
                  {t('dashboard.sosFindingHospital', 'Finding nearest hospital…')}
                </h2>
                {pickupAddress && (
                  <p className="mt-3 text-sm text-red-100 flex items-center justify-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {pickupAddress}
                  </p>
                )}
              </>
            )}

            {(phase === 'countdown' || phase === 'dispatching') && (
              <>
                {nearestHospital ? (
                  <div className="mb-4 rounded-xl border border-cyan-400/30 bg-white/10 p-4 text-left">
                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
                      {t('dashboard.nearestHospital', 'Nearest hospital')}
                    </p>
                    <p className="font-bold text-lg mt-1">{nearestHospital.name}</p>
                    <p className="text-sm text-red-100 mt-1">{nearestHospital.address}</p>
                    <p className="text-sm text-cyan-200 mt-2">
                      {formatDistance(nearestHospital.distanceMeters)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-red-100 mb-4">
                    Hospital will be assigned automatically from your GPS.
                  </p>
                )}

                {phase === 'countdown' ? (
                  <>
                    <p className="text-sm uppercase tracking-widest text-red-200">
                      {t('dashboard.sosCountdown', 'Dispatching ambulance in')}
                    </p>
                    <p className="text-7xl font-black tabular-nums my-2">{secondsLeft}</p>
                  </>
                ) : (
                  <>
                    <Loader2 className="mx-auto h-12 w-12 animate-spin mb-3" />
                    <p className="text-lg font-bold">{t('dashboard.sosDispatching', 'Dispatching ambulance…')}</p>
                  </>
                )}
              </>
            )}

            {phase !== 'dispatching' && (
              <Button
                type="button"
                variant="outline"
                className="mt-6 w-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                onClick={cancel}
              >
                <X className="h-4 w-4 mr-2" />
                {t('dashboard.sosCancel', 'Cancel — false alarm')}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
