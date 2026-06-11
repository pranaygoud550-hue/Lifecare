'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

type Suggestion = { placeId: string; description: string; mainText: string };

type Props = {
  label: string;
  value: string;
  onChange: (address: string) => void;
  onSelect: (place: { address: string; name: string; coords: { lat: number; lng: number } }) => void;
  placeholder?: string;
  biasCoords?: { lat: number; lng: number };
};

export function PlacesAutocomplete({ label, value, onChange, onSelect, placeholder, biasCoords }: Props) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(
    (input: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (input.trim().length < 3) {
        setSuggestions([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const res = await api.placesAutocomplete(input, biasCoords?.lat, biasCoords?.lng);
          setSuggestions(res.data);
          setOpen(true);
        } catch {
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, 280);
    },
    [biasCoords]
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  async function pick(s: Suggestion) {
    setOpen(false);
    onChange(s.description);
    try {
      const res = await api.placeDetails(s.placeId);
      const d = res.data;
      onSelect({ address: d.address, name: d.name, coords: d.coords });
    } catch {
      onSelect({ address: s.description, name: s.mainText, coords: biasCoords || { lat: 17.4486, lng: 78.3908 } });
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-sm text-slate-400">
        {label}
        <input
          type="text"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            fetchSuggestions(e.target.value);
          }}
          onFocus={() => value.length >= 3 && setOpen(true)}
          autoComplete="off"
        />
      </label>
      {loading && <p className="mt-1 text-xs text-slate-500">Searching…</p>}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                onClick={() => pick(s)}
              >
                <span className="font-medium">{s.mainText}</span>
                <span className="block truncate text-xs text-slate-500">{s.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
