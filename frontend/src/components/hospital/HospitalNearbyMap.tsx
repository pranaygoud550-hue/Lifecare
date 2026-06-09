import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { useGetEmergencyNearbyHospitalsQuery } from '@/features/api/apiSlice';
import { ClientOnly } from '@/components/emergency/MapWrapper';
import { HospitalNearbySummary } from '@/components/hospital/HospitalNearbySummary';
import { cn } from '@/lib/utils';

const DEMO_LOCATION = { lat: 17.385, lng: 78.4867 };

const userIcon = L.divIcon({
  className: 'hospital-map-marker',
  html: `<div style="width:14px;height:14px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(37,99,235,.35);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const hospitalIcon = L.divIcon({
  className: 'hospital-map-marker',
  html: `<div style="width:14px;height:14px;background:#16a34a;border:3px solid white;border-radius:4px;box-shadow:0 0 0 4px rgba(22,163,74,.35);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function FitTwoPoints({
  a,
  b,
}: {
  a: { lat: number; lng: number };
  b: { lat: number; lng: number };
}) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      L.latLngBounds([
        [a.lat, a.lng],
        [b.lat, b.lng],
      ]),
      { padding: [56, 56], maxZoom: 15 }
    );
  }, [map, a.lat, a.lng, b.lat, b.lng]);
  return null;
}

function SimpleMap({
  userLocation,
  hospital,
  className,
}: {
  userLocation: { lat: number; lng: number };
  hospital: { lat: number; lng: number; name: string };
  className?: string;
}) {
  const { t } = useTranslation();
  const route: [number, number][] = [
    [userLocation.lat, userLocation.lng],
    [hospital.lat, hospital.lng],
  ];

  return (
    <div className={cn('rounded-xl overflow-hidden border border-border', className ?? 'h-[320px] w-full')}>
      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={13}
        scrollWheelZoom
        className="h-full w-full z-0"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitTwoPoints a={userLocation} b={hospital} />

        <Polyline
          positions={route}
          pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.85 }}
        />

        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} zIndexOffset={900}>
          <Tooltip permanent direction="top" offset={[0, -6]}>
            {t('map.yourLocation')}
          </Tooltip>
        </Marker>

        <Marker position={[hospital.lat, hospital.lng]} icon={hospitalIcon} zIndexOffset={800}>
          <Tooltip permanent direction="top" offset={[0, -6]}>
            {hospital.name}
          </Tooltip>
        </Marker>
      </MapContainer>
    </div>
  );
}

export function HospitalNearbyMap({ compact }: { compact?: boolean }) {
  const { t } = useTranslation();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(true);

  const resolveLocation = useCallback(() => {
    setLocating(true);
    if (!navigator.geolocation) {
      setUserLocation(DEMO_LOCATION);
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setUserLocation(DEMO_LOCATION);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    resolveLocation();
  }, [resolveLocation]);

  const { data, isLoading } = useGetEmergencyNearbyHospitalsQuery(
    { lat: userLocation!.lat, lng: userLocation!.lng, radius: 25 },
    { skip: !userLocation }
  );

  const nearest = useMemo(() => {
    const list = (data?.data?.hospitals ?? []).filter((h) => h.coordinates?.lat != null);
    return list[0] ?? null;
  }, [data]);

  const hospitalPoint = nearest?.coordinates
    ? { lat: nearest.coordinates.lat, lng: nearest.coordinates.lng, name: nearest.name }
    : null;

  if (compact) {
    return <HospitalNearbySummary />;
  }

  return (
    <section className={cn(compact ? '' : 'space-y-3')}>
      {!compact && (
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          {t('map.title')}
        </h2>
      )}

      {locating || !userLocation ? (
        <div className="h-[320px] rounded-xl bg-muted animate-pulse flex items-center justify-center text-sm text-muted">
          {t('map.loadingLocation')}
        </div>
      ) : isLoading ? (
        <div className="h-[320px] rounded-xl bg-muted animate-pulse" />
      ) : !hospitalPoint ? (
        <div className="h-[200px] rounded-xl border border-dashed border-border flex items-center justify-center text-sm text-muted px-4 text-center">
          {t('map.noHospitals')}
        </div>
      ) : (
        <>
          <ClientOnly fallback={<div className="h-[320px] rounded-xl bg-muted animate-pulse" />}>
            <SimpleMap userLocation={userLocation} hospital={hospitalPoint} />
          </ClientOnly>
          <div className="flex flex-wrap gap-4 mt-3 text-sm">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#2563eb] border-2 border-white shadow" />
              {t('map.yourLocation')}
            </span>
            <span className="flex items-center gap-2 min-w-0">
              <span className="h-3 w-3 rounded-sm bg-[#16a34a] border-2 border-white shadow shrink-0" />
              <span className="truncate font-medium">{hospitalPoint.name}</span>
            </span>
          </div>
        </>
      )}
    </section>
  );
}
