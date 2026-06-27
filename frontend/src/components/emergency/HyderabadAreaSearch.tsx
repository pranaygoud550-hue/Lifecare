import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Crosshair, Loader2, MapPin, Navigation, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  HYDERABAD_SERVICE_LABEL,
  areaToDisplayName,
  resolveHyderabadArea,
  searchHyderabadAreas,
  type HyderabadArea,
} from '@/data/hyderabadAreas';
import {
  useLazyGeocodeEmergencyAddressQuery,
  useLazyReverseGeocodeEmergencyQuery,
  useLazySearchEmergencyAddressesQuery,
} from '@/features/api/apiSlice';
import { GpsLocationError, resolveSosLocation } from '@/lib/pickupLocation';

export type HyderabadAreaSelection = {
  area?: HyderabadArea;
  lat: number;
  lng: number;
  address: string;
  landmark?: string;
};

interface HyderabadAreaSearchProps {
  value?: string;
  onSelect: (selection: HyderabadAreaSelection) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  label?: string;
  showLandmark?: boolean;
  requireLandmark?: boolean;
  showGpsButton?: boolean;
  /** Auto-detect GPS on mount when no value is set */
  autoDetectOnMount?: boolean;
}

type StreetSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  kind?: 'address' | 'establishment';
};

function resolveSuggestionLocally(suggestion: StreetSuggestion): HyderabadArea | null {
  return (
    resolveHyderabadArea(suggestion.mainText) ||
    resolveHyderabadArea(suggestion.description.split(',')[0]?.trim() ?? '')
  );
}

export function HyderabadAreaSearch({
  value = '',
  onSelect,
  placeholder = 'Search city or area in Telangana…',
  className,
  inputClassName,
  label,
  showLandmark = true,
  requireLandmark = false,
  showGpsButton = true,
  autoDetectOnMount = false,
}: HyderabadAreaSearchProps) {
  const [query, setQuery] = useState(value);
  const [lastExternalValue, setLastExternalValue] = useState(value);
  if (value !== lastExternalValue) {
    setLastExternalValue(value);
    setQuery(value);
  }
  const [landmark, setLandmark] = useState('');
  const [selectedArea, setSelectedArea] = useState<HyderabadArea | null>(null);
  const [pendingPickup, setPendingPickup] = useState<{
    lat: number;
    lng: number;
    displayName: string;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [streetSuggestions, setStreetSuggestions] = useState<StreetSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const autoDetectRan = useRef(false);

  const [fetchSuggestions] = useLazySearchEmergencyAddressesQuery();
  const [geocodeAddress] = useLazyGeocodeEmergencyAddressQuery();
  const [reverseGeocode] = useLazyReverseGeocodeEmergencyQuery();

  const localResults = useMemo(
    () => (query.trim().length >= 2 ? searchHyderabadAreas(query, 8) : []),
    [query]
  );

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) {
      const clearTimer = setTimeout(() => setStreetSuggestions([]), 0);
      return () => clearTimeout(clearTimer);
    }

    const timer = setTimeout(() => {
      setSearching(true);
      void fetchSuggestions(q)
        .unwrap()
        .then((res) => {
          setStreetSuggestions(res.data?.suggestions ?? []);
        })
        .catch(() => {
          setStreetSuggestions([]);
        })
        .finally(() => setSearching(false));
    }, 280);

    return () => clearTimeout(timer);
  }, [query, open, fetchSuggestions]);

  const confirmArea = (area: HyderabadArea, withLandmark?: string) => {
    const lm = (withLandmark ?? landmark).trim();
    if (requireLandmark && !lm) return;
    const address = areaToDisplayName(area, lm);
    onSelect({
      area,
      lat: area.lat,
      lng: area.lng,
      address,
      landmark: lm || undefined,
    });
    if (!withLandmark) {
      setSelectedArea(area);
    }
  };

  const confirmCoords = (
    lat: number,
    lng: number,
    displayName: string,
    area?: HyderabadArea,
    withLandmark?: string
  ) => {
    const detail = (withLandmark ?? landmark).trim();
    if (requireLandmark && !detail) return;
    const address = detail ? `${detail}, ${displayName}` : displayName;
    onSelect({ area, lat, lng, address, landmark: detail || undefined });
    setQuery(displayName);
    if (!withLandmark) {
      setPendingPickup({ lat, lng, displayName });
    }
  };

  const pickArea = (area: HyderabadArea) => {
    setQuery(area.name);
    setPendingPickup(null);
    setOpen(false);
    setLandmark('');
    confirmArea(area);
    if (!showLandmark) {
      setSelectedArea(null);
    }
  };

  const resolveCoords = async (
    placeId?: string,
    addressText?: string
  ): Promise<{ lat: number; lng: number; displayName: string } | null> => {
    if (placeId || addressText) {
      try {
        const res = await geocodeAddress({
          placeId: placeId || undefined,
          address: addressText || undefined,
        }).unwrap();
        if (res.data) return res.data;
      } catch {
        /* try fallbacks */
      }
    }

    if (addressText) {
      const local =
        resolveHyderabadArea(addressText) ||
        resolveHyderabadArea(addressText.split(',')[0]?.trim() ?? '');
      if (local) {
        return { lat: local.lat, lng: local.lng, displayName: areaToDisplayName(local) };
      }
    }

    return null;
  };

  const pickStreet = async (suggestion: StreetSuggestion) => {
    setQuery(suggestion.description);
    setSelectedArea(null);
    setOpen(false);

    const local = resolveSuggestionLocally(suggestion);
    if (local) {
      pickArea(local);
      return;
    }

    setGeocoding(true);
    try {
      const data = await resolveCoords(suggestion.placeId, suggestion.description);
      if (!data) throw new Error('No result');
      setLandmark('');
      confirmCoords(data.lat, data.lng, data.displayName);
      if (!showLandmark) {
        setPendingPickup(null);
      }
    } catch {
      const fallback = resolveSuggestionLocally(suggestion);
      if (fallback) {
        pickArea(fallback);
      } else {
        toast.error('Could not resolve that address. Try another suggestion.');
      }
    } finally {
      setGeocoding(false);
    }
  };

  const geocodeFreeText = async () => {
    const q = query.trim();
    if (!q) return;

    const local = resolveHyderabadArea(q) || resolveHyderabadArea(q.split(',')[0]?.trim() ?? '');
    if (local) {
      pickArea(local);
      return;
    }

    setGeocoding(true);
    setOpen(false);
    try {
      const data = await resolveCoords(undefined, q);
      if (!data) throw new Error('No result');
      setLandmark('');
      confirmCoords(data.lat, data.lng, data.displayName);
      if (!showLandmark) {
        setPendingPickup(null);
      }
    } catch {
      toast.error(
        `Could not find "${q}" in ${HYDERABAD_SERVICE_LABEL}. Try a city, colony, or landmark.`
      );
    } finally {
      setGeocoding(false);
    }
  };

  const handleCurrentLocation = async () => {
    setGeocoding(true);
    setOpen(false);
    try {
      const gps = await resolveSosLocation();
      let lat = gps.lat;
      let lng = gps.lng;
      let displayName = gps.address;

      try {
        const res = await reverseGeocode({ lat: gps.lat, lng: gps.lng }).unwrap();
        if (res.data?.displayName) {
          lat = res.data.lat;
          lng = res.data.lng;
          displayName = res.data.displayName;
        }
      } catch {
        /* GPS coords still valid */
      }

      setQuery(displayName);
      setLandmark('');
      confirmCoords(lat, lng, displayName);
      if (!showLandmark) {
        setPendingPickup(null);
      }
      toast.success('Location detected — nearest hospital loading.');
    } catch (err) {
      const msg =
        err instanceof GpsLocationError
          ? err.message
          : 'Could not detect your location. Allow GPS or search your area below.';
      toast.error(msg);
    } finally {
      setGeocoding(false);
    }
  };

  useEffect(() => {
    if (!autoDetectOnMount || autoDetectRan.current || value.trim()) return;
    autoDetectRan.current = true;
    void handleCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [autoDetectOnMount, value]);

  const shopSuggestions = useMemo(
    () => streetSuggestions.filter((s) => s.kind === 'establishment'),
    [streetSuggestions]
  );
  const addressSuggestions = useMemo(
    () => streetSuggestions.filter((s) => s.kind !== 'establishment'),
    [streetSuggestions]
  );

  const renderSuggestion = (s: StreetSuggestion) => (
    <button
      key={s.placeId}
      type="button"
      className="w-full text-left px-3 py-2.5 hover:bg-muted/80 border-b border-border/50 flex gap-2 min-w-0"
      onClick={() => void pickStreet(s)}
    >
      <Navigation className="h-4 w-4 shrink-0 mt-0.5 text-primary opacity-70" />
      <span className="min-w-0 flex-1">
        <span className="font-medium text-sm block truncate">{s.mainText}</span>
        {s.secondaryText && (
          <span className="text-xs text-muted block truncate">{s.secondaryText}</span>
        )}
      </span>
    </button>
  );

  const canConfirm = !requireLandmark || landmark.trim().length >= 3;
  const trimmedQuery = query.trim();
  const showDropdown = open && trimmedQuery.length >= 2;
  const hasResults = localResults.length > 0 || streetSuggestions.length > 0;

  return (
    <div ref={wrapperRef} className={cn('space-y-2 min-w-0', className)}>
      {label && <p className="text-sm font-medium text-inherit">{label}</p>}

      {showGpsButton && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={geocoding}
          onClick={() => void handleCurrentLocation()}
          className="h-9 gap-2 border-white/25 bg-white/10 text-white hover:bg-white/20 text-xs sm:text-sm"
        >
          <Crosshair className="h-4 w-4 shrink-0" />
          Use my current location
        </Button>
      )}

      <div className="relative min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60 z-10" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedArea(null);
            setPendingPickup(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (streetSuggestions[0]) void pickStreet(streetSuggestions[0]);
              else if (localResults[0]) pickArea(localResults[0]);
              else void geocodeFreeText();
            }
          }}
          placeholder={placeholder}
          className={cn('pl-10 pr-10 truncate', inputClassName)}
          autoComplete="off"
          disabled={geocoding}
        />
        {(searching || geocoding) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin opacity-60" />
        )}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-80 overflow-y-auto rounded-lg border border-border bg-card shadow-xl">
            {shopSuggestions.length > 0 && (
              <div>
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border/50">
                  Landmarks & shops
                </p>
                {shopSuggestions.map(renderSuggestion)}
              </div>
            )}

            {addressSuggestions.length > 0 && (
              <div>
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border/50">
                  Streets & addresses
                </p>
                {addressSuggestions.map(renderSuggestion)}
              </div>
            )}

            {localResults.length > 0 && (
              <div>
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border/50">
                  Cities & areas
                </p>
                {localResults.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    className="w-full text-left px-3 py-2.5 hover:bg-muted/80 border-b border-border/50 last:border-0 flex gap-2 min-w-0"
                    onClick={() => pickArea(area)}
                  >
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted" />
                    <span className="min-w-0 truncate">
                      <span className="font-medium text-sm">{area.name}</span>
                      <span className="text-xs text-muted ml-2">{area.zone}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!searching && !hasResults && (
              <p className="px-3 py-3 text-sm text-muted break-words">
                No matches — press Enter to search &quot;{trimmedQuery}&quot;
              </p>
            )}

            {!searching && (
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm font-medium text-primary hover:bg-muted/80 border-t border-border/50 truncate"
                onClick={() => void geocodeFreeText()}
              >
                Search &quot;{trimmedQuery}&quot; on map
              </button>
            )}
          </div>
        )}
      </div>

      {showLandmark && (selectedArea || pendingPickup) && (
        <div className="space-y-2 pt-1 rounded-lg border border-white/15 bg-white/5 p-3 min-w-0">
          <div className="flex items-start gap-2 text-xs text-inherit opacity-90 min-w-0">
            <Building2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span className="min-w-0 break-words line-clamp-2">
              <strong>{selectedArea?.name ?? pendingPickup?.displayName}</strong> selected — nearest
              hospital loading below
            </span>
          </div>
          <Label className="text-xs text-inherit opacity-90">
            Flat / building / gate (optional — for exact pickup)
          </Label>
          <Input
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="e.g. Flat 402, near metro gate"
            className={cn('h-10 bg-white/95 text-slate-900', inputClassName)}
            autoFocus
          />
          <button
            type="button"
            disabled={!canConfirm || geocoding}
            onClick={() => {
              if (selectedArea) confirmArea(selectedArea, landmark);
              else if (pendingPickup) {
                confirmCoords(
                  pendingPickup.lat,
                  pendingPickup.lng,
                  pendingPickup.displayName,
                  undefined,
                  landmark
                );
              }
              if (!requireLandmark) {
                setSelectedArea(null);
                setPendingPickup(null);
                setLandmark('');
              }
            }}
            className="w-full rounded-lg bg-white text-slate-900 font-semibold py-2.5 text-sm hover:bg-white/90 disabled:opacity-50"
          >
            {landmark.trim() ? 'Update pickup details' : 'Skip — pickup confirmed'}
          </button>
        </div>
      )}
    </div>
  );
}
