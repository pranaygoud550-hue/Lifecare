import { useMemo, useState } from 'react';
import { Building2, MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useGetHospitalsQuery } from '@/features/api/apiSlice';
import { cn } from '@/lib/utils';
import type { EmergencyHospitalInfo } from '@/types';
import type { Hospital } from '@/types';

function hospitalToEmergencyInfo(h: Hospital, distanceMeters = 0): EmergencyHospitalInfo {
  const coords = (h as Hospital & { coordinates?: { lat: number; lng: number } }).coordinates;
  return {
    _id: h._id,
    name: h.name,
    address: h.address || h.city,
    phone: h.phone ?? null,
    city: h.city,
    state: h.state,
    coordinates: coords ?? null,
    distanceMeters,
  };
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export interface HospitalSearchPickerProps {
  nearbyHospitals: EmergencyHospitalInfo[];
  selected: EmergencyHospitalInfo | null;
  onSelect: (hospital: EmergencyHospitalInfo) => void;
  className?: string;
  inputClassName?: string;
}

export function HospitalSearchPicker({
  nearbyHospitals,
  selected,
  onSelect,
  className,
  inputClassName,
}: HospitalSearchPickerProps) {
  const [query, setQuery] = useState(selected?.name ?? '');
  const [open, setOpen] = useState(false);

  const trimmed = query.trim();
  const { data: searchData, isFetching: searching } = useGetHospitalsQuery(
    { search: trimmed, limit: '30' },
    { skip: trimmed.length < 1 }
  );

  const apiHospitals = useMemo(
    () => (searchData?.data?.hospitals ?? []).map((h) => hospitalToEmergencyInfo(h)),
    [searchData]
  );

  const suggestions = useMemo(() => {
    const q = trimmed.toLowerCase();
    const fromNearby = q
      ? nearbyHospitals.filter(
          (h) =>
            h.name.toLowerCase().includes(q) ||
            h.address.toLowerCase().includes(q) ||
            (h.city?.toLowerCase().includes(q) ?? false)
        )
      : nearbyHospitals;

    const merged = new Map<string, EmergencyHospitalInfo>();
    for (const h of fromNearby) merged.set(h._id, h);
    for (const h of apiHospitals) {
      if (!merged.has(h._id)) merged.set(h._id, h);
    }

    return Array.from(merged.values()).slice(0, 30);
  }, [trimmed, nearbyHospitals, apiHospitals]);

  const showList = open && (suggestions.length > 0 || searching || trimmed.length > 0);

  return (
    <div className={cn('relative', className)}>
      <label className="text-xs font-bold uppercase tracking-wide text-emerald-200 mb-2 flex items-center gap-1">
        <Building2 className="h-4 w-4" />
        Choose hospital
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 200)}
          placeholder="Type hospital name…"
          className={cn(
            'h-12 pl-10 text-base bg-white/10 border-white/20 text-white placeholder:text-white/40',
            inputClassName
          )}
          autoComplete="off"
        />
      </div>

      {selected && !open && (
        <p className="text-xs text-emerald-200/90 mt-2 flex items-start gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {selected.address}
          {selected.distanceMeters > 0 && ` · ${formatDistance(selected.distanceMeters)}`}
        </p>
      )}

      {showList && (
        <ul
          className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-white/20 bg-slate-900 shadow-xl"
          role="listbox"
        >
          {searching && suggestions.length === 0 && (
            <li className="px-4 py-3 text-sm text-white/60">Searching hospitals…</li>
          )}
          {!searching && suggestions.length === 0 && (
            <li className="px-4 py-3 text-sm text-white/60">No hospitals match &quot;{trimmed}&quot;</li>
          )}
          {suggestions.map((h) => (
            <li key={h._id} role="option" aria-selected={selected?._id === h._id}>
              <button
                type="button"
                className={cn(
                  'w-full text-left px-4 py-3 min-h-[48px] border-b border-white/5 last:border-0 hover:bg-white/10 transition-colors',
                  selected?._id === h._id && 'bg-emerald-600/25'
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(h);
                  setQuery(h.name);
                  setOpen(false);
                }}
              >
                <p className="font-semibold text-white text-sm leading-tight">{h.name}</p>
                <p className="text-xs text-white/60 mt-0.5 line-clamp-2">
                  {h.address}
                  {h.city ? ` · ${h.city}` : ''}
                  {h.distanceMeters > 0 ? ` · ${formatDistance(h.distanceMeters)}` : ''}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!trimmed && nearbyHospitals.length > 0 && !open && (
        <p className="text-xs text-white/50 mt-2">
          {nearbyHospitals.length} emergency hospitals (ambulance service) near you — tap to see all
        </p>
      )}
    </div>
  );
}
