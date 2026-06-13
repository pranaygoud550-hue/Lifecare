import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDrivingRoute } from '@/hooks/useDrivingRoute';

export interface MapPoint {
  lat: number;
  lng: number;
}

export interface HospitalMapPoint extends MapPoint {
  name: string;
  address?: string;
}

const pickupIcon = L.divIcon({
  className: 'ride-map-marker',
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:16px;height:16px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 0 0 5px rgba(37,99,235,.35);"></div>
      <span style="margin-top:3px;background:#1d4ed8;color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:999px;">Pickup</span>
    </div>
  `,
  iconSize: [70, 36],
  iconAnchor: [35, 10],
});

function vehicleIcon(emoji = '🚗') {
  return L.divIcon({
    className: 'ride-map-marker',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="background:#111827;color:white;font-size:18px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:10px;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,.35);">${emoji}</div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function hospitalIcon(name: string) {
  const safe = name.replace(/"/g, '').slice(0, 28);
  return L.divIcon({
    className: 'ride-map-marker',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;max-width:130px;">
        <div style="background:#16a34a;color:white;font-size:14px;font-weight:800;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25);">✚</div>
        <span style="margin-top:3px;background:#14532d;color:white;font-size:9px;font-weight:600;padding:2px 5px;border-radius:4px;text-align:center;line-height:1.2;">${safe}</span>
      </div>
    `,
    iconSize: [130, 50],
    iconAnchor: [65, 15],
  });
}

function FitBounds({
  points,
}: {
  points: MapPoint[];
}) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
      return;
    }
    map.fitBounds(
      L.latLngBounds(points.map((p) => [p.lat, p.lng] as L.LatLngExpression)),
      { padding: [48, 48], maxZoom: 16 }
    );
  }, [map, points]);
  return null;
}

function AnimatedDriverMarker({ position, icon }: { position: MapPoint; icon: L.DivIcon }) {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const start = marker.getLatLng();
    const end = L.latLng(position.lat, position.lng);
    const duration = 900;
    const startTime = performance.now();
    let frame: number;

    const animate = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      marker.setLatLng([
        start.lat + (end.lat - start.lat) * t,
        start.lng + (end.lng - start.lng) * t,
      ]);
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [position.lat, position.lng]);

  return (
    <Marker ref={markerRef} position={[position.lat, position.lng]} icon={icon} zIndexOffset={1000}>
      <Tooltip direction="top" offset={[0, -14]} opacity={1} permanent>
        Your ride
      </Tooltip>
    </Marker>
  );
}

const VEHICLE_EMOJI: Record<string, string> = {
  basic_ambulance: '🚑',
  medical_cab: '🚗',
  wheelchair_van: '🚐',
  bike_ambulance: '🏍️',
  BLS: '🚑',
  ALS: '🚑',
};

export interface RideLiveMapProps {
  pickup: MapPoint;
  driver?: MapPoint | null;
  hospital?: HospitalMapPoint | null;
  vehicleType?: string;
  rideStatus?: string;
  className?: string;
  showOpenMaps?: boolean;
}

export function RideLiveMap({
  pickup,
  driver,
  hospital,
  vehicleType,
  rideStatus,
  className,
  showOpenMaps = true,
}: RideLiveMapProps) {
  const [hospitalMarkerIcon, setHospitalMarkerIcon] = useState<L.DivIcon | null>(null);
  const driverMarkerIcon = useMemo(
    () => vehicleIcon(VEHICLE_EMOJI[vehicleType || ''] || '🚗'),
    [vehicleType]
  );

  useEffect(() => {
    if (hospital) setHospitalMarkerIcon(hospitalIcon(hospital.name));
  }, [hospital?.name, hospital?.lat, hospital?.lng]);

  const goingToHospital = ['patient-picked-up', 'en-route-to-hospital', 'completed'].includes(
    rideStatus || ''
  );

  const hospitalRoute = useDrivingRoute(pickup, hospital ?? null);

  const driverRoute = useMemo(() => {
    if (!driver) return [];
    const target = goingToHospital && hospital ? hospital : pickup;
    return [
      [driver.lat, driver.lng],
      [target.lat, target.lng],
    ] as [number, number][];
  }, [driver, pickup, hospital, goingToHospital]);

  const fitPoints = useMemo(() => {
    const pts: MapPoint[] = [pickup];
    if (driver) pts.push(driver);
    if (hospital) pts.push(hospital);
    return pts;
  }, [pickup, driver, hospital]);

  const mapsUrl = useMemo(() => {
    if (hospital) {
      return `https://www.google.com/maps/dir/?api=1&origin=${pickup.lat},${pickup.lng}&destination=${hospital.lat},${hospital.lng}&travelmode=driving`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${pickup.lat},${pickup.lng}`;
  }, [pickup, hospital]);

  return (
    <div className={className ?? 'relative h-72 w-full rounded-2xl overflow-hidden border border-border z-0'}>
      <MapContainer
        center={[pickup.lat, pickup.lng]}
        zoom={14}
        scrollWheelZoom
        className="h-full w-full"
        style={{ background: '#e8eef4' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={fitPoints} />

        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} zIndexOffset={900} />

        {hospitalRoute.length >= 2 && (
          <Polyline
            positions={hospitalRoute}
            pathOptions={{ color: '#16a34a', weight: 4, opacity: 0.55, dashArray: '8 8' }}
          />
        )}

        {driverRoute.length === 2 && (
          <Polyline
            positions={driverRoute}
            pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.9 }}
          />
        )}

        {driver && <AnimatedDriverMarker position={driver} icon={driverMarkerIcon} />}

        {hospital && hospitalMarkerIcon && (
          <Marker position={[hospital.lat, hospital.lng]} icon={hospitalMarkerIcon} zIndexOffset={800} />
        )}
      </MapContainer>

      {showOpenMaps && (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-3 right-3 z-[500]">
          <Button size="sm" variant="secondary" className="gap-1.5 shadow-lg text-xs h-9">
            <ExternalLink className="h-3.5 w-3.5" />
            Open in Maps
          </Button>
        </a>
      )}
    </div>
  );
}

export function openRideInMaps(pickup: MapPoint, hospital?: HospitalMapPoint | null) {
  const url = hospital
    ? `https://www.google.com/maps/dir/?api=1&origin=${pickup.lat},${pickup.lng}&destination=${hospital.lat},${hospital.lng}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${pickup.lat},${pickup.lng}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
