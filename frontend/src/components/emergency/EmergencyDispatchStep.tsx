import { useCallback, useEffect, useState } from 'react';
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
import { useTriggerSOSMutation } from '@/features/api/apiSlice';
import {
  activateOneTapEmergency,
  closeEmergency,
  setEmergencyLocation,
} from '@/features/emergency/emergencySlice';
import { getApiErrorMessage } from '@/lib/apiError';
import type { EmergencyType } from '@/types';

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function EmergencyDispatchStep() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const { nearestHospital, guest } = useAppSelector((s) => s.emergency);

  const [phase, setPhase] = useState<'ready' | 'locating' | 'dispatching'>('ready');
  const [manualAddress, setManualAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [triggerSOS, { isLoading }] = useTriggerSOSMutation();

  const dispatchEmergency = useCallback(
    async (lat: number, lng: number, address: string) => {
      if (!user?._id) {
        toast.error('Sign in as a patient to dispatch an ambulance.');
        navigate('/login');
        return;
      }

      setPhase('dispatching');
      dispatch(
        setEmergencyLocation({
          lat,
          lng,
          address,
        })
      );

      try {
        const result = await triggerSOS({
          patientLat: lat,
          patientLng: lng,
          emergencyType: 'other' as EmergencyType,
          patientId: user._id,
        }).unwrap();

        dispatch(
          activateOneTapEmergency({
            requestId: result.data.requestId,
            dispatch: result.data,
            status: 'searching',
            patientLocation: { lat, lng },
          })
        );

        dispatch(closeEmergency());

        if (result.data.nearestHospital) {
          toast.success(
            `Ambulance dispatched — routing to ${result.data.nearestHospital.name as string}`
          );
        } else if (result.data.isDelayed) {
          toast.warn(`Ambulance assigned — ETA ${result.data.calculatedETA} min (traffic delay).`);
        } else {
          toast.success(`Ambulance on the way — ETA ${result.data.calculatedETA} min.`);
        }
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Could not dispatch ambulance. Call 108 immediately.'));
        setPhase('ready');
      }
    },
    [dispatch, navigate, triggerSOS, user?._id]
  );

  const captureAndDispatch = useCallback(() => {
    if (!navigator.geolocation) {
      setPhase('ready');
      toast.info('Enter your address below.');
      return;
    }
    setPhase('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setCoords({ lat, lng });
        void dispatchEmergency(lat, lng, address);
      },
      () => {
        setPhase('ready');
        toast.error('Location blocked — enter your address manually.');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, [dispatchEmergency]);

  useEffect(() => {
    if (user?._id) {
      captureAndDispatch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dispatch once when step mounts for logged-in patients
  }, [user?._id]);

  const hospital =
    nearestHospital ?? null;

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
            <li>Nearest available ambulance is dispatched to you</li>
            <li>You are routed to the closest hospital with emergency care</li>
            <li>Share live location with the driver until pickup</li>
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
            Hospital will be assigned automatically based on your GPS location.
          </p>
        )}

        {guest && (
          <p className="text-sm text-white/70">
            Contact: {guest.name} · {guest.phone}
          </p>
        )}
      </div>

      {(phase === 'locating' || phase === 'dispatching' || isLoading) && (
        <div className="flex flex-col items-center py-10 text-center">
          <Loader2 className="h-14 w-14 text-white animate-spin mb-4" />
          <p className="text-xl font-bold text-white">
            {phase === 'locating' ? 'Getting your location…' : 'Dispatching ambulance…'}
          </p>
          <p className="text-red-100 mt-2">Connecting to nearest ambulance & hospital</p>
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
            onClick={() => {
              const lat = coords?.lat ?? 19.076;
              const lng = coords?.lng ?? 72.8777;
              void dispatchEmergency(lat, lng, manualAddress);
            }}
          >
            Dispatch ambulance now
          </Button>
        </>
      )}

      {phase === 'ready' && user?._id && (
        <Button
          className="h-14 text-lg bg-white text-red-700 w-full"
          onClick={captureAndDispatch}
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
