import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Ambulance, Car, Accessibility, Bike, Stethoscope, MapPin, Calendar, User, Navigation, Loader2,
} from 'lucide-react';
import { useRequestTransportMutation, useGetHospitalsQuery, useLazyGetEmergencyNearbyHospitalsQuery } from '@/features/api/apiSlice';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils';
import { setActiveBooking, setEmergencyLocation } from '@/features/emergency/emergencySlice';
import { useEmergencyLocation } from '@/hooks/useEmergencyLocation';
import { RideLiveMap } from '@/components/emergency/RideLiveMap';
import type { EmergencyHospitalInfo } from '@/types';

const VEHICLES = [
  {
    id: 'basic_ambulance',
    name: 'Basic Ambulance',
    description: 'Serious illness — oxygen & emergency equipment',
    icon: Ambulance,
    price: 1200,
  },
  {
    id: 'medical_cab',
    name: 'Medical Cab',
    description: 'Regular hospital visits — AC, comfortable',
    icon: Car,
    price: 450,
  },
  {
    id: 'wheelchair_van',
    name: 'Wheelchair Van',
    description: 'Mobility support — ramp equipped',
    icon: Accessibility,
    price: 650,
  },
  {
    id: 'bike_ambulance',
    name: 'Bike Ambulance',
    description: 'Fastest in traffic — urban areas',
    icon: Bike,
    price: 350,
  },
  {
    id: 'home_visit_doctor',
    name: 'Home Visit Doctor',
    description: 'Doctor comes to you — no travel needed',
    icon: Stethoscope,
    price: 800,
  },
];

function getNextDays(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

type HelpChooserState = {
  fromHelpChooser?: boolean;
  helpType?: string;
  nearestHospital?: {
    name: string;
    address: string;
    _id?: string;
    coordinates?: { lat: number; lng: number };
  };
  pickupLocation?: { lat: number; lng: number; address?: string };
  prefillVehicle?: string;
  destinationNotes?: string;
};

export function TransportEscortPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const helpState = (location.state as HelpChooserState | null) ?? {};
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [vehicle, setVehicle] = useState(helpState.prefillVehicle ?? 'medical_cab');
  const [date, setDate] = useState(getNextDays(1)[0]);
  const [time, setTime] = useState('09:00');
  const [address, setAddress] = useState(
    user?.profile?.address
      ? [user.profile.address.street, user.profile.address.city, user.profile.address.pincode]
          .filter(Boolean)
          .join(', ')
      : ''
  );
  const [hospitalQuery, setHospitalQuery] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<{
    name: string;
    address: string;
    coordinates?: { lat: number; lng: number };
  } | null>(
    helpState.nearestHospital
      ? {
          name: helpState.nearestHospital.name,
          address: helpState.nearestHospital.address,
          coordinates: helpState.nearestHospital.coordinates,
        }
      : null
  );
  const [notes, setNotes] = useState(helpState.destinationNotes ?? '');
  const [bookedFor, setBookedFor] = useState<'self' | 'other'>('self');
  const [otherName, setOtherName] = useState('');
  const [otherRelation, setOtherRelation] = useState('');

  const [fetchNearbyHospitals] = useLazyGetEmergencyNearbyHospitalsQuery();
  const geo = useEmergencyLocation(true, true);

  useEffect(() => {
    if (helpState.pickupLocation?.lat) return;
    if (geo.lat == null || geo.lng == null) return;
    dispatch(
      setEmergencyLocation({
        lat: geo.lat,
        lng: geo.lng,
        address: address || 'Your current location',
      })
    );
  }, [geo.lat, geo.lng, dispatch, helpState.pickupLocation, address]);

  useEffect(() => {
    if (selectedHospital?.coordinates || geo.lat == null || geo.lng == null) return;
    void fetchNearbyHospitals({ lat: geo.lat, lng: geo.lng, radius: 15 })
      .unwrap()
      .then((res) => {
        const nearest = res.data?.hospitals?.[0] as EmergencyHospitalInfo | undefined;
        if (nearest && !selectedHospital) {
          setSelectedHospital({
            name: nearest.name,
            address: nearest.address,
            coordinates: nearest.coordinates ?? undefined,
          });
          setHospitalQuery(nearest.name);
        }
      })
      .catch(() => {});
  }, [geo.lat, geo.lng, fetchNearbyHospitals, selectedHospital]);

  const pickupCoords = helpState.pickupLocation
    ? { lat: helpState.pickupLocation.lat, lng: helpState.pickupLocation.lng }
    : geo.lat != null && geo.lng != null
      ? { lat: geo.lat, lng: geo.lng }
      : null;

  const useMyLocation = () => {
    if (geo.lat == null || geo.lng == null) {
      toast.error(geo.error || 'Could not get GPS location');
      return;
    }
    setAddress(
      address.trim() ||
        `Near ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}${geo.accuracy ? ` (±${Math.round(geo.accuracy)}m)` : ''}`
    );
    toast.success('Pickup set to your live location');
  };
  const { data: hospitalsData } = useGetHospitalsQuery(
    hospitalQuery.length >= 2 ? { search: hospitalQuery, limit: '8' } : { limit: '8' }
  );
  const [requestTransport, { isLoading }] = useRequestTransportMutation();

  const selectedVehicle = VEHICLES.find((v) => v.id === vehicle)!;
  const hospitals = hospitalsData?.data?.hospitals || [];

  const handleConfirm = async () => {
    if (!address.trim()) {
      toast.error('Please enter pickup address');
      return;
    }
    if (!pickupCoords) {
      toast.error('Waiting for GPS — tap "Use my location" or allow location access');
      return;
    }
    try {
      const result = await requestTransport({
        vehicleType: vehicle,
        scheduledAt: new Date(`${date}T${time}:00`).toISOString(),
        pickupLocation: { address, coordinates: pickupCoords },
        destinationHospital: selectedHospital
          ? {
              name: selectedHospital.name,
              address: selectedHospital.address,
              coordinates: selectedHospital.coordinates,
            }
          : undefined,
        conditionNotes: notes,
        patientDetails: {
          name:
            bookedFor === 'other'
              ? otherName
              : `${user?.profile.firstName} ${user?.profile.lastName}`,
          contactNumber: user?.phone || '',
          bookedFor,
          otherPersonName: bookedFor === 'other' ? otherName : undefined,
          otherPersonRelation: bookedFor === 'other' ? otherRelation : undefined,
        },
      }).unwrap();

      const booking = result.data.booking;
      dispatch(
        setActiveBooking({
          bookingId: booking._id,
          trackingToken: booking.trackingToken,
        })
      );
      toast.success('Ride booked!');
      navigate('/transport/status', { replace: true });
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      toast.error(error.data?.message || 'Booking failed');
    }
  };

  return (
    <div className="container-custom py-8 max-w-3xl elder-text">
      <h1 className="text-3xl font-bold mb-2">
        {helpState.fromHelpChooser ? 'Hospital ride booking' : 'Book a Ride'}
      </h1>
      {helpState.fromHelpChooser && selectedHospital && (
        <div className="mb-6 p-4 rounded-xl border-2 border-sky-300 bg-sky-50">
          <p className="text-xs font-bold uppercase text-sky-800 mb-1">Destination · nearest hospital</p>
          <p className="text-lg font-bold text-sky-950">{selectedHospital.name}</p>
          <p className="text-sm text-sky-900/80 mt-1">{selectedHospital.address}</p>
          {selectedHospital.coordinates && (
            <p className="text-xs text-sky-700 mt-1 flex items-center gap-1">
              <Navigation className="h-3.5 w-3.5" />
              Hospital pinned on map for live tracking
            </p>
          )}
          <p className="text-xs text-muted mt-2">This is not an emergency ambulance.</p>
        </div>
      )}

      {pickupCoords && (
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            Route preview
          </h2>
          <div className="rounded-2xl overflow-hidden border-2 border-border shadow-sm">
            <RideLiveMap
              pickup={pickupCoords}
              hospital={
                selectedHospital?.coordinates
                  ? {
                      lat: selectedHospital.coordinates.lat,
                      lng: selectedHospital.coordinates.lng,
                      name: selectedHospital.name,
                      address: selectedHospital.address,
                    }
                  : undefined
              }
              className="relative h-[280px] w-full"
              showOpenMaps
            />
          </div>
          {geo.isLoading && (
            <p className="text-sm text-muted mt-2 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Getting your live location…
            </p>
          )}
        </section>
      )}
      <p className="text-lg text-muted mb-8">
        {helpState.fromHelpChooser
          ? 'Medical cab to your hospital — pick time and confirm pickup.'
          : 'Non-emergency medical transport — large buttons, simple steps'}
      </p>

      <section className={cn('mb-8', helpState.fromHelpChooser && 'hidden')}>
        <h2 className="text-2xl font-semibold mb-4">Choose vehicle</h2>
        <div className="space-y-3">
          {VEHICLES.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setVehicle(v.id)}
                className={cn(
                  'w-full text-left p-5 rounded-2xl border-2 min-h-[72px] transition-colors',
                  vehicle === v.id ? 'border-primary bg-primary/5' : 'border-border bg-card'
                )}
              >
                <div className="flex gap-4 items-start">
                  <Icon className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <p className="text-xl font-bold">{v.name}</p>
                    <p className="text-lg text-muted mt-1">{v.description}</p>
                    <p className="text-lg font-semibold text-primary mt-2">From {formatCurrency(v.price)}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <Card className="mb-6">
        <CardContent className="p-5 space-y-5">
          <div>
            <Label className="text-lg flex items-center gap-2"><Calendar className="h-5 w-5" /> Date</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {getNextDays(8).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDate(d)}
                  className={cn(
                    'min-h-[48px] px-4 rounded-xl border-2 text-lg font-medium',
                    date === d ? 'border-primary bg-primary/10' : 'border-border'
                  )}
                >
                  {new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-lg">Time</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {TIME_SLOTS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTime(t)}
                  className={cn(
                    'min-h-[48px] px-4 rounded-xl border-2 text-lg',
                    time === t ? 'border-primary bg-primary/10' : 'border-border'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5" /> Pickup address</Label>
            <div className="flex gap-2 mt-2">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="h-14 text-lg flex-1" />
              <Button
                type="button"
                variant="outline"
                className="h-14 shrink-0 gap-2 px-4"
                onClick={useMyLocation}
                disabled={geo.isLoading}
              >
                {geo.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
                GPS
              </Button>
            </div>
            {pickupCoords && (
              <p className="text-sm text-muted mt-1">
                Live pickup: {pickupCoords.lat.toFixed(5)}, {pickupCoords.lng.toFixed(5)}
              </p>
            )}
          </div>
          <div>
            <Label className="text-lg">Destination hospital (optional)</Label>
            <Input
              value={hospitalQuery}
              onChange={(e) => {
                setHospitalQuery(e.target.value);
                setSelectedHospital(null);
              }}
              placeholder="Search hospital name"
              className="mt-2 h-14 text-lg"
            />
            {hospitals.length > 0 && !selectedHospital && (
              <ul className="mt-2 border rounded-xl divide-y max-h-48 overflow-auto">
                {hospitals.map((h) => (
                  <li key={h._id}>
                    <button
                      type="button"
                      className="w-full text-left p-4 hover:bg-background text-lg min-h-[48px]"
                      onClick={() => {
                        setSelectedHospital({
                          name: h.name,
                          address: h.address || h.city,
                          coordinates: (h as { coordinates?: { lat: number; lng: number } }).coordinates,
                        });
                        setHospitalQuery(h.name);
                      }}
                    >
                      {h.name} — {h.city}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <Label className="text-lg">Patient condition notes</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-border p-4 text-lg"
              placeholder="Wheelchair, oxygen, etc."
            />
          </div>
          <div>
            <Label className="text-lg flex items-center gap-2"><User className="h-5 w-5" /> Who is this for?</Label>
            <div className="flex gap-3 mt-2">
              {(['self', 'other'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setBookedFor(v)}
                  className={cn(
                    'flex-1 min-h-[48px] rounded-xl border-2 text-lg font-medium capitalize',
                    bookedFor === v ? 'border-primary bg-primary/10' : 'border-border'
                  )}
                >
                  {v === 'self' ? 'Myself' : 'Someone else'}
                </button>
              ))}
            </div>
            {bookedFor === 'other' && (
              <div className="grid gap-3 mt-3">
                <Input placeholder="Their name" value={otherName} onChange={(e) => setOtherName(e.target.value)} className="h-14 text-lg" />
                <Input placeholder="Relation (e.g. mother)" value={otherRelation} onChange={(e) => setOtherRelation(e.target.value)} className="h-14 text-lg" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="p-5 rounded-2xl bg-primary/5 border-2 border-primary/20 mb-6">
        <p className="text-xl"><strong>Estimated cost:</strong> {formatCurrency(selectedVehicle.price)}+</p>
        <p className="text-lg text-muted mt-1">Arrival window based on nearest attendant</p>
      </div>

      <Button size="lg" className="w-full h-16 text-xl" onClick={handleConfirm} disabled={isLoading || !pickupCoords}>
        {isLoading ? 'Booking...' : pickupCoords ? 'Confirm booking' : 'Waiting for location…'}
      </Button>
    </div>
  );
}
