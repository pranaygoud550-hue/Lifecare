import { useState, useEffect, useCallback } from 'react';
import { MapPin, Phone, Share2, Loader2, Navigation } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import {
  setEmergencyLocation,
  setActiveBooking,
  setEmergencyStep,
} from '@/features/emergency/emergencySlice';
import {
  useRequestEmergencySosMutation,
  useLazyGetTransportTrackQuery,
  useLazyGetTransportByTokenQuery,
  useRegenerateTrackingLinkMutation,
  useLazyGeocodeEmergencyAddressQuery,
} from '@/features/api/apiSlice';
import { LazyLiveTransportMap } from './LazyLiveTransportMap';
import { joinTransportTracking, getSocket } from '@/lib/socket';

type Phase = 'locating' | 'manual' | 'dispatching' | 'searching' | 'tracking';

export function EmergencySOSView() {
  const dispatch = useAppDispatch();
  const { guest, triage, location, activeBookingId } = useAppSelector((s) => s.emergency);
  const { user } = useAppSelector((s) => s.auth);

  const [phase, setPhase] = useState<Phase>('locating');
  const [manualAddress, setManualAddress] = useState('');
  const [bookingId, setBookingId] = useState<string | null>(activeBookingId);
  const [trackingToken, setTrackingToken] = useState<string | null>(null);
  const [driverInfo, setDriverInfo] = useState<{
    name: string;
    phone?: string;
    vehicleNumber?: string;
    location?: { lat: number; lng: number };
  } | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [otp, setOtp] = useState<string | null>(null);
  const [expandedSearch, setExpandedSearch] = useState(false);

  const [requestSos, { isLoading: sosLoading }] = useRequestEmergencySosMutation();
  const [fetchTrack] = useLazyGetTransportTrackQuery();
  const [fetchTrackByToken] = useLazyGetTransportByTokenQuery();
  const [regenerateLink] = useRegenerateTrackingLinkMutation();
  const [geocodeAddress] = useLazyGeocodeEmergencyAddressQuery();

  const patientName =
    guest?.name ||
    (user?.profile ? `${user.profile.firstName} ${user.profile.lastName}` : 'Patient');
  const patientPhone = guest?.phone || user?.phone || '';

  const captureLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setPhase('manual');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
        };
        dispatch(setEmergencyLocation(loc));
        setPhase('dispatching');
        void dispatchSos(loc);
      },
      () => {
        toast.info('Location blocked — enter your address manually');
        setPhase('manual');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, []);

  useEffect(() => {
    captureLocation();
  }, [captureLocation]);

  const dispatchSos = async (loc: { lat: number; lng: number; address: string }) => {
    setPhase('searching');
    try {
      const result = await requestSos({
        pickupLocation: {
          address: loc.address,
          coordinates: { lat: loc.lat, lng: loc.lng },
        },
        triage,
        guestContact: guest || undefined,
        patientDetails: {
          name: patientName,
          contactNumber: patientPhone,
          condition: 'Emergency SOS',
        },
        vehicleType: 'BLS',
      }).unwrap();

      const data = result.data;
      const id = data.booking._id;
      setBookingId(id);
      setTrackingToken(data.booking.trackingToken || null);
      setExpandedSearch(!!data.expandedSearch);
      setOtp(data.booking.otp || null);
      dispatch(setActiveBooking({ bookingId: id, trackingToken: data.booking.trackingToken }));

      if (data.match) {
        setDriverInfo({
          name: data.match.driverName,
          phone: data.match.phone,
          vehicleNumber: data.match.vehicleNumber,
        });
        setPhase('tracking');
      } else {
        setPhase('searching');
      }

      joinTransportTracking(id);
      const socket = getSocket();
      socket.on('transport:accepted', () => {
        toast.success('A driver has accepted your request!');
        void refreshTrack(id);
      });
      socket.on('transport:location', (payload: { location: { lat: number; lng: number } }) => {
        setDriverInfo((prev) => ({
          name: prev?.name || 'Attendant',
          phone: prev?.phone,
          vehicleNumber: prev?.vehicleNumber,
          location: payload.location,
        }));
      });
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      toast.error(error.data?.message || 'Could not send SOS');
      setPhase('manual');
    }
  };

  const refreshTrack = async (id: string) => {
    try {
      const res = trackingToken
        ? await fetchTrackByToken(trackingToken).unwrap()
        : await fetchTrack(id).unwrap();
      const t = res.data;
      if (t.driver) {
        setDriverInfo({
          name: t.driver.name,
          phone: t.driver.phone,
          vehicleNumber: t.driver.vehicleNumber,
          location: t.driver.location,
        });
        setPhase('tracking');
      }
      setEtaMinutes(t.etaMinutes ?? null);
    } catch {
      /* polling fallback */
    }
  };

  useEffect(() => {
    if (!bookingId || phase !== 'searching') return;
    const interval = setInterval(() => void refreshTrack(bookingId), 8000);
    return () => clearInterval(interval);
  }, [bookingId, phase]);

  useEffect(() => {
    if (!bookingId || phase !== 'tracking') return;
    const interval = setInterval(() => void refreshTrack(bookingId), 8000);
    return () => clearInterval(interval);
  }, [bookingId, phase]);

  const handleManualSubmit = async () => {
    if (!manualAddress.trim()) return;
    try {
      const geo = await geocodeAddress(manualAddress.trim()).unwrap();
      const { lat, lng, displayName } = geo.data!;
      const loc = { lat, lng, address: displayName };
      dispatch(setEmergencyLocation(loc));
      void dispatchSos(loc);
    } catch {
      toast.error('Could not find that address. Try "Area, City" e.g. Hyderabad, Telangana');
    }
  };

  const handleShare = async () => {
    if (!bookingId) return;
    let token = trackingToken;
    if (!token) {
      const res = await regenerateLink(bookingId).unwrap();
      token = res.data.trackingToken;
      setTrackingToken(token);
    }
    const url = `${window.location.origin}/track/${token}`;
    if (navigator.share) {
      await navigator.share({ title: 'Live location', url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Tracking link copied (valid 4 hours)');
    }
  };

  if (phase === 'locating' || phase === 'dispatching') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
        <div className="w-24 h-24 rounded-full bg-red-500/30 flex items-center justify-center mb-8 animate-pulse-urgent">
          <Loader2 className="h-12 w-12 text-white animate-spin" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">Getting your location...</h2>
        <p className="text-xl text-red-100">Please allow location access</p>
      </div>
    );
  }

  if (phase === 'manual') {
    return (
      <div className="flex flex-col flex-1 p-6 max-w-lg mx-auto w-full">
        <h2 className="text-2xl font-bold text-white mb-4">Enter your address</h2>
        <Label className="text-lg text-white">Where do you need help?</Label>
        <Input
          value={manualAddress}
          onChange={(e) => setManualAddress(e.target.value)}
          placeholder="House no, street, landmark, city"
          className="mt-2 h-14 text-lg bg-white"
        />
        <Button
          className="mt-6 h-14 text-lg bg-white text-red-700"
          onClick={handleManualSubmit}
          disabled={sosLoading || !manualAddress.trim()}
        >
          Send I Need Help Now
        </Button>
        <Button variant="ghost" className="mt-3 text-white" onClick={captureLocation}>
          <Navigation className="h-4 w-4 mr-2" /> Try GPS again
        </Button>
      </div>
    );
  }

  if (phase === 'searching') {
    return (
      <div className="flex flex-col flex-1 p-6 sm:p-8">
        <div className="text-center mb-8 animate-pulse-urgent">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Finding nearest help...</h2>
          <p className="text-xl text-red-100">
            {expandedSearch
              ? 'Searching a wider area — wait may be longer'
              : 'Connecting you to the closest available attendant'}
          </p>
        </div>
        <div className="flex justify-center mb-8">
          <Loader2 className="h-16 w-16 text-white animate-spin" />
        </div>
        {location && (
          <p className="text-center text-red-100 flex items-center justify-center gap-2 text-lg">
            <MapPin className="h-5 w-5" /> {location.address}
          </p>
        )}
        <Button
          variant="outline"
          className="mt-8 border-white text-white hover:bg-white/10 h-12 text-lg"
          onClick={() => bookingId && dispatch(setEmergencyStep('help-coming'))}
          disabled={!bookingId}
        >
          View booking status
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6 bg-red-700 text-white text-center">
        <h2 className="text-2xl font-bold">Help is on the way</h2>
        {etaMinutes != null && (
          <p className="text-3xl font-bold mt-2">{etaMinutes} min ETA</p>
        )}
      </div>

      {location && (
        <LazyLiveTransportMap
          patient={location}
          driver={driverInfo?.location}
          className="h-72 w-full"
        />
      )}

      <div className="p-6 space-y-4 bg-white flex-1">
        {driverInfo && (
          <div className="p-4 rounded-xl border-2 border-border">
            <p className="text-lg font-bold">{driverInfo.name}</p>
            {driverInfo.vehicleNumber && (
              <p className="text-lg text-muted">Vehicle: {driverInfo.vehicleNumber}</p>
            )}
            {driverInfo.phone && (
              <a
                href={`tel:${driverInfo.phone}`}
                className="inline-flex items-center gap-2 mt-3 text-lg font-semibold text-primary"
              >
                <Phone className="h-5 w-5" /> Call attendant
              </a>
            )}
          </div>
        )}

        {otp && (
          <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-200 text-center">
            <p className="text-lg font-medium text-amber-900">Your safety code</p>
            <p className="text-4xl font-bold tracking-widest text-amber-950 mt-1">{otp}</p>
            <p className="text-base text-amber-800 mt-2">
              Ask the attendant to say this code when they arrive
            </p>
          </div>
        )}

        <Button className="w-full h-14 text-lg gap-2" onClick={handleShare}>
          <Share2 className="h-5 w-5" /> Share live location with family
        </Button>

        <Button
          className="w-full h-14 text-lg"
          variant="outline"
          onClick={() => dispatch(setEmergencyStep('help-coming'))}
        >
          Full booking details
        </Button>

        <a href="tel:108" className="block">
          <Button variant="danger" className="w-full h-14 text-lg">
            Call national emergency 108
          </Button>
        </a>
      </div>
    </div>
  );
}
