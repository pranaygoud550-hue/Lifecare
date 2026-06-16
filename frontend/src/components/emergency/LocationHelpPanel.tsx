import { ExternalLink, MapPin, ShieldAlert, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getGeolocationEnvironmentError,
  isLikelyInAppBrowser,
  isSecureGeolocationContext,
} from '@/lib/geolocationEnvironment';

const LIVE_APP_URL = 'https://lifecare-frontend-navy.vercel.app';

interface LocationHelpPanelProps {
  errorMessage?: string | null;
  className?: string;
  compact?: boolean;
}

/** Step-by-step help when GPS fails or the browser blocks location. */
export function LocationHelpPanel({ errorMessage, className = '', compact = false }: LocationHelpPanelProps) {
  const envError = getGeolocationEnvironmentError();
  const showHttps = !isSecureGeolocationContext() && typeof window !== 'undefined';

  return (
    <div
      className={`rounded-xl border border-amber-400/40 bg-amber-950/30 p-4 text-left text-sm text-amber-50 ${className}`}
      role="note"
    >
      <p className="font-semibold flex items-center gap-2 text-amber-100 mb-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        Location not working?
      </p>

      {(errorMessage || envError) && (
        <p className="text-amber-100/90 mb-3">{envError || errorMessage}</p>
      )}

      <ol className="list-decimal list-inside space-y-2 text-amber-100/90">
        {showHttps && (
          <li>
            Use <strong>HTTPS</strong> — GPS does not work on <code className="text-xs">http://</code> sites.
          </li>
        )}
        <li>
          Click the <strong>lock icon</strong> beside the URL → <strong>Location → Allow</strong> → refresh.
        </li>
        {isLikelyInAppBrowser() && (
          <li>
            Open in <strong>Chrome or Safari</strong> (not Instagram / WhatsApp browser).
          </li>
        )}
        <li className="flex items-start gap-1.5">
          <Smartphone className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Best on a <strong>phone</strong> with Wi‑Fi + location enabled (laptops use approximate Wi‑Fi
            position).
          </span>
        </li>
        <li className="flex items-start gap-1.5">
          <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Or type your <strong>address / landmark</strong> below — dispatch still works.</span>
        </li>
      </ol>

      {!compact && showHttps && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 w-full border-amber-400/50 text-amber-50 hover:bg-amber-900/40"
          onClick={() => {
            window.location.href = LIVE_APP_URL;
          }}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open secure app (HTTPS)
        </Button>
      )}

      <a
        href="tel:108"
        className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
      >
        Call national emergency 108
      </a>
    </div>
  );
}
