import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
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
  showLandmark?: boolean;
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
    const address = areaToDisplayName(area, landmark);
    onSelect({
      area,
      lat: area.lat,
      lng: area.lng,
      address,
      landmark: landmark.trim() || undefined,
    });
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

  return (
    <div ref={wrapperRef} className={cn('space-y-2', className)}>
      {label && <p className="text-sm font-medium text-inherit">{label}</p>}
      <p className="text-xs text-inherit opacity-80">
        {HYDERABAD_AREAS.length}+ Hyderabad areas — pick yours for accurate hospital matching.
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
                Try a nearby name — KPHB, Nagole, Sainikpuri, Manikonda…
              </p>
            )}
          </div>
        )}
      </div>

      {showLandmark && selectedArea && (
        <div className="space-y-2 pt-1">
          <Label className="text-xs text-inherit opacity-90">
            Landmark / street (optional, for ambulance)
          </Label>
          <Input
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="e.g. near D-Mart, Road 36, beside metro"
            className={cn('h-10 bg-white/95 text-slate-900', inputClassName)}
          />
          <button
            type="button"
            onClick={() => confirm(selectedArea)}
            className="w-full rounded-lg bg-white text-slate-900 font-semibold py-2.5 text-sm hover:bg-white/90"
          >
            Confirm {selectedArea.name}
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
