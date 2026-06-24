import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  List,
  Map as MapIcon,
  Phone,
  Navigation,
  Star,
  Filter,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientOnly } from '@/components/emergency/MapWrapper';
import { useGetNearbyGoogleHospitalsQuery } from '@/features/api/apiSlice';
import type { GoogleHospitalPlace } from '@/types/googleMaps';
import { cn } from '@/lib/utils';

const DEMO = { lat: 17.385, lng: 78.4867 };

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 0 0 5px rgba(37,99,235,.4);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const hospitalIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;background:#dc2626;border:3px solid white;border-radius:4px;box-shadow:0 0 0 4px rgba(239,68,68,.35);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

type FilterType = 'all' | 'hospital' | 'clinic' | 'pharmacy' | 'diagnostic';
type SortType = 'distance' | 'rating' | 'open';

function FitBounds({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }
    map.fitBounds(
      L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])),
      { padding: [48, 48], maxZoom: 16 }
    );
  }, [map, points]);
  return null;
}

function openDirections(place: GoogleHospitalPlace) {
  const { lat, lng } = place.coordinates;
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${place.place_id}`,
    '_blank'
  );
}

function HospitalCard({
  hospital,
  onSelect,
  selected,
}: {
  hospital: GoogleHospitalPlace;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <article
      className={cn(
        'rounded-xl border p-4 transition-colors cursor-pointer',
        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
      )}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{hospital.name}</h3>
          <p className="text-sm text-muted truncate">{hospital.address}</p>
        </div>
        <Badge variant={hospital.isOpen ? 'success' : 'secondary'}>
          {hospital.isOpen === null ? 'Hours N/A' : hospital.isOpen ? 'Open' : 'Closed'}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted">
        <span className="font-medium text-foreground">{hospital.distance}</span>
        {hospital.rating != null && (
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {hospital.rating.toFixed(1)}
          </span>
        )}
        {hospital.isEmergency && <Badge variant="danger">Emergency</Badge>}
      </div>

      {hospital.specialtyTags && hospital.specialtyTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {hospital.specialtyTags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        {hospital.phone && (
          <Button asChild size="sm" variant="outline" className="h-9">
            <a href={`tel:${hospital.phone.replace(/\s/g, '')}`}>
              <Phone className="h-4 w-4 mr-1" /> Call
            </a>
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-9" onClick={() => openDirections(hospital)}>
          <Navigation className="h-4 w-4 mr-1" /> Directions
        </Button>
        <Button asChild size="sm" className="h-9 col-span-2 sm:col-span-1">
          <Link to={`/doctors?hospital=${encodeURIComponent(hospital.name)}`}>Book appointment</Link>
        </Button>
      </div>
    </article>
  );
}

export function GoogleHospitalsExplorer() {
  const [view, setView] = useState<'map' | 'list'>('map');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('distance');
  const [openNow, setOpenNow] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const locate = useCallback(() => {
    setLocating(true);
    if (!navigator.geolocation) {
      setUserLocation(DEMO);
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setUserLocation(DEMO);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => locate(), 0);
    return () => clearTimeout(timer);
  }, [locate]);

  const { data, isLoading, isFetching, refetch } = useGetNearbyGoogleHospitalsQuery(
    {
      lat: userLocation!.lat,
      lng: userLocation!.lng,
      radius: 8,
      type: filterType,
      sort,
      openNow,
    },
    { skip: !userLocation }
  );

  const hospitals = useMemo(
    () => data?.data?.hospitals ?? [],
    [data?.data?.hospitals]
  );

  const selected = hospitals.find((h) => h.place_id === selectedId) ?? hospitals[0] ?? null;

  const mapPoints = useMemo(
    () => (userLocation ? [userLocation, ...hospitals.map((h) => h.coordinates)] : hospitals.map((h) => h.coordinates)),
    [userLocation, hospitals]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            Nearby hospitals
          </h1>
          <p className="text-sm text-muted mt-1">
            Live data from Google Places · {data?.data?.source === 'database' ? 'demo fallback (add API key)' : 'Google Places'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-4 w-4 mr-1', isFetching && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            variant={view === 'map' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('map')}
          >
            <MapIcon className="h-4 w-4 mr-1" /> Map
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
          >
            <List className="h-4 w-4 mr-1" /> List
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
        <Filter className="h-4 w-4 text-muted shrink-0" />
        {(['all', 'hospital', 'clinic', 'pharmacy', 'diagnostic'] as FilterType[]).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={filterType === t ? 'default' : 'ghost'}
            className="capitalize h-8"
            onClick={() => setFilterType(t)}
          >
            {t === 'all' ? 'All' : t.replace('diagnostic', 'Diagnostic')}
          </Button>
        ))}
        <span className="w-px h-6 bg-border hidden sm:block" />
        {(['distance', 'rating', 'open'] as SortType[]).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={sort === s ? 'secondary' : 'ghost'}
            className="capitalize h-8"
            onClick={() => setSort(s)}
          >
            {s === 'open' ? 'Open now' : s}
          </Button>
        ))}
        <Button
          size="sm"
          variant={openNow ? 'default' : 'ghost'}
          className="h-8 ml-auto"
          onClick={() => setOpenNow((v) => !v)}
        >
          Open only
        </Button>
      </div>

      {locating || !userLocation ? (
        <div className="h-64 rounded-xl bg-muted animate-pulse flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted" />
        </div>
      ) : isLoading ? (
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      ) : hospitals.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted">
          No facilities found within 8 km. Try expanding filters or refresh location.
        </div>
      ) : view === 'map' ? (
        <ClientOnly fallback={<div className="h-[420px] bg-muted animate-pulse rounded-xl" />}>
          <div className="grid lg:grid-cols-[1fr_340px] gap-4">
            <div className="h-[420px] rounded-xl overflow-hidden border border-border">
              <MapContainer
                center={[userLocation.lat, userLocation.lng]}
                zoom={13}
                scrollWheelZoom
                className="h-full w-full z-0"
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FitBounds points={mapPoints} />
                <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} zIndexOffset={900}>
                  <Popup>You are here</Popup>
                </Marker>
                {hospitals.map((h) => (
                  <Marker
                    key={h.place_id}
                    position={[h.coordinates.lat, h.coordinates.lng]}
                    icon={hospitalIcon}
                    eventHandlers={{
                      click: () => setSelectedId(h.place_id),
                    }}
                  >
                    <Popup>
                      <div className="text-sm space-y-1 min-w-[180px]">
                        <p className="font-bold">{h.name}</p>
                        <p>{h.distance} · {h.rating != null ? `${h.rating}★` : 'No rating'}</p>
                        <Button size="sm" className="w-full mt-2" onClick={() => openDirections(h)}>
                          Get directions
                        </Button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {selected && <HospitalCard hospital={selected} onSelect={() => {}} selected />}
              {hospitals
                .filter((h) => h.place_id !== selected?.place_id)
                .slice(0, 6)
                .map((h) => (
                  <HospitalCard
                    key={h.place_id}
                    hospital={h}
                    onSelect={() => setSelectedId(h.place_id)}
                    selected={false}
                  />
                ))}
            </div>
          </div>
        </ClientOnly>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {hospitals.map((h) => (
            <HospitalCard
              key={h.place_id}
              hospital={h}
              onSelect={() => setSelectedId(h.place_id)}
              selected={selectedId === h.place_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
