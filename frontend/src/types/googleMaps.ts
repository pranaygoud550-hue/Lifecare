export interface GoogleHospitalPlace {
  place_id: string;
  name: string;
  address: string;
  phone: string | null;
  distance: string;
  distanceMeters: number;
  rating: number | null;
  isOpen: boolean | null;
  isEmergency: boolean;
  coordinates: { lat: number; lng: number };
  photo_url: string | null;
  types?: string[];
  specialtyTags?: string[];
  source?: 'google_places' | 'database';
}

export interface HospitalRoutePreviewData {
  source: 'google_directions' | 'straight_line';
  distance?: string;
  duration?: string;
  durationInTraffic?: string;
  decodedPath: [number, number][];
  polyline?: string;
}

export interface NavigationRouteStep {
  instruction: string;
  distance: string;
  duration: string;
  maneuver?: string;
}

export interface NavigationRouteData {
  distance: string;
  duration: string;
  durationInTraffic: string;
  durationSeconds: number;
  durationInTrafficSeconds: number;
  steps: NavigationRouteStep[];
  polyline: string;
  decodedPath: [number, number][];
  warnings: string[];
  mode?: string;
}

export interface NavigationEtaData {
  requestId: string;
  status: string;
  calculatedETA: number | null;
  estimatedArrival?: string;
  ambulanceLocation: { lat: number; lng: number };
  patientLocation: { lat: number; lng: number };
  distance?: string;
  duration?: string;
  durationInTraffic?: string | null;
  polyline?: string | null;
  decodedPath?: [number, number][] | null;
  steps?: string[];
  warnings?: string[];
}

export interface SmartHospitalRecommendation {
  recommendation: GoogleHospitalPlace | null;
  alternatives: GoogleHospitalPlace[];
  scanContext: {
    prediction: string;
    confidence: number;
    explanation: string;
  } | null;
  reason: string;
  source: string;
}
