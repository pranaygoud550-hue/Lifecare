import { useCallback, useEffect, useRef, useState } from 'react';

export interface EmergencyLocation {
  lat: number;
  lng: number;
  accuracy: number | null;
}

interface UseEmergencyLocationResult {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  isLoading: boolean;
  error: string | null;
}

const PERMISSION_DENIED_MESSAGE =
  'Location access is blocked. Enable location in your browser settings so we can send help to you.';

export function useEmergencyLocation(enabled = true, watch = false): UseEmergencyLocationResult {
  const [location, setLocation] = useState<EmergencyLocation | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const lastKnownRef = useRef<EmergencyLocation | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const applyPosition = useCallback((position: GeolocationPosition) => {
    const next: EmergencyLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy ?? null,
    };
    lastKnownRef.current = next;
    setLocation(next);
    setIsLoading(false);
    setError(null);
  }, []);

  const handleGeoError = useCallback((geoError: GeolocationPositionError) => {
    if (geoError.code === geoError.PERMISSION_DENIED) {
      setError(PERMISSION_DENIED_MESSAGE);
      setIsLoading(false);
      return;
    }

    if (lastKnownRef.current) {
      setLocation(lastKnownRef.current);
      setError('GPS signal weak — using last known location.');
      setIsLoading(false);
      return;
    }

    setError(
      geoError.code === geoError.TIMEOUT
        ? 'Location timed out. Move near a window and try again.'
        : 'Unable to get your location right now.'
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    navigator.geolocation.getCurrentPosition(applyPosition, handleGeoError, {
      enableHighAccuracy: watch,
      timeout: 15000,
      maximumAge: watch ? 5000 : 30000,
    });

    if (watch) {
      watchIdRef.current = navigator.geolocation.watchPosition(applyPosition, handleGeoError, {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000,
      });
    }

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, watch, applyPosition, handleGeoError]);

  return {
    lat: location?.lat ?? null,
    lng: location?.lng ?? null,
    accuracy: location?.accuracy ?? null,
    isLoading,
    error,
  };
}
