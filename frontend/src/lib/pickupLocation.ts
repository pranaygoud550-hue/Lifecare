/** Default map center when GPS is unavailable (Hyderabad — matches demo hospitals in seed). */
export const FALLBACK_PICKUP = {
  lat: 17.385,
  lng: 78.4867,
  address: 'Hyderabad area (approximate location)',
} as const;

export type PickupCoords = { lat: number; lng: number };

export type ResolvedPickup = PickupCoords & { address: string; fromGps: boolean };

type GeolocationOptions = {
  timeoutMs?: number;
  fallbackAfterMs?: number;
  maximumAgeMs?: number;
};

/**
 * Resolves pickup coordinates: tries GPS, then optional fallback after timeout.
 */
export function resolvePickupLocation(
  options: GeolocationOptions = {}
): Promise<ResolvedPickup> {
  const {
    timeoutMs = 12_000,
    fallbackAfterMs = 6_000,
    maximumAgeMs = 120_000,
  } = options;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: ResolvedPickup) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const useFallback = (fromGps: boolean) =>
      finish({
        lat: FALLBACK_PICKUP.lat,
        lng: FALLBACK_PICKUP.lng,
        address: FALLBACK_PICKUP.address,
        fromGps,
      });

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      useFallback(false);
      return;
    }

    const fallbackTimer = window.setTimeout(() => useFallback(false), fallbackAfterMs);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(fallbackTimer);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        finish({
          lat,
          lng,
          address: `Your location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          fromGps: true,
        });
      },
      () => {
        window.clearTimeout(fallbackTimer);
        useFallback(false);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: maximumAgeMs }
    );
  });
}
