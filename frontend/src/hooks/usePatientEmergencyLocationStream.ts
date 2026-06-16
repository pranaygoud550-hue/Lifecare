import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { updatePatientLocation } from '@/features/emergency/emergencySlice';
import { emitPatientEmergencyLocation } from '@/lib/socket';

const STREAM_INTERVAL_MS = 8_000;

/** Streams live patient GPS to backend during an active SOS (every ~8s). */
export function usePatientEmergencyLocationStream() {
  const dispatch = useAppDispatch();
  const { isActive, requestId } = useAppSelector((s) => s.emergency);
  const watchIdRef = useRef<number | null>(null);
  const lastEmitRef = useRef(0);

  useEffect(() => {
    if (!isActive || !requestId || typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    const emitIfDue = (lat: number, lng: number) => {
      const now = Date.now();
      if (now - lastEmitRef.current < STREAM_INTERVAL_MS) return;
      lastEmitRef.current = now;
      emitPatientEmergencyLocation(requestId, lat, lng);
      dispatch(updatePatientLocation({ lat, lng }));
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        emitIfDue(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        /* manual address may have been used */
      },
      { enableHighAccuracy: false, maximumAge: 15_000, timeout: 12_000 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        emitIfDue(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        /* keep last known */
      },
      { enableHighAccuracy: true, maximumAge: STREAM_INTERVAL_MS, timeout: 15_000 }
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [dispatch, isActive, requestId]);
}
