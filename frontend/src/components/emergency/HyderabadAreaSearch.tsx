import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  HYDERABAD_AREAS,
  areaToDisplayName,
  resolveHyderabadArea,
  searchHyderabadAreas,
  type HyderabadArea,
} from '@/data/hyderabadAreas';

export type HyderabadAreaSelection = {
  area: HyderabadArea;
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
];

export function HyderabadAreaSearch({
  value = '',
  onSelect,
  placeholder = 'Search area — Madhapur, KPHB, LB Nagar, Sainikpuri…',
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
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const results = useMemo(() => searchHyderabadAreas(query, 20), [query]);

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

  const confirm = (area: HyderabadArea) => {
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
    setLandmark('');
  };

  const pick = (area: HyderabadArea) => {
    setQuery(area.name);
    setSelectedArea(area);
    setOpen(false);
    if (!showLandmark) {
      confirm(area);
    }
  };

  const tryFreeText = () => {
    const resolved = resolveHyderabadArea(query);
    if (resolved) pick(resolved);
  };

  const canConfirm = !requireLandmark || landmark.trim().length >= 3;

  return (
    <div ref={wrapperRef} className={cn('space-y-2', className)}>
      {label && <p className="text-sm font-medium text-inherit">{label}</p>}
      <p className="text-xs text-inherit opacity-80">
        {HYDERABAD_AREAS.length}+ Hyderabad areas — pick yours, then add flat/building for exact pickup.
      </p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60 z-10" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedArea(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (results[0]) pick(results[0]);
              else tryFreeText();
            }
          }}
          placeholder={placeholder}
          className={cn('pl-10', inputClassName)}
          autoComplete="off"
        />
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-72 overflow-y-auto rounded-lg border border-border bg-card shadow-xl">
            {(query ? results : HYDERABAD_AREAS.slice(0, 18)).map((area) => (
              <button
                key={area.id}
                type="button"
                className="w-full text-left px-3 py-2.5 hover:bg-muted/80 border-b border-border/50 last:border-0"
                onClick={() => pick(area)}
              >
                <span className="font-medium text-sm">{area.name}</span>
                <span className="text-xs text-muted ml-2">{area.zone}</span>
              </button>
            ))}
            {query && results.length === 0 && (
              <p className="px-3 py-3 text-sm text-muted">
                Try KPHB Phase 3, Nagole X Roads, Sainikpuri, Manikonda Jagir…
              </p>
            )}
          </div>
        )}
      </div>

      {showLandmark && selectedArea && (
        <div className="space-y-2 pt-1 rounded-lg border border-white/15 bg-white/5 p-3">
          <div className="flex items-center gap-2 text-xs text-inherit opacity-90">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span>
              <strong>{selectedArea.name}</strong> selected — add building details for apartments
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
            disabled={!canConfirm}
            onClick={() => confirm(selectedArea)}
            className="w-full rounded-lg bg-white text-slate-900 font-semibold py-2.5 text-sm hover:bg-white/90 disabled:opacity-50"
          >
            Confirm location in {selectedArea.name}
          </button>
        </div>
      )}

      {showPopular && !selectedArea && (
        <div className="flex flex-wrap gap-1.5">
          {popular.map((area) => (
            <button
              key={area.id}
              type="button"
              onClick={() => pick(area)}
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
