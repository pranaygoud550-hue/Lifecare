import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const patientIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background:#0066ff;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const ambulanceIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background:#dc2626;width:20px;height:20px;border-radius:4px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)">🚑</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface LiveTransportMapProps {
  patient: { lat: number; lng: number };
  driver?: { lat: number; lng: number } | null;
  className?: string;
}

export function LiveTransportMap({ patient, driver, className }: LiveTransportMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const patientMarker = useRef<L.Marker | null>(null);
  const driverMarker = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, { zoomControl: true }).setView(
      [patient.lat, patient.lng],
      14
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(mapInstance.current);

    patientMarker.current = L.marker([patient.lat, patient.lng], { icon: patientIcon }).addTo(
      mapInstance.current
    );
    patientMarker.current.bindPopup('Your location');

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, [patient.lat, patient.lng]);

  useEffect(() => {
    if (!mapInstance.current) return;

    if (driver) {
      if (!driverMarker.current) {
        driverMarker.current = L.marker([driver.lat, driver.lng], { icon: ambulanceIcon }).addTo(
          mapInstance.current
        );
        driverMarker.current.bindPopup('Help on the way');
      } else {
        driverMarker.current.setLatLng([driver.lat, driver.lng]);
      }
      const bounds = L.latLngBounds(
        [patient.lat, patient.lng],
        [driver.lat, driver.lng]
      );
      mapInstance.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [driver, patient]);

  return <div ref={mapRef} className={className || 'h-64 w-full rounded-xl z-0'} />;
}
