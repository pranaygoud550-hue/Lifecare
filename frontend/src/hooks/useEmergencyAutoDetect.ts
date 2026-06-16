import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import {
  useLazyGetEmergencyNearbyHospitalsQuery,
  useLazyReverseGeocodeEmergencyQuery,
} from '@/features/api/apiSlice';
import {
  setEmergencyLocation,
  setNearbyHospitals,
} from '@/features/emergency/emergencySlice';
import { GpsLocationError, resolveSosLocation } from '@/lib/pickupLocation';

export type AutoDetectStatus = 'idle' | 'detecting' | 'ready' | 'failed';

const HOSPITAL_RADIUS_KM = 15;

/**
 * Auto-detect pickup via GPS + reverse geocode (shop/street name), then load nearest hospital.
 * Used when user opens emergency flows — no manual typing required for accidents.
 */
export function useEmergencyAutoDetect(options?: { autoRun?: boolean }) {
  const dispatch = useAppDispatch();
  const savedLocation = useAppSelector((s) => s.emergency.location);
  const [status, setStatus] = useState<AutoDetectStatus>(
    savedLocation?.lat != null && savedLocation?.lng != null ? 'ready' : 'idle'
  );
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ranRef = useRef(false);

  const [reverseGeocode] = useLazyReverseGeocodeEmergencyQuery();
  const [fetchHospitals] = useLazyGetEmergencyNearbyHospitalsQuery();

  const loadHospitals = useCallback(
    async (lat: number, lng: number) => {
      setHospitalsLoading(true);
      try {
        const res = await fetchHospitals({ lat, lng, radius: HOSPITAL_RADIUS_KM }).unwrap();
        const list = res.data?.hospitals ?? [];
        dispatch(setNearbyHospitals({ hospitals: list, nearest: list[0] ?? null }));
        return list[0] ?? null;
      } catch {
        return null;
      } finally {
        setHospitalsLoading(false);
      }
    },
    [dispatch, fetchHospitals]
  );

  const applyDetected = useCallback(
    async (lat: number, lng: number, address: string) => {
      dispatch(setEmergencyLocation({ lat, lng, address }));
      await loadHospitals(lat, lng);
      setStatus('ready');
      setError(null);
      return { lat, lng, address };
    },
    [dispatch, loadHospitals]
  );

  const detect = useCallback(async () => {
    if (savedLocation?.lat != null && savedLocation?.lng != null) {
      setStatus('ready');
      if (!hospitalsLoading) {
        await loadHospitals(savedLocation.lat, savedLocation.lng);
      }
      return savedLocation;
    }

    setStatus('detecting');
    setError(null);

    try {
      const gps = await resolveSosLocation();
      let lat = gps.lat;
      let lng = gps.lng;
      let address = gps.address;

      try {
        const res = await reverseGeocode({ lat: gps.lat, lng: gps.lng }).unwrap();
        if (res.data?.displayName) {
          lat = res.data.lat;
          lng = res.data.lng;
          address = res.data.displayName;
        }
      } catch {
        /* GPS coords still valid */
      }

      return await applyDetected(lat, lng, address);
    } catch (err) {
      setStatus('failed');
      const msg =
        err instanceof GpsLocationError
          ? err.message
          : 'Could not detect your location automatically.';
      setError(msg);
      return null;
    }
  }, [applyDetected, hospitalsLoading, loadHospitals, reverseGeocode, savedLocation]);

  useEffect(() => {
    if (!options?.autoRun || ranRef.current) return;
    ranRef.current = true;
    void detect();
  }, [options?.autoRun, detect]);

  const hasLocation = savedLocation?.lat != null && savedLocation?.lng != null;

  return {
    status,
    error,
    hasLocation,
    location: savedLocation,
    hospitalsLoading,
    detect,
    applyDetected,
    loadHospitals,
  };
}
