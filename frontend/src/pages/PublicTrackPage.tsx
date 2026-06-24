import { useParams } from 'react-router-dom';
import { useGetTransportByTokenQuery } from '@/features/api/apiSlice';
import { useVisiblePollingInterval } from '@/hooks/usePageVisible';
import { LazyRideLiveMap } from '@/components/emergency/LazyRideLiveMap';
import { openRideInMaps } from '@/lib/rideMapUtils';
import { Loader2, MapPin, Phone, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PublicTrackPage() {
  const { token } = useParams<{ token: string }>();
  const pollMs = useVisiblePollingInterval(8000);
  const { data, isLoading, error } = useGetTransportByTokenQuery(token!, {
    skip: !token,
    pollingInterval: pollMs,
  });

  const track = data?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center elder-text bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="container-custom py-16 text-center elder-text">
        <h1 className="text-2xl font-bold">Link expired or invalid</h1>
        <p className="text-lg text-muted mt-2">Tracking links are valid for 4 hours</p>
      </div>
    );
  }

  const pickup = track.patientLocation;
  const hospital = track.hospitalLocation ?? null;

  return (
    <div className="min-h-screen bg-slate-950 text-white elder-text">
      <div className="bg-slate-900 p-5 text-center border-b border-white/10">
        <p className="text-xs uppercase tracking-widest text-slate-400">Family live tracking</p>
        <h1 className="text-2xl font-bold mt-1">Ride in progress</h1>
        <p className="text-lg mt-1 capitalize text-slate-300">
          Status: {track.booking.status?.replace(/-/g, ' ')}
        </p>
        {track.etaMinutes != null && (
          <p className="text-3xl font-bold mt-2 text-blue-400">{track.etaMinutes} min away</p>
        )}
      </div>

      {pickup && (
        <LazyRideLiveMap
          pickup={pickup}
          driver={track.driver?.location}
          hospital={hospital}
          vehicleType={track.booking.vehicleType}
          rideStatus={track.booking.status}
          className="h-[50vh] w-full rounded-none border-0"
          showOpenMaps
        />
      )}

      <div className="container-custom py-6 space-y-4">
        {track.driver && (
          <div className="p-5 rounded-2xl border border-white/10 bg-white/5">
            <p className="text-xl font-bold">{track.driver.name}</p>
            {track.driver.vehicleNumber && (
              <p className="text-lg text-slate-400">Vehicle: {track.driver.vehicleNumber}</p>
            )}
            {track.driver.phone && (
              <a
                href={`tel:${track.driver.phone}`}
                className="inline-flex items-center gap-2 mt-3 text-lg text-blue-400 font-semibold"
              >
                <Phone className="h-5 w-5" /> Call driver
              </a>
            )}
          </div>
        )}

        {hospital && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/30">
            <p className="text-sm font-bold text-emerald-300 flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Hospital destination
            </p>
            <p className="font-semibold mt-1">{hospital.name}</p>
            {hospital.address && <p className="text-sm text-slate-400 mt-1">{hospital.address}</p>}
          </div>
        )}

        {track.booking.pickupLocation?.address && (
          <p className="text-lg flex items-start gap-2 text-slate-300">
            <MapPin className="h-5 w-5 shrink-0 text-blue-400" />
            Pickup: {track.booking.pickupLocation.address}
          </p>
        )}

        <Button
          className="w-full h-12 gap-2"
          onClick={() => openRideInMaps(pickup, hospital)}
        >
          <MapPin className="h-5 w-5" /> Open route in Google Maps
        </Button>

        <p className="text-base text-slate-500 text-center">Read-only guardian view · no login required</p>
      </div>
    </div>
  );
}
