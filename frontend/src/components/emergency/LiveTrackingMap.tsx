import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { HospitalMapLocation, MapCoordinate } from '@/features/emergency/emergencySlice';

const patientIcon = L.divIcon({
  className: 'emergency-map-marker',
  html: `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
      <div style="width:18px;height:18px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 0 0 6px rgba(37,99,235,.35);animation:emergency-pulse 1.5s infinite;"></div>
      <span style="margin-top:4px;background:#1d4ed8;color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;white-space:nowrap;">You are here</span>
    </div>
  `,
  iconSize: [90, 42],
  iconAnchor: [45, 12],
});

const ambulanceIcon = L.divIcon({
  className: 'emergency-map-marker',
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <div style="background:#dc2626;color:white;font-size:16px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);">🚑</div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function hospitalIcon(name: string) {
  return L.divIcon({
    className: 'emergency-map-marker',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;max-width:120px;">
        <div style="background:#16a34a;color:white;font-size:14px;font-weight:800;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:6px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25);">✚</div>
        <span style="margin-top:4px;background:#14532d;color:white;font-size:9px;font-weight:600;padding:2px 5px;border-radius:4px;text-align:center;line-height:1.2;">${name.replace(/"/g, '')}</span>
      </div>
    `,
    iconSize: [120, 48],
    iconAnchor: [60, 14],
  });
}

function FitAllMarkers({
  patient,
  ambulance,
  hospital,
}: {
  patient: MapCoordinate;
  ambulance?: MapCoordinate | null;
  hospital?: HospitalMapLocation | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points: L.LatLngExpression[] = [[patient.lat, patient.lng]];
    if (ambulance) points.push([ambulance.lat, ambulance.lng]);
    if (hospital) points.push([hospital.lat, hospital.lng]);

    if (points.length === 1) {
      map.setView([patient.lat, patient.lng], 15);
      return;
    }

    map.fitBounds(L.latLngBounds(points), { padding: [56, 56], maxZoom: 16 });
  }, [map, patient.lat, patient.lng, ambulance?.lat, ambulance?.lng, hospital?.lat, hospital?.lng]);

  return null;
}

function AnimatedAmbulanceMarker({ position }: { position: MapCoordinate }) {
  const markerRef = useRef<L.Marker | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const start = marker.getLatLng();
    const end = L.latLng(position.lat, position.lng);
    const duration = 800;
    const startTime = performance.now();

    const animate = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const lat = start.lat + (end.lat - start.lat) * t;
      const lng = start.lng + (end.lng - start.lng) * t;
      marker.setLatLng([lat, lng]);
      if (t < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [position.lat, position.lng]);

  return (
    <Marker
      ref={markerRef}
      position={[position.lat, position.lng]}
      icon={ambulanceIcon}
      zIndexOffset={1000}
    >
      <Tooltip direction="top" offset={[0, -12]} opacity={1} permanent>
        Ambulance
      </Tooltip>
    </Marker>
  );
}

export interface LiveTrackingMapProps {
  patientLocation: MapCoordinate;
  ambulanceLocation?: MapCoordinate | null;
  hospitalLocation?: HospitalMapLocation | null;
  className?: string;
}

export function LiveTrackingMap({
  patientLocation,
  ambulanceLocation,
  hospitalLocation,
  className,
}: LiveTrackingMapProps) {
  const [hospitalMarkerIcon, setHospitalMarkerIcon] = useState<L.DivIcon | null>(null);

  useEffect(() => {
    if (hospitalLocation) {
      setHospitalMarkerIcon(hospitalIcon(hospitalLocation.name));
    }
  }, [hospitalLocation?.name, hospitalLocation?.lat, hospitalLocation?.lng]);

  const routeLine = useMemo(() => {
    if (!ambulanceLocation) return [];
    return [
      [ambulanceLocation.lat, ambulanceLocation.lng],
      [patientLocation.lat, patientLocation.lng],
    ] as [number, number][];
  }, [ambulanceLocation, patientLocation]);

  return (
    <div className={className ?? 'h-72 w-full rounded-2xl overflow-hidden border border-red-500/30 z-0'}>
      <MapContainer
        center={[patientLocation.lat, patientLocation.lng]}
        zoom={14}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ background: '#1a0505' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitAllMarkers
          patient={patientLocation}
          ambulance={ambulanceLocation}
          hospital={hospitalLocation}
        />

        <Marker position={[patientLocation.lat, patientLocation.lng]} icon={patientIcon} zIndexOffset={900} />

        {routeLine.length === 2 && (
          <Polyline
            positions={routeLine}
            pathOptions={{
              color: '#ef4444',
              weight: 4,
              opacity: 0.85,
              dashArray: '10 10',
            }}
          />
        )}

        {ambulanceLocation && <AnimatedAmbulanceMarker position={ambulanceLocation} />}

        {hospitalLocation && hospitalMarkerIcon && (
          <Marker
            position={[hospitalLocation.lat, hospitalLocation.lng]}
            icon={hospitalMarkerIcon}
            zIndexOffset={800}
          />
        )}
      </MapContainer>
    </div>
  );
}
