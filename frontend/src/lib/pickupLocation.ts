/**
 * Resolves pickup coordinates for emergency flows.
 * Tries GPS first, then network/Wi‑Fi location (works on laptops). Never silently uses a wrong city.
 */
import { getGeolocationEnvironmentError, isGeolocationSupported } from './geolocationEnvironment';

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
      return 'GPS signal not available. Enter your address below, or move near a window and try again.';
    case err.TIMEOUT:
      return 'Location timed out. Enter your address below, or move near a window and try again.';
    default:
      return 'Could not get your location. Enter your address below or enable location in browser settings.';
  }
}

function positionToPickup(pos: GeolocationPosition, approximate: boolean): ResolvedPickup {
  const { latitude: lat, longitude: lng, accuracy } = pos.coords;
  const acc = accuracy != null ? ` (±${Math.round(accuracy)} m)` : '';
  const label = approximate ? 'Approximate location' : 'Your location';
  return {
    lat,
    lng,
    address: `${label} (${lat.toFixed(5)}, ${lng.toFixed(5)})${acc}`,
    fromGps: true,
  };
}

function getCurrentPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function watchForPosition(options: PositionOptions, maxWaitMs: number): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    let watchId: number | null = null;
    const timeoutId = setTimeout(() => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      reject(Object.assign(new Error('watch timeout'), { code: 3 }));
    }, maxWaitMs);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        clearTimeout(timeoutId);
        if (watchId != null) navigator.geolocation.clearWatch(watchId);
        resolve(pos);
      },
      (err) => {
        clearTimeout(timeoutId);
        if (watchId != null) navigator.geolocation.clearWatch(watchId);
        reject(err);
      },
      options
    );
  });
}

type LocateStrategy = {
  approximate: boolean;
  via: 'get' | 'watch';
  options: PositionOptions;
  waitMs: number;
};

/**
 * Tries GPS, then network/Wi‑Fi location. Laptops often fail only on high-accuracy GPS.
 */
async function tryLocateStrategies(maximumAgeMs: number): Promise<ResolvedPickup> {
  const strategies: LocateStrategy[] = [
    {
      approximate: false,
      via: 'get',
      waitMs: 12_000,
      options: { enableHighAccuracy: true, timeout: 12_000, maximumAge: maximumAgeMs },
    },
    {
      approximate: true,
      via: 'get',
      waitMs: 10_000,
      options: {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: Math.max(maximumAgeMs, 120_000),
      },
    },
    {
      approximate: true,
      via: 'watch',
      waitMs: 8_000,
      options: { enableHighAccuracy: false, timeout: 8_000, maximumAge: 60_000 },
    },
  ];

  let lastError: GeolocationPositionError | null = null;

  for (const strategy of strategies) {
    try {
      const pos =
        strategy.via === 'get'
          ? await getCurrentPosition(strategy.options)
          : await watchForPosition(strategy.options, strategy.waitMs);

      const { latitude: lat, longitude: lng } = pos.coords;
      if (isValidCoord(lat, lng)) {
        return positionToPickup(pos, strategy.approximate);
      }
    } catch (err) {
      const geoErr = err as GeolocationPositionError;
      if (geoErr?.code === geoErr?.PERMISSION_DENIED) {
        throw new GpsLocationError(geoErrorMessage(geoErr));
      }
      if (geoErr?.code != null) {
        lastError = geoErr;
      }
    }
  }

  if (lastError) {
    throw new GpsLocationError(geoErrorMessage(lastError));
  }

  throw new GpsLocationError(
    'Could not get your location. Enter your address manually or enable location access.'
  );
}

/**
 * Waits for a real device/network location fix. Does NOT substitute Hyderabad defaults unless allowFallback.
 */
export function resolvePickupLocation(options: GeolocationOptions = {}): Promise<ResolvedPickup> {
  const { timeoutMs = 22_000, maximumAgeMs = 30_000, allowFallback = false } = options;

  return new Promise((resolve, reject) => {
    const envError = getGeolocationEnvironmentError();
    if (envError) {
      reject(new GpsLocationError(envError));
      return;
    }

    if (!isGeolocationSupported()) {
      if (allowFallback) {
        resolve({ ...FALLBACK_PICKUP, fromGps: false });
      } else {
        reject(new GpsLocationError('Geolocation is not supported on this device.'));
      }
      return;
    }

    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (allowFallback) {
        resolve({ ...FALLBACK_PICKUP, fromGps: false });
      } else {
        reject(
          new GpsLocationError(
            'Could not get your location in time. Enter your address manually or try again near a window.'
          )
        );
      }
    }, timeoutMs);

    void tryLocateStrategies(maximumAgeMs)
      .then((result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        reject(err instanceof GpsLocationError ? err : new GpsLocationError(String(err)));
      });
  });
}

/** Real location for SOS — tries GPS then network; never uses wrong-city defaults */
export function resolveSosLocation(): Promise<ResolvedPickup> {
  return resolvePickupLocation({
    timeoutMs: 28_000,
    maximumAgeMs: 15_000,
    allowFallback: false,
  });
}
