import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Navigation } from 'lucide-react';
import { useGetEmergencyNearbyHospitalsQuery } from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const DEMO_LOCATION = { lat: 17.385, lng: 78.4867 };

/** Leaflet-free hospital summary for profile (avoids map init crashes). */
export function HospitalNearbySummary() {
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
    const timer = setTimeout(() => resolveLocation(), 0);
    return () => clearTimeout(timer);
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

  const distanceKm =
    nearest?.distanceMeters != null ? (nearest.distanceMeters / 1000).toFixed(1) : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          {t('map.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {locating || isLoading ? (
          <div className="h-16 rounded-lg bg-muted animate-pulse" aria-busy />
        ) : !hospitalPoint ? (
          <p className="text-sm text-muted">{t('map.noHospitals')}</p>
        ) : (
          <div className="rounded-xl border border-border bg-background p-4 space-y-1">
            <p className="font-semibold text-foreground">{hospitalPoint.name}</p>
            {nearest?.address && <p className="text-sm text-muted line-clamp-2">{nearest.address}</p>}
            {distanceKm && (
              <p className="text-xs text-primary font-medium">
                ~{distanceKm} km {t('map.away', { defaultValue: 'away' })}
              </p>
            )}
          </div>
        )}
        <Button variant="outline" className="w-full gap-2" asChild>
          <Link to="/hospitals/nearby">
            <Navigation className="h-4 w-4" />
            {t('map.openFullMap', { defaultValue: 'Open hospital map' })}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
