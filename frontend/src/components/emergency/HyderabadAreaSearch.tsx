import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Loader2, MapPin, Navigation, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  HYDERABAD_AREAS,
  HYDERABAD_SERVICE_LABEL,
  areaToDisplayName,
  resolveHyderabadArea,
  searchHyderabadAreas,
  type HyderabadArea,
} from '@/data/hyderabadAreas';
import {
  useLazyGeocodeEmergencyAddressQuery,
  useLazySearchEmergencyAddressesQuery,
} from '@/features/api/apiSlice';

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
  showPopular?: boolean;
  /** Show flat/building field — recommended for apartments */
  showLandmark?: boolean;
  /** If true, user must enter landmark before confirming */
  requireLandmark?: boolean;
}

const POPULAR_IDS = [
  'madhapur',
  'gachibowli',
  'hitech-city',
  'kukatpally',
  'kphb',
  'lb-nagar',
  'secunderabad',
  'banjara-hills',
  'dilsukhnagar',
  'miyapur',
  'kondapur',
  'habsiguda',
  'nizampet',
  'sainikpuri',
  'kompally',
  'medchal',
];

type StreetSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export function HyderabadAreaSearch({
  value = '',
  onSelect,
  placeholder = 'Type your street, colony, or area — Madhapur, Kompally, Secunderabad…',
  className,
  inputClassName,
  label,
  showPopular = true,
  showLandmark = true,
  requireLandmark = false,
}: HyderabadAreaSearchProps) {
  const [query, setQuery] = useState(value);
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

  const [fetchSuggestions] = useLazySearchEmergencyAddressesQuery();
  const [geocodeAddress] = useLazyGeocodeEmergencyAddressQuery();

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const localResults = useMemo(() => searchHyderabadAreas(query, 12), [query]);

  const popular = useMemo(
    () => POPULAR_IDS.map((id) => HYDERABAD_AREAS.find((a) => a.id === id)).filter(Boolean) as HyderabadArea[],
    []
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
      setStreetSuggestions([]);
      return;
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

  const confirmArea = (area: HyderabadArea) => {
    if (requireLandmark && !landmark.trim()) return;
    const address = areaToDisplayName(area, landmark);
    onSelect({
      area,
      lat: area.lat,
      lng: area.lng,
      address,
      landmark: landmark.trim() || undefined,
    });
    setSelectedArea(null);
    setPendingPickup(null);
    setLandmark('');
    setOpen(false);
  };

  const confirmCoords = (
    lat: number,
    lng: number,
    displayName: string,
    area?: HyderabadArea
  ) => {
    if (requireLandmark && !landmark.trim()) return;
    const detail = landmark.trim();
    const address = detail ? `${detail}, ${displayName}` : displayName;
    onSelect({ area, lat, lng, address, landmark: detail || undefined });
    setSelectedArea(null);
    setPendingPickup(null);
    setLandmark('');
    setQuery(displayName);
    setOpen(false);
  };

  const pickArea = (area: HyderabadArea) => {
    setQuery(area.name);
    setSelectedArea(area);
    setPendingPickup(null);
    setOpen(false);
    if (!showLandmark) {
      confirmArea(area);
    }
  };

  const pickStreet = async (suggestion: StreetSuggestion) => {
    setQuery(suggestion.description);
    setSelectedArea(null);
    setOpen(false);
    setGeocoding(true);
    try {
      const res = await geocodeAddress({ placeId: suggestion.placeId }).unwrap();
      const data = res.data;
      if (!data) throw new Error('No result');
      if (showLandmark) {
        setPendingPickup({ lat: data.lat, lng: data.lng, displayName: data.displayName });
      } else {
        confirmCoords(data.lat, data.lng, data.displayName);
      }
    } catch {
      toast.error('Could not resolve that address. Try another suggestion or pick an area.');
    } finally {
      setGeocoding(false);
    }
  };

  const geocodeFreeText = async () => {
    const q = query.trim();
    if (!q) return;

    const local = resolveHyderabadArea(q);
    if (local) {
      pickArea(local);
      return;
    }

    setGeocoding(true);
    setOpen(false);
    try {
      const res = await geocodeAddress({ address: q }).unwrap();
      const data = res.data;
      if (!data) throw new Error('No result');
      if (showLandmark) {
        setPendingPickup({ lat: data.lat, lng: data.lng, displayName: data.displayName });
        setSelectedArea(null);
      } else {
        confirmCoords(data.lat, data.lng, data.displayName);
      }
    } catch {
      toast.error(
        `Could not find "${q}" in ${HYDERABAD_SERVICE_LABEL}. Try a street name, colony, or landmark.`
      );
    } finally {
      setGeocoding(false);
    }
  };

  const canConfirm = !requireLandmark || landmark.trim().length >= 3;
  const showDropdown = open && (query.length > 0 || streetSuggestions.length > 0);
  const hasResults =
    localResults.length > 0 || streetSuggestions.length > 0 || (!query && HYDERABAD_AREAS.length > 0);

  return (
    <div ref={wrapperRef} className={cn('space-y-2', className)}>
      {label && <p className="text-sm font-medium text-inherit">{label}</p>}
      <p className="text-xs text-inherit opacity-80">
        Type any street, colony, or landmark — {HYDERABAD_AREAS.length}+ areas across{' '}
        {HYDERABAD_SERVICE_LABEL} (like Rapido/Uber).
      </p>
      <div className="relative">
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
          className={cn('pl-10 pr-10', inputClassName)}
          autoComplete="off"
          disabled={geocoding}
        />
        {(searching || geocoding) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin opacity-60" />
        )}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-80 overflow-y-auto rounded-lg border border-border bg-card shadow-xl">
            {streetSuggestions.length > 0 && (
              <div>
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border/50">
                  Streets & addresses
                </p>
                {streetSuggestions.map((s) => (
                  <button
                    key={s.placeId}
                    type="button"
                    className="w-full text-left px-3 py-2.5 hover:bg-muted/80 border-b border-border/50 flex gap-2"
                    onClick={() => void pickStreet(s)}
                  >
                    <Navigation className="h-4 w-4 shrink-0 mt-0.5 text-primary opacity-70" />
                    <span className="min-w-0">
                      <span className="font-medium text-sm block truncate">{s.mainText}</span>
                      {s.secondaryText && (
                        <span className="text-xs text-muted block truncate">{s.secondaryText}</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {(query ? localResults : HYDERABAD_AREAS.slice(0, 14)).length > 0 && (
              <div>
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border/50">
                  {query ? 'Areas & colonies' : 'Popular areas'}
                </p>
                {(query ? localResults : HYDERABAD_AREAS.slice(0, 14)).map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    className="w-full text-left px-3 py-2.5 hover:bg-muted/80 border-b border-border/50 last:border-0 flex gap-2"
                    onClick={() => pickArea(area)}
                  >
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted" />
                    <span>
                      <span className="font-medium text-sm">{area.name}</span>
                      <span className="text-xs text-muted ml-2">{area.zone}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {query && !searching && !hasResults && (
              <p className="px-3 py-3 text-sm text-muted">
                No matches — press Enter to search &quot;{query}&quot; across Hyderabad
              </p>
            )}

            {query && query.length >= 2 && !searching && (
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm font-medium text-primary hover:bg-muted/80 border-t border-border/50"
                onClick={() => void geocodeFreeText()}
              >
                Search &quot;{query}&quot; on map
              </button>
            )}
          </div>
        )}
      </div>

      {showLandmark && (selectedArea || pendingPickup) && (
        <div className="space-y-2 pt-1 rounded-lg border border-white/15 bg-white/5 p-3">
          <div className="flex items-center gap-2 text-xs text-inherit opacity-90">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 truncate">
              <strong>{selectedArea?.name ?? pendingPickup?.displayName}</strong> — add flat/building for exact pickup
            </span>
          </div>
          <Label className="text-xs text-inherit opacity-90">
            Flat / building / gate / landmark
            {requireLandmark ? ' (required)' : ' (recommended)'}
          </Label>
          <Input
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="e.g. Flat 402, My Home Avatar, near metro gate"
            className={cn('h-10 bg-white/95 text-slate-900', inputClassName)}
            autoFocus
          />
          <button
            type="button"
            disabled={!canConfirm || geocoding}
            onClick={() => {
              if (selectedArea) confirmArea(selectedArea);
              else if (pendingPickup) {
                confirmCoords(
                  pendingPickup.lat,
                  pendingPickup.lng,
                  pendingPickup.displayName
                );
              }
            }}
            className="w-full rounded-lg bg-white text-slate-900 font-semibold py-2.5 text-sm hover:bg-white/90 disabled:opacity-50"
          >
            Confirm pickup location
          </button>
        </div>
      )}

      {showPopular && !selectedArea && !pendingPickup && (
        <div className="flex flex-wrap gap-1.5">
          {popular.map((area) => (
            <button
              key={area.id}
              type="button"
              onClick={() => pickArea(area)}
              className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium hover:bg-white/20"
            >
              <MapPin className="h-3 w-3 opacity-70" />
              {area.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function selectionFromHyderabadArea(
  area: HyderabadArea,
  landmark?: string
): HyderabadAreaSelection {
  return {
    area,
    lat: area.lat,
    lng: area.lng,
    address: areaToDisplayName(area, landmark),
    landmark,
  };
}
