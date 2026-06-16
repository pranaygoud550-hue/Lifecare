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

  const params = new URLSearchParams({
    input: trimmed,
    key,
    components: 'country:in',
    location: `${HYDERABAD_CENTER.lat},${HYDERABAD_CENTER.lng}`,
    radius: String(SERVICE_RADIUS_KM * 1000),
    strictbounds: 'false',
  });

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
  const res = await fetch(url);
  const data = (await res.json()) as AutocompleteResponse;

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || `Autocomplete error: ${data.status}`);
  }

  const suggestions: AddressSuggestion[] = (data.predictions ?? []).map((row) => ({
    placeId: row.place_id,
    description: row.description,
    mainText: row.structured_formatting?.main_text ?? row.description,
    secondaryText: row.structured_formatting?.secondary_text ?? '',
  }));

  cacheSet(cacheKeyStr, suggestions, 300);
  return suggestions;
}
