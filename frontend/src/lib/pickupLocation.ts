/**
 * Resolves pickup coordinates for emergency flows.
 * SOS uses real GPS only — never silently substitutes a wrong city.
 */
export const FALLBACK_PICKUP = {
  lat: 17.385,
  lng: 78.4867,
  address: 'Location unavailable — enable GPS or enter your address',
} as const;

export type PickupCoords = { lat: number; lng: number };

export type ResolvedPickup = PickupCoords & { address: string; fromGps: boolean };

export class GpsLocationError extends Error {
  constructor(message = 'Could not detect your location. Enable GPS and try again.') {
    super(message);
    this.name = 'GpsLocationError';
  }
}

type GeolocationOptions = {
  timeoutMs?: number;
  maximumAgeMs?: number;
  /** If false (default for SOS), reject instead of using a wrong-city fallback */
  allowFallback?: boolean;
};

function isValidCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function geoErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Location access was denied. Click the lock icon in your browser address bar, allow location, and try again.';
    case err.POSITION_UNAVAILABLE:
      return 'GPS signal not available. Move outdoors or near a window, or enter your address manually.';
    case err.TIMEOUT:
      return 'Location timed out. Move near a window or outdoors and try again.';
    default:
      return 'Could not get your GPS location. Please enable location access in your browser settings and try again.';
  }
}

/**
 * Waits for an accurate GPS fix. Does NOT resolve early with Hyderabad/Mumbai defaults.
 */
export function resolvePickupLocation(options: GeolocationOptions = {}): Promise<ResolvedPickup> {
  const {
    timeoutMs = 22_000,
    maximumAgeMs = 30_000,
    allowFallback = false,
  } = options;

  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      if (allowFallback) {
        resolve({ ...FALLBACK_PICKUP, fromGps: false });
      } else {
        reject(new GpsLocationError('Geolocation is not supported on this device.'));
      }
      return;
    }

    let settled = false;
    let watchId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let getCurrentFailed = false;
    let watchFailed = false;
    const startedAt = Date.now();

    const cleanup = () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      if (timeoutId != null) clearTimeout(timeoutId);
    };

    const handleGeoError = (source: 'get' | 'watch') => (err: GeolocationPositionError) => {
      if (settled) return;

      if (err.code === err.PERMISSION_DENIED) {
        settled = true;
        cleanup();
        reject(new GpsLocationError(geoErrorMessage(err)));
        return;
      }

      if (source === 'get') getCurrentFailed = true;
      else watchFailed = true;

      if (getCurrentFailed && watchFailed && err.code !== err.TIMEOUT) {
        settled = true;
        cleanup();
        reject(new GpsLocationError(geoErrorMessage(err)));
      }
    };

    const finishGps = (lat: number, lng: number, accuracy?: number) => {
      if (settled || !isValidCoord(lat, lng)) return;
      settled = true;
      cleanup();
      const acc = accuracy != null ? ` (±${Math.round(accuracy)} m)` : '';
      resolve({
        lat,
        lng,
        address: `Your location (${lat.toFixed(5)}, ${lng.toFixed(5)})${acc}`,
        fromGps: true,
      });
    };

    const finishFallback = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (allowFallback) {
        resolve({ ...FALLBACK_PICKUP, fromGps: false });
      } else {
        reject(
          new GpsLocationError(
            'Could not get your GPS location. Please enable location access in your browser settings and try again.'
          )
        );
      }
    };

    timeoutId = setTimeout(finishFallback, timeoutMs);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if (!isValidCoord(lat, lng)) return;
        const elapsed = Date.now() - startedAt;
        if (accuracy <= 150 || elapsed >= 4000) {
          finishGps(lat, lng, accuracy);
        }
      },
      handleGeoError('watch'),
      { enableHighAccuracy: true, maximumAge: maximumAgeMs, timeout: timeoutMs }
    );

    navigator.geolocation.getCurrentPosition(
      (pos) => finishGps(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      handleGeoError('get'),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: maximumAgeMs }
    );
  });
}

/** Strict GPS for SOS — never substitute wrong-city defaults */
export function resolveSosLocation(): Promise<ResolvedPickup> {
  return resolvePickupLocation({
    timeoutMs: 25_000,
    maximumAgeMs: 15_000,
    allowFallback: false,
  });
}
