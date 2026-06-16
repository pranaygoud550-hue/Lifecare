import { config } from '../config/index.js';
import { cacheGet, cacheSet, cacheKey } from './cacheService.js';
import {
  HYDERABAD_CENTER,
  SERVICE_RADIUS_KM,
} from '../data/hyderabadAreas.js';

export interface AddressSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  kind: 'address' | 'establishment';
}

interface AutocompleteResponse {
  predictions: Array<{
    place_id: string;
    description: string;
    structured_formatting?: {
      main_text?: string;
      secondary_text?: string;
    };
  }>;
  status: string;
  error_message?: string;
}

function apiKey(): string | null {
  return config.google.placesApiKey || config.google.mapsApiKey || null;
}

export function isAddressAutocompleteConfigured(): boolean {
  return Boolean(apiKey());
}

/**
 * Uber/Rapido-style address suggestions — streets, colonies, landmarks within Hyderabad service radius.
 */
export async function searchAddressSuggestions(input: string): Promise<AddressSuggestion[]> {
  const trimmed = input.trim();
  if (trimmed.length < 2) return [];

  const key = apiKey();
  if (!key) return [];

  const cacheKeyStr = cacheKey(['address-autocomplete', trimmed.toLowerCase()]);
  const cached = cacheGet<AddressSuggestion[]>(cacheKeyStr);
  if (cached) return cached;

  const baseParams = {
    input: trimmed,
    key,
    components: 'country:in',
    origin: `${HYDERABAD_CENTER.lat},${HYDERABAD_CENTER.lng}`,
    location: `${HYDERABAD_CENTER.lat},${HYDERABAD_CENTER.lng}`,
    radius: String(SERVICE_RADIUS_KM * 1000),
  };

  async function fetchPredictions(extra: Record<string, string> = {}) {
    const params = new URLSearchParams({ ...baseParams, ...extra });
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
    const res = await fetch(url);
    return (await res.json()) as AutocompleteResponse;
  }

  function mapRows(
    rows: AutocompleteResponse['predictions'],
    kind: AddressSuggestion['kind']
  ): AddressSuggestion[] {
    return (rows ?? []).map((row) => ({
      placeId: row.place_id,
      description: row.description,
      mainText: row.structured_formatting?.main_text ?? row.description,
      secondaryText: row.structured_formatting?.secondary_text ?? '',
      kind,
    }));
  }

  const [general, establishments] = await Promise.all([
    fetchPredictions(),
    fetchPredictions({ types: 'establishment' }),
  ]);

  if (
    general.status !== 'OK' &&
    general.status !== 'ZERO_RESULTS' &&
    establishments.status !== 'OK' &&
    establishments.status !== 'ZERO_RESULTS'
  ) {
    throw new Error(
      general.error_message ||
        establishments.error_message ||
        `Autocomplete error: ${general.status}`
    );
  }

  const seen = new Set<string>();
  const suggestions: AddressSuggestion[] = [];

  for (const row of mapRows(establishments.predictions, 'establishment')) {
    if (!seen.has(row.placeId)) {
      seen.add(row.placeId);
      suggestions.push(row);
    }
  }
  for (const row of mapRows(general.predictions, 'address')) {
    if (!seen.has(row.placeId)) {
      seen.add(row.placeId);
      suggestions.push(row);
    }
  }

  if (suggestions.length === 0) {
    const geocodeOnly = await fetchPredictions({ types: 'geocode' });
    for (const row of mapRows(geocodeOnly.predictions, 'address')) {
      if (!seen.has(row.placeId)) {
        seen.add(row.placeId);
        suggestions.push(row);
      }
    }
  }

  cacheSet(cacheKeyStr, suggestions, 300);
  return suggestions;
}
