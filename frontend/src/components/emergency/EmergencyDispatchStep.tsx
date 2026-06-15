import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Ambulance,
  Building2,
  Loader2,
  MapPin,
  Phone,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { useLazyGetEmergencyNearbyHospitalsQuery, useTriggerSOSMutation } from '@/features/api/apiSlice';
import {
  activateOneTapEmergency,
  dismissEmergencyModal,
  setEmergencyLocation,
  setNearbyHospitals,
} from '@/features/emergency/emergencySlice';
import { getApiErrorMessage } from '@/lib/apiError';
import { resolveSosLocation, GpsLocationError } from '@/lib/pickupLocation';
import { useLazyGeocodeEmergencyAddressQuery } from '@/features/api/apiSlice';
import type { EmergencyHospitalInfo, EmergencyType } from '@/types';

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function EmergencyDispatchStep() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const { nearestHospital, guest } = useAppSelector((s) => s.emergency);

  const [phase, setPhase] = useState<'ready' | 'locating' | 'dispatching'>(
    () => (user?._id ? 'locating' : 'ready')
  );
  const [manualAddress, setManualAddress] = useState('');
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const [triggerSOS, { isLoading }] = useTriggerSOSMutation();
  const [fetchHospitals] = useLazyGetEmergencyNearbyHospitalsQuery();
  const [geocodeAddress] = useLazyGeocodeEmergencyAddressQuery();

  const loadNearestHospital = useCallback(
    async (lat: number, lng: number) => {
      try {
        const res = await fetchHospitals({ lat, lng, radius: 15 }).unwrap();
        const list = (res.data?.hospitals ?? []) as EmergencyHospitalInfo[];
        dispatch(
          setNearbyHospitals({
            hospitals: list,
            nearest: list[0] ?? null,
          })
        );
        return list[0] ?? null;
      } catch {
        return null;
      }
    },
    [dispatch, fetchHospitals]
  );

  const dispatchEmergency = useCallback(
    async (lat: number, lng: number, address: string) => {
      if (!user?._id) {
        toast.error('Sign in as a patient to dispatch an ambulance.');
        navigate('/login');
        return;
      }

      setDispatchError(null);
      setPhase('dispatching');
      dispatch(
        setEmergencyLocation({
          lat,
          lng,
          address,
        })
      );

      void loadNearestHospital(lat, lng);

      try {
        const result = await triggerSOS({
          patientLat: lat,
          patientLng: lng,
          emergencyType: 'other' as EmergencyType,
          patientId: user._id,
        }).unwrap();

        const hospitalFromApi = result.data.nearestHospital;
        if (hospitalFromApi?.name) {
          dispatch(
            setNearbyHospitals({
              hospitals: [hospitalFromApi as EmergencyHospitalInfo],
              nearest: hospitalFromApi as EmergencyHospitalInfo,
            })
          );
        }

        dispatch(
          activateOneTapEmergency({
            requestId: result.data.requestId,
            dispatch: result.data,
            status: 'searching',
            patientLocation: { lat, lng },
          })
        );

        dispatch(dismissEmergencyModal());

        if (hospitalFromApi?.name) {
          toast.success(
            `Connected to ${hospitalFromApi.name} — ambulance ETA ${result.data.calculatedETA} min`
          );
        } else if (result.data.isDelayed) {
          toast.warn(`Ambulance assigned — ETA ${result.data.calculatedETA} min (traffic delay).`);
        } else {
          toast.success(`Ambulance on the way — ETA ${result.data.calculatedETA} min.`);
        }
      } catch (err: unknown) {
        const message = getApiErrorMessage(err, 'Could not dispatch ambulance. Call 108 immediately.');
        setDispatchError(message);
        toast.error(message);
        setPhase('ready');
      }
    },
    [dispatch, loadNearestHospital, navigate, triggerSOS, user?._id]
  );

  const captureAndDispatch = useCallback(async () => {
    setPhase('locating');
    setDispatchError(null);

    try {
      const resolved = await resolveSosLocation();
      await loadNearestHospital(resolved.lat, resolved.lng);
      await dispatchEmergency(resolved.lat, resolved.lng, resolved.address);
    } catch (err) {
      const message =
        err instanceof GpsLocationError
          ? err.message
          : 'Could not detect your location. Enable GPS and try again.';
      setDispatchError(message);
      toast.error(message);
      setPhase('ready');
    }
  }, [dispatchEmergency, loadNearestHospital]);

  useEffect(() => {
    if (!user?._id || startedRef.current) return;
    startedRef.current = true;
    void captureAndDispatch();
  }, [user?._id, captureAndDispatch]);

  const hospital = nearestHospital ?? null;

  return (
    <div className="flex flex-col flex-1 p-6 sm:p-8 max-w-lg mx-auto w-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
          <AlertTriangle className="h-7 w-7 text-white" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-red-200">Medical emergency</p>
          <h2 className="text-2xl font-bold text-white">Ambulance + hospital</h2>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="p-4 rounded-xl bg-white/10 border border-white/15">
          <p className="text-xs font-semibold uppercase text-red-100 mb-2 flex items-center gap-1">
            <Ambulance className="h-4 w-4" /> What happens
          </p>
          <ul className="text-sm text-white/90 space-y-2 list-disc list-inside">
            <li>We find the nearest hospital (2 km, then 4 km, then wider)</li>
            <li>Nearest available ambulance is dispatched to you</li>
            <li>Live map with route appears automatically</li>
          </ul>
        </div>

        {hospital ? (
          <div className="p-4 rounded-xl bg-red-950/50 border-2 border-red-400/40">
            <p className="text-xs font-bold uppercase tracking-wide text-red-200 mb-1 flex items-center gap-1">
              <Building2 className="h-4 w-4" /> Destination hospital
            </p>
            <p className="text-lg font-bold text-white">{hospital.name}</p>
            <p className="text-sm text-red-100 mt-1 flex gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" />
              {hospital.address}
            </p>
            <p className="text-sm text-white/80 mt-2">
              {formatDistance(hospital.distanceMeters)} from your location
            </p>
          </div>
        ) : (
          <p className="text-sm text-red-100">
            {phase === 'locating'
              ? 'Detecting your location and nearest emergency hospital…'
              : 'Connecting to the nearest hospital from your GPS…'}
          </p>
        )}

        {guest && (
          <p className="text-sm text-white/70">
            Contact: {guest.name} · {guest.phone}
          </p>
        )}

        {dispatchError && (
          <p className="text-sm text-amber-100 bg-amber-950/40 border border-amber-400/30 rounded-lg p-3">
            {dispatchError}
          </p>
        )}
      </div>

      {(phase === 'locating' || phase === 'dispatching' || isLoading) && (
        <div className="flex flex-col items-center py-10 text-center">
          <Loader2 className="h-14 w-14 text-white animate-spin mb-4" />
          <p className="text-xl font-bold text-white">
            {phase === 'locating' ? 'Getting your location…' : 'Connecting ambulance & hospital…'}
          </p>
          <p className="text-red-100 mt-2">Live map will open when dispatch confirms</p>
        </div>
      )}

      {phase === 'ready' && !user?._id && (
        <>
          <Label className="text-white text-lg">Your location</Label>
          <Input
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            placeholder="Address or landmark"
            className="mt-2 h-12 bg-white text-lg"
          />
          <Button
            className="mt-4 h-14 text-lg bg-white text-red-700 w-full"
            disabled={!manualAddress.trim()}
            onClick={async () => {
              try {
                const geo = await geocodeAddress(manualAddress.trim()).unwrap();
                const { lat, lng, displayName } = geo.data!;
                await loadNearestHospital(lat, lng);
                await dispatchEmergency(lat, lng, displayName);
              } catch {
                toast.error('Could not find that address. Try "Area, City" e.g. Warangal, Telangana');
              }
            }}
          >
            Dispatch ambulance now
          </Button>
        </>
      )}

      {phase === 'ready' && user?._id && (
        <Button
          className="h-14 text-lg bg-white text-red-700 w-full"
          onClick={() => void captureAndDispatch()}
        >
          Retry dispatch
        </Button>
      )}

      <a href="tel:108" className="block mt-6">
        <Button variant="outline" className="w-full h-12 border-white text-white hover:bg-white/10 gap-2">
          <Phone className="h-5 w-5" />
          Call 108 instead
        </Button>
      </a>
    </div>
  );
}
