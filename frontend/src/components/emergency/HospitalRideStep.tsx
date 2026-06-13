import { useCallback, useEffect, useRef, useState } from 'react';
import { Car, CheckCircle2, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import {
  setActiveBooking,
  setEmergencyLocation,
  setNearbyHospitals,
} from '@/features/emergency/emergencySlice';
import { useRequestTransportMutation, useLazyGetEmergencyNearbyHospitalsQuery } from '@/features/api/apiSlice';
import { resolvePickupLocation } from '@/lib/pickupLocation';
import { LazyRideLiveMap } from '@/components/emergency/LazyRideLiveMap';
import { HospitalSearchPicker } from '@/components/emergency/HospitalSearchPicker';
import type { EmergencyHospitalInfo } from '@/types';

const AUTO_VEHICLE = 'medical_cab';
const AUTO_VEHICLE_LABEL = 'Medical Cab';

function formatApiError(err: unknown): string {
  const e = err as {
    data?: { message?: string; errors?: { field: string; message: string }[] };
  };
  if (e.data?.errors?.length) {
    return e.data.errors.map((x) => x.message).join('. ');
  }
  return e.data?.message || 'Could not book ride. Please try again.';
}

function contactFromUser(phone?: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return '9876543210';
}

function nearestPickupTime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 10);
  d.setSeconds(0, 0);
  return d.toISOString();
}

export function HospitalRideStep() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { nearestHospital, nearbyHospitals, location: savedLocation } = useAppSelector((s) => s.emergency);

  const [pickup, setPickup] = useState<{ lat: number; lng: number } | null>(() =>
    savedLocation?.lat != null && savedLocation?.lng != null
      ? { lat: savedLocation.lat, lng: savedLocation.lng }
      : null
  );
  const [pickupAddress, setPickupAddress] = useState(savedLocation?.address ?? '');
  const [locating, setLocating] = useState(!pickup);
  const [usedGps, setUsedGps] = useState<boolean | null>(pickup ? true : null);

  const [selectedHospital, setSelectedHospital] = useState<EmergencyHospitalInfo | null>(
    nearestHospital ?? nearbyHospitals[0] ?? null
  );
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const bookedRef = useRef(false);

  const [fetchHospitals] = useLazyGetEmergencyNearbyHospitalsQuery();
  const [requestTransport] = useRequestTransportMutation();

  useEffect(() => {
    if (pickup) {
      setLocating(false);
      return;
    }

    let cancelled = false;
    setLocating(true);

    void resolvePickupLocation({ fallbackAfterMs: 5_000, timeoutMs: 10_000 }).then((resolved) => {
      if (cancelled) return;
      setPickup({ lat: resolved.lat, lng: resolved.lng });
      setPickupAddress(resolved.address);
      setUsedGps(resolved.fromGps);
      setLocating(false);
      dispatch(
        setEmergencyLocation({
          lat: resolved.lat,
          lng: resolved.lng,
          address: resolved.address,
        })
      );
      if (!resolved.fromGps) {
        toast.info('Using approximate location — enable GPS for exact pickup.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pickup, dispatch]);

  useEffect(() => {
    if (!pickup) return;

    let cancelled = false;
    setHospitalsLoading(true);

    void fetchHospitals({ lat: pickup.lat, lng: pickup.lng, radius: 50 })
      .unwrap()
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.hospitals ?? [];
        const nearest = list[0] ?? null;
        dispatch(setNearbyHospitals({ hospitals: list, nearest }));
        setSelectedHospital((prev) => prev ?? nearest);
      })
      .catch(() => {
        if (cancelled) return;
        dispatch(setNearbyHospitals({ hospitals: [], nearest: null }));
        toast.error('Could not find hospitals near you. Try refreshing your location.');
      })
      .finally(() => {
        if (!cancelled) setHospitalsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pickup, fetchHospitals, dispatch]);

  const hospitalMapPoint =
    selectedHospital?.coordinates?.lat != null && selectedHospital.coordinates?.lng != null
      ? {
          lat: selectedHospital.coordinates.lat,
          lng: selectedHospital.coordinates.lng,
          name: selectedHospital.name,
          address: selectedHospital.address,
        }
      : undefined;

  const startRide = useCallback(async () => {
    if (!pickup || bookedRef.current || booking) return;

    if (!selectedHospital) {
      toast.error('Please choose a hospital from the list.');
      return;
    }

    if (!user || user.userType !== 'patient') {
      toast.error('Sign in as a patient to book a hospital ride.');
      return;
    }

    bookedRef.current = true;
    setBooking(true);
    setBookError(null);

    try {
      const result = await requestTransport({
        vehicleType: AUTO_VEHICLE,
        scheduledAt: nearestPickupTime(),
        pickupLocation: {
          address: pickupAddress || 'Pickup location',
          coordinates: pickup,
        },
        destinationHospital: {
          name: selectedHospital.name,
          address: selectedHospital.address,
          coordinates: selectedHospital.coordinates ?? undefined,
        },
        conditionNotes: `Hospital ride to ${selectedHospital.name}`,
        patientDetails: {
          name: `${user.profile.firstName ?? ''} ${user.profile.lastName ?? ''}`.trim() || 'Patient',
          contactNumber: contactFromUser(user.phone),
          bookedFor: 'self' as const,
        },
      }).unwrap();

      const bookingRecord = result.data.booking;
      const bookingMongoId =
        typeof bookingRecord._id === 'string'
          ? bookingRecord._id
          : String((bookingRecord._id as { toString?: () => string })?.toString?.() ?? '');
      if (!bookingMongoId) {
        throw new Error('Invalid booking response from server');
      }
      dispatch(
        setActiveBooking({
          bookingId: bookingMongoId,
          trackingToken: bookingRecord.trackingToken,
        })
      );
      setBooked(true);
      toast.success(`${AUTO_VEHICLE_LABEL} confirmed — driver is being assigned`);
    } catch (err: unknown) {
      bookedRef.current = false;
      const msg = formatApiError(err);
      setBookError(msg);
      toast.error(msg);
    } finally {
      setBooking(false);
    }
  }, [
    pickup,
    pickupAddress,
    selectedHospital,
    requestTransport,
    dispatch,
    user,
    booking,
  ]);

  const retryLocation = () => {
    setPickup(null);
    setLocating(true);
    setUsedGps(null);
    bookedRef.current = false;
    setBookError(null);
  };

  const canStartRide = !!pickup && !!selectedHospital && !booking && !booked;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {pickup && (
        <LazyRideLiveMap
          pickup={pickup}
          hospital={hospitalMapPoint}
          vehicleType={AUTO_VEHICLE}
          className="h-[38vh] min-h-[200px] w-full shrink-0 border-b border-white/10"
          showOpenMaps
        />
      )}

      <div className="flex-1 overflow-y-auto p-5 sm:p-6 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/10 border border-sky-400/40 mb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/30">
            <Car className="h-7 w-7 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-200">Vehicle assigned</p>
            <p className="text-xl font-bold text-white">{AUTO_VEHICLE_LABEL}</p>
            <p className="text-sm text-sky-100/90 mt-0.5">Comfortable AC cab · non-emergency hospital visit</p>
          </div>
          {!booking && !locating && pickup && (
            <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" aria-hidden />
          )}
        </div>

        <div className="p-4 rounded-xl bg-sky-950/50 border border-white/10 mb-4">
          <p className="text-xs font-bold uppercase text-sky-200 mb-1 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            Your pickup
          </p>
          {locating ? (
            <p className="text-sm text-white/80 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Detecting your location…
            </p>
          ) : pickup ? (
            <>
              <p className="text-sm text-white leading-relaxed">{pickupAddress}</p>
              {usedGps === false && (
                <p className="text-xs text-amber-200 mt-2">Approximate location — allow GPS for exact pickup.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-amber-100">Could not detect location.</p>
          )}
          {!locating && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-9 text-white/80 hover:text-white hover:bg-white/10 gap-1.5 px-0"
              onClick={retryLocation}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh location
            </Button>
          )}
        </div>

        <div className="p-4 rounded-2xl bg-white/10 border border-white/15 mb-4">
          {hospitalsLoading ? (
            <p className="text-sm text-white/80 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading hospitals near you…
            </p>
          ) : nearbyHospitals.length === 0 ? (
            <p className="text-sm text-amber-100">
              No hospitals found within 50 km. Refresh your location or search for a hospital below.
            </p>
          ) : (
            <HospitalSearchPicker
              nearbyHospitals={nearbyHospitals}
              selected={selectedHospital}
              onSelect={(h) => {
                setSelectedHospital(h);
                setBookError(null);
                bookedRef.current = false;
              }}
            />
          )}
        </div>

        {bookError && (
          <div className="p-3 rounded-xl bg-red-500/20 border border-red-400/40 text-red-100 text-sm mb-4">
            {bookError}
          </div>
        )}

        {booking && (
          <div className="flex flex-col items-center gap-3 py-4 text-white">
            <Loader2 className="h-10 w-10 animate-spin text-sky-200" />
            <p className="text-lg font-semibold">Starting your ride…</p>
          </div>
        )}

        {!booking && !booked && (
          <Button
            size="lg"
            className="w-full h-14 text-lg bg-white text-sky-800 hover:bg-sky-50 font-bold disabled:opacity-50"
            disabled={!canStartRide}
            onClick={() => void startRide()}
          >
            {!pickup
              ? 'Waiting for location…'
              : !selectedHospital
                ? 'Select a hospital'
                : bookError
                  ? 'Start ride again'
                  : 'Start ride'}
          </Button>
        )}
      </div>
    </div>
  );
}
