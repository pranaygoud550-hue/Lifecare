import { useState, useEffect, useRef } from 'react';
import { MapPin, Building2, Stethoscope } from 'lucide-react';
import { useLazySearchCitiesQuery } from '@/features/api/apiSlice';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { CitySearchResult } from '@/types';

interface CitySearchInputProps {
  value: string;
  onChange: (city: string, state?: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  onSelect?: (city: CitySearchResult) => void;
}

export function CitySearchInput({
  value,
  onChange,
  placeholder = 'Search city...',
  className,
  inputClassName,
  onSelect,
}: CitySearchInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [searchCities, { data, isFetching }] = useLazySearchCitiesQuery();

  const cities = data?.data || [];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) searchCities({ q: query });
    }, 250);
    return () => clearTimeout(timer);
  }, [query, open, searchCities]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (city: CitySearchResult) => {
    setQuery(city.city);
    onChange(city.city, city.state);
    onSelect?.(city);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted z-10" />
      <Input
        placeholder={placeholder}
        className={cn('pl-10', inputClassName)}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          searchCities({ q: query });
        }}
        autoComplete="off"
      />

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {isFetching && cities.length === 0 ? (
            <p className="p-3 text-sm text-muted">Searching cities...</p>
          ) : cities.length === 0 ? (
            <p className="p-3 text-sm text-muted">No cities found</p>
          ) : (
            cities.map((city) => (
              <button
                key={`${city.city}-${city.state}`}
                type="button"
                className="w-full flex items-center gap-3 p-3 hover:bg-background text-left border-b border-border last:border-0"
                onClick={() => handleSelect(city)}
              >
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{city.city}</p>
                  <p className="text-xs text-muted">{city.state}</p>
                </div>
                <div className="flex gap-2 text-xs text-muted shrink-0">
                  <span className="flex items-center gap-0.5" title="Doctors">
                    <Stethoscope className="h-3 w-3" /> {city.doctorCount}
                  </span>
                  <span className="flex items-center gap-0.5" title="Hospitals">
                    <Building2 className="h-3 w-3" /> {city.hospitalCount}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
