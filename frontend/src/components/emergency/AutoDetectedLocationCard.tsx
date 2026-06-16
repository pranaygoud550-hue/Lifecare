import { Crosshair, Loader2, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AutoDetectStatus } from '@/hooks/useEmergencyAutoDetect';
import type { GeoLocation } from '@/features/emergency/emergencySlice';

interface AutoDetectedLocationCardProps {
  status: AutoDetectStatus;
  location: GeoLocation | null;
  error: string | null;
  onRetry: () => void;
  className?: string;
}

export function AutoDetectedLocationCard({
  status,
  location,
  error,
  onRetry,
  className = '',
}: AutoDetectedLocationCardProps) {
  if (status === 'detecting') {
    return (
      <div
        className={`flex items-center gap-3 p-4 rounded-xl bg-emerald-500/15 border border-emerald-400/40 ${className}`}
      >
        <Loader2 className="h-5 w-5 animate-spin text-emerald-300 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-100">Auto-detecting your location…</p>
          <p className="text-xs text-emerald-200/80 mt-0.5">
            GPS + nearest shop/street — no typing needed in an emergency
          </p>
        </div>
      </div>
    );
  }

  if (status === 'ready' && location) {
    return (
      <div
        className={`p-4 rounded-xl bg-emerald-500/20 border-2 border-emerald-400/50 ${className}`}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-300 mb-1 flex items-center gap-1">
          <Crosshair className="h-3.5 w-3.5" />
          Your location detected
        </p>
        <p className="text-sm font-semibold text-white flex items-start gap-2 min-w-0">
          <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-emerald-300" />
          <span className="break-words line-clamp-3">{location.address}</span>
        </p>
        <p className="text-xs text-emerald-100/80 mt-2">
          Ambulance & nearest hospital will use this exact spot (restaurant, road, or building).
        </p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div
        className={`p-4 rounded-xl bg-amber-500/15 border border-amber-400/40 ${className}`}
      >
        <p className="text-sm font-medium text-amber-100 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="break-words">
            {error ?? 'GPS unavailable — search your shop or street below, or allow location access.'}
          </span>
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3 border-amber-300/40 text-amber-50 hover:bg-amber-500/20"
          onClick={onRetry}
        >
          <Crosshair className="h-4 w-4 mr-1.5" />
          Try auto-detect again
        </Button>
      </div>
    );
  }

  return null;
}
