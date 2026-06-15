import { useEffect, useState } from 'react';
import { useVisiblePollingInterval } from '@/hooks/usePageVisible';
import { Phone, Share2, X, Shield, Star, MapPin, Navigation, Building2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { closeEmergency } from '@/features/emergency/emergencySlice';
import {
  useGetTransportTrackQuery,
  useGetTransportByTokenQuery,
  useCancelTransportMutation,
  useRegenerateTrackingLinkMutation,
} from '@/features/api/apiSlice';
import { LazyRideLiveMap, openRideInMaps } from '@/components/emergency/LazyRideLiveMap';
import { getInitials } from '@/lib/utils';
import { joinTransportTracking } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { FALLBACK_PICKUP } from '@/lib/pickupLocation';

const STATUS_STEPS = [
  { key: 'requested', label: 'Finding ride' },
  { key: 'accepted', label: 'Driver assigned' },
  { key: 'en-route-to-patient', label: 'Coming to you' },
  { key: 'patient-picked-up', label: 'Picked up' },
  { key: 'en-route-to-hospital', label: 'To hospital' },
  { key: 'completed', label: 'Arrived' },
] as const;

function statusIndex(status: string) {
  const i = STATUS_STEPS.findIndex((s) => s.key === status);
  return i >= 0 ? i : 0;
}

export function HelpComingView() {
  const dispatch = useAppDispatch();
  const { activeBookingId, location, trackingToken } = useAppSelector((s) => s.emergency);
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const [etaSeconds, setEtaSeconds] = useState(12 * 60);
  const [cancelTransport] = useCancelTransportMutation();
  const [regenerateLink] = useRegenerateTrackingLinkMutation();

  const trackPollMs = useVisiblePollingInterval(8000);
  const { data: authData } = useGetTransportTrackQuery(activeBookingId!, {
    skip: !activeBookingId || !isAuthenticated,
    pollingInterval: trackPollMs,
  });
  const { data: tokenData } = useGetTransportByTokenQuery(trackingToken!, {
    skip: !trackingToken || isAuthenticated,
    pollingInterval: trackPollMs,
  });
  const data = isAuthenticated ? authData : tokenData;

  const track = data?.data;
  const booking = track?.booking;
  const driver = track?.driver;
  const otp = track?.tracking?.otp || booking?.otp;
  const rideStatus = booking?.status || 'requested';

  useEffect(() => {
    if (activeBookingId) joinTransportTracking(activeBookingId);
  }, [activeBookingId]);

  useEffect(() => {
    if (track?.etaMinutes == null) return;
    setEtaSeconds(track.etaMinutes * 60);
    const t = setInterval(() => setEtaSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [track?.etaMinutes]);

  const formatEta = () => {
    const m = Math.floor(etaSeconds / 60);
    const s = etaSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleShare = async () => {
    if (!activeBookingId) return;
    const res = await regenerateLink(activeBookingId).unwrap();
    const url = `${window.location.origin}/track/${res.data.trackingToken}`;
    await navigator.clipboard.writeText(url);
    toast.success('Family tracking link copied (valid 4 hours)');
  };

  const handleCancel = async () => {
    if (!activeBookingId || !confirm('Cancel this booking? Refund applies per policy.')) return;
    try {
      await cancelTransport(activeBookingId).unwrap();
      toast.success('Booking cancelled');
      dispatch(closeEmergency());
    } catch {
      toast.error('Could not cancel');
    }
  };

  if (!activeBookingId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-white text-xl">
        No active booking
      </div>
    );
  }

  const pickup =
    track?.patientLocation ||
    (location ? { lat: location.lat, lng: location.lng } : { lat: FALLBACK_PICKUP.lat, lng: FALLBACK_PICKUP.lng });

  const hospital = track?.hospitalLocation ?? null;
  const currentStep = statusIndex(rideStatus);

  return (
    <div className="flex flex-col flex-1 overflow-y-auto bg-slate-950 text-white min-h-screen">
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Live ride · like Rapido/Uber</p>
            <h2 className="text-2xl font-bold mt-0.5">
              {rideStatus === 'completed' ? 'Ride complete' : 'Your ride is on the way'}
            </h2>
          </div>
          <Badge className="bg-blue-600 text-white border-0 text-lg px-3 py-1 tabular-nums">
            {formatEta()}
          </Badge>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          {rideStatus === 'en-route-to-hospital'
            ? `ETA to hospital · ${track?.etaToHospital ?? track?.etaMinutes ?? '—'} min trip`
            : `Driver ETA · ${track?.etaMinutes ?? '—'} min`}
        </p>
      </div>

      <LazyRideLiveMap
        pickup={pickup}
        driver={driver?.location}
        hospital={hospital}
        vehicleType={booking?.vehicleType}
        rideStatus={rideStatus}
        className="h-[45vh] min-h-[280px] w-full rounded-none border-0 border-b border-white/10"
        showOpenMaps
      />

      <div className="px-4 py-3 flex gap-1 overflow-x-auto scrollbar-hide bg-slate-900/80">
        {STATUS_STEPS.map((step, i) => (
          <div
            key={step.key}
            className={cn(
              'flex items-center gap-1.5 shrink-0 text-xs px-2.5 py-1.5 rounded-full border',
              i <= currentStep
                ? 'bg-blue-600/30 border-blue-400 text-blue-100'
                : 'border-white/10 text-slate-500'
            )}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                i < currentStep ? 'bg-green-400' : i === currentStep ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'
              )}
            />
            {step.label}
          </div>
        ))}
      </div>

      <div className="p-4 sm:p-6 space-y-5 flex-1">
        {driver && (
          <div className="flex gap-4 items-start p-4 rounded-2xl border border-white/10 bg-white/5">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl bg-blue-600/20 text-blue-200">
                {getInitials(driver.name.split(' ')[0], driver.name.split(' ')[1])}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xl font-bold truncate">{driver.name}</p>
                <Badge variant="success" className="gap-1 shrink-0">
                  <Shield className="h-3 w-3" /> Verified
                </Badge>
              </div>
              {driver.rating != null && (
                <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {driver.rating.toFixed(1)} · LifeCare+ partner
                </p>
              )}
              {driver.vehicleNumber && (
                <p className="text-base mt-1">{driver.vehicleNumber}</p>
              )}
            </div>
          </div>
        )}

        {hospital && (
          <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/40">
            <p className="text-xs font-bold uppercase text-emerald-300 flex items-center gap-1 mb-1">
              <Building2 className="h-4 w-4" /> Nearest hospital on route
            </p>
            <p className="font-bold text-lg">{hospital.name}</p>
            {hospital.address && (
              <p className="text-sm text-emerald-100/80 mt-1 flex gap-1.5">
                <MapPin className="h-4 w-4 shrink-0" />
                {hospital.address}
              </p>
            )}
          </div>
        )}

        {otp && rideStatus !== 'completed' && (
          <div className="p-5 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-center">
            <p className="text-sm font-semibold text-amber-100">Share this OTP only when your ride arrives</p>
            <p className="text-5xl font-black tracking-[0.3em] text-amber-50 my-2">{otp}</p>
          </div>
        )}

        {booking?.pickupLocation?.address && (
          <p className="text-sm text-slate-400 flex items-start gap-2">
            <Navigation className="h-4 w-4 shrink-0 mt-0.5 text-blue-400" />
            Pickup: {booking.pickupLocation.address}
          </p>
        )}

        <div className="grid gap-3">
          <Button
            variant="secondary"
            className="w-full h-12 gap-2 bg-white text-slate-900 hover:bg-slate-100"
            onClick={() => openRideInMaps(pickup, hospital)}
          >
            <MapPin className="h-5 w-5" /> Open full route in Google Maps
          </Button>
          {driver?.phone && (
            <a href={`tel:${driver.phone}`}>
              <Button className="w-full h-12 text-base gap-2">
                <Phone className="h-5 w-5" /> Call driver
              </Button>
            </a>
          )}
          <Button variant="outline" className="w-full h-12 gap-2 border-white/20 text-white hover:bg-white/10" onClick={handleShare}>
            <Share2 className="h-5 w-5" /> Share live track with family
          </Button>
          {rideStatus !== 'completed' && (
            <Button
              variant="outline"
              className="w-full h-12 text-red-300 border-red-400/40 hover:bg-red-950/50"
              onClick={handleCancel}
            >
              <X className="h-5 w-5 mr-2" /> Cancel ride
            </Button>
          )}
        </div>

        <p className="text-xs text-slate-500 text-center">Booking ref: {booking?.bookingId}</p>
      </div>
    </div>
  );
}
