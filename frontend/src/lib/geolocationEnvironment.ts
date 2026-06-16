/**
 * Geolocation environment checks — browsers block GPS off HTTPS / in-app webviews.
 */

export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.geolocation;
}

export function isSecureGeolocationContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext === true;
}

/** Returns a user-facing blocker message, or null if the environment can request location. */
export function getGeolocationEnvironmentError(): string | null {
  if (typeof window === 'undefined') return null;

  if (!isSecureGeolocationContext()) {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return null;
    return (
      'GPS requires a secure connection (HTTPS). ' +
      'Open https://lifecare-frontend-navy.vercel.app — not http:// or a raw IP address.'
    );
  }

  if (!isGeolocationSupported()) {
    return 'This browser does not support location services.';
  }

  const ua = navigator.userAgent || '';
  if (/Instagram|FBAN|FBAV|WhatsApp|Line\//i.test(ua)) {
    return (
      'In-app browsers (Instagram, WhatsApp, Facebook) often block GPS. ' +
      'Tap ⋯ → Open in Chrome or Safari for emergency services.'
    );
  }

  return null;
}

export function isLikelyInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Instagram|FBAN|FBAV|WhatsApp|Line\//i.test(navigator.userAgent || '');
}
