import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, RefreshCw, MapPin, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientOnly } from '@/components/emergency/MapWrapper';
import {
  useGetNavigationEtaQuery,
  useGetNavigationRouteMutation,
  useMarkDriverArrivedMutation,
} from '@/features/api/apiSlice';
import { toast } from 'react-toastify';
import { cn } from '@/lib/utils';

const ambulanceIcon = L.divIcon({
  className: '',
  html: `<div style="background:#dc2626;color:white;font-size:18px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);">🚑</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const patientIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 0 0 5px rgba(239,68,68,.35);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitRoute({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(L.latLngBounds(points), { padding: [72, 72], maxZoom: 16 });
  }, [map, points]);
  return null;
}

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.pitch = 1;
  window.speechSynthesis.speak(utter);
}

export interface DriverNavigationPanelProps {
  requestId: string;
  patientLocation: { lat: number; lng: number };
  ambulanceLocation?: { lat: number; lng: number } | null;
  status: string;
  onArrived: () => void;
}

export function DriverNavigationPanel({
  requestId,
  patientLocation,
  ambulanceLocation,
  status,
  onArrived,
}: DriverNavigationPanelProps) {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const lastSpoken = useRef<string>('');

  const { data: navData, refetch, isFetching } = useGetNavigationEtaQuery(requestId, {
    pollingInterval: 10000,
  });
  const [fetchRoute, { data: routeData, isLoading: routeLoading }] = useGetNavigationRouteMutation();
  const [markArrived, { isLoading: markingArrived }] = useMarkDriverArrivedMutation();

  const nav = navData?.data;
  const route = routeData?.data;

  const origin = ambulanceLocation ?? nav?.ambulanceLocation;
  const path = nav?.decodedPath ?? route?.decodedPath ?? null;
  const steps = route?.steps ?? [];
  const nextStep = steps[0]?.instruction ?? nav?.steps?.[0] ?? 'Head toward patient location';

  const mapPoints = useMemo(() => {
    const pts: [number, number][] = [];
    if (origin) pts.push([origin.lat, origin.lng]);
    pts.push([patientLocation.lat, patientLocation.lng]);
    if (path) return path;
    return pts;
  }, [origin, patientLocation, path]);

  const recalculate = useCallback(async () => {
    if (!origin) return;
    await fetchRoute({
      originLat: origin.lat,
      originLng: origin.lng,
      destLat: patientLocation.lat,
      destLng: patientLocation.lng,
      mode: 'ambulance',
    }).unwrap();
    refetch();
  }, [fetchRoute, origin, patientLocation, refetch]);

  useEffect(() => {
    if (!origin) return;
    void fetchRoute({
      originLat: origin.lat,
      originLng: origin.lng,
      destLat: patientLocation.lat,
      destLng: patientLocation.lng,
      mode: 'ambulance',
    });
  }, [fetchRoute, origin?.lat, origin?.lng, patientLocation.lat, patientLocation.lng]);

  useEffect(() => {
    if (!voiceEnabled || !nextStep || nextStep === lastSpoken.current) return;
    lastSpoken.current = nextStep;
    speak(nextStep);
  }, [nextStep, voiceEnabled]);

  const etaLabel = nav?.durationInTraffic ?? nav?.duration ?? (nav?.calculatedETA != null ? `${nav.calculatedETA} min` : '—');

  return (
    <div className="rounded-2xl border-2 border-red-400 overflow-hidden bg-slate-950 text-white">
      <div className="p-4 bg-gradient-to-r from-red-900 to-slate-900 border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-red-200">Turn-by-turn navigation</p>
            <p className="text-lg font-bold mt-1 leading-snug">{nextStep}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-black tabular-nums">{etaLabel}</p>
            <p className="text-xs text-red-200">ETA with traffic</p>
          </div>
        </div>
        {steps[1] && (
          <p className="text-sm text-slate-400 mt-2 truncate">Then: {steps[1].instruction}</p>
        )}
      </div>

      <ClientOnly fallback={<div className="h-64 bg-slate-900 animate-pulse" />}>
        <div className="h-64 relative">
          <MapContainer
            center={[patientLocation.lat, patientLocation.lng]}
            zoom={14}
            scrollWheelZoom
            className="h-full w-full z-0"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitRoute points={mapPoints} />
            <Marker position={[patientLocation.lat, patientLocation.lng]} icon={patientIcon} />
            {origin && <Marker position={[origin.lat, origin.lng]} icon={ambulanceIcon} />}
            {path && path.length > 1 && (
              <Polyline positions={path} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.9 }} />
            )}
          </MapContainer>
        </div>
      </ClientOnly>

      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900">
        <Button
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10"
          onClick={() => setVoiceEnabled((v) => !v)}
        >
          {voiceEnabled ? <Volume2 className="h-4 w-4 mr-1" /> : <VolumeX className="h-4 w-4 mr-1" />}
          Voice {voiceEnabled ? 'on' : 'off'}
        </Button>
        <Button
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10"
          onClick={() => void recalculate()}
          disabled={routeLoading || isFetching}
        >
          <RefreshCw className={cn('h-4 w-4 mr-1', (routeLoading || isFetching) && 'animate-spin')} />
          Recalculate
        </Button>
        <Button
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10 col-span-2 sm:col-span-1"
          onClick={() =>
            window.open(
              `https://www.google.com/maps/dir/?api=1&origin=${origin?.lat},${origin?.lng}&destination=${patientLocation.lat},${patientLocation.lng}&travelmode=driving`,
              '_blank'
            )
          }
        >
          <MapPin className="h-4 w-4 mr-1" /> Google Maps
        </Button>
        {status === 'dispatched' && (
          <Button
            className="col-span-2 sm:col-span-1 bg-green-600 hover:bg-green-700"
            disabled={markingArrived}
            onClick={async () => {
              try {
                await markArrived(requestId).unwrap();
                toast.success('Marked arrived — ask patient for safety code');
                onArrived();
              } catch {
                toast.error('Could not mark arrival');
              }
            }}
          >
            <Navigation className="h-4 w-4 mr-1" />
            {markingArrived ? 'Updating…' : "I've arrived"}
          </Button>
        )}
      </div>
    </div>
  );
}
