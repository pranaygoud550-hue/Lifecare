import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { Ambulance, MapPin, AlertTriangle, Phone } from 'lucide-react';
import { useRequestAmbulanceMutation } from '@/features/api/apiSlice';
import { useAppSelector } from '@/hooks/redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useEmergencyLocation } from '@/hooks/useEmergencyLocation';

const emergencyTypes = [
  'Cardiac Emergency',
  'Accident/Trauma',
  'Pregnancy/Childbirth',
  'Breathing Difficulty',
  'Unconsciousness',
  'Other Medical Emergency',
];

const ambulanceTypes = [
  { id: 'BLS', label: 'Basic Life Support (BLS)', price: 1000 },
  { id: 'ALS', label: 'Advanced Life Support (ALS)', price: 2000 },
  { id: 'Transport', label: 'Patient Transport', price: 800 },
];

interface AmbulanceForm {
  emergencyType: string;
  severity: 'critical' | 'urgent' | 'non-urgent';
  patientName: string;
  patientAge: number;
  patientGender: string;
  condition: string;
  contactNumber: string;
  ambulanceType: string;
  address: string;
}

export function AmbulancePage() {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [requestAmbulance, { isLoading }] = useRequestAmbulanceMutation();
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState('');
  const pickupCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const geo = useEmergencyLocation(true, true);

  const { register, handleSubmit, watch, setValue } = useForm<AmbulanceForm>({
    defaultValues: {
      severity: 'urgent',
      ambulanceType: 'BLS',
      patientName: user?.profile ? `${user.profile.firstName} ${user.profile.lastName}` : '',
      contactNumber: user?.phone || '',
    },
  });

  const severity = watch('severity');

  const detectLocation = () => {
    if (geo.lat != null && geo.lng != null) {
      pickupCoordsRef.current = { lat: geo.lat, lng: geo.lng };
      setValue(
        'address',
        `Near ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}${geo.accuracy ? ` (±${Math.round(geo.accuracy)}m)` : ''}`
      );
      toast.success('Location detected');
      return;
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          pickupCoordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setValue(
            'address',
            `Near ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`
          );
          toast.success('Location detected');
        },
        () => toast.error('Could not detect location')
      );
    }
  };

  const onSubmit = async (data: AmbulanceForm) => {
    if (!isAuthenticated) {
      toast.error('Please login to request ambulance');
      return;
    }

    if (!data.address.trim()) {
      toast.error('Please enter or detect pickup location');
      return;
    }

    const coords =
      pickupCoordsRef.current ??
      (geo.lat != null && geo.lng != null ? { lat: geo.lat, lng: geo.lng } : null);

    if (!coords) {
      toast.error('Please tap "Detect my location" so we can dispatch to your GPS');
      return;
    }

    try {
      const result = await requestAmbulance({
        emergencyType: data.emergencyType,
        severity: data.severity,
        ambulanceType: data.ambulanceType,
        pickupLocation: {
          address: data.address,
          coordinates: coords,
        },
        patientDetails: {
          name: data.patientName,
          age: Number(data.patientAge),
          gender: data.patientGender,
          condition: data.condition,
          contactNumber: data.contactNumber,
        },
      }).unwrap();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRequestId((result.data as any).requestId);
      setSubmitted(true);
      toast.success('Ambulance requested! Help is on the way.');
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      toast.error(error.data?.message || 'Failed to request ambulance');
    }
  };

  if (submitted) {
    return (
      <div className="container-custom py-16 max-w-lg mx-auto text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/20 text-accent mb-6 animate-pulse">
          <Ambulance className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Ambulance Dispatched!</h1>
        <p className="text-muted mb-4">Request ID: <strong>{requestId}</strong></p>
        <p className="text-muted mb-8">Estimated arrival: 8-12 minutes. Stay calm, help is on the way.</p>
        <div className="flex gap-3 justify-center">
          <a href="tel:108"><Button variant="danger"><Phone className="h-4 w-4 mr-2" /> Call 108</Button></a>
          <Button variant="outline" onClick={() => setSubmitted(false)}>New Request</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8 max-w-2xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 text-accent mb-4">
          <Ambulance className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Emergency Ambulance</h1>
        <p className="text-muted">Request immediate medical transport with real-time tracking</p>
      </div>


      {!isAuthenticated && (
        <Card className="mb-6 border-accent/50 bg-accent/5">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm">Login required to request ambulance</p>
            <Link to="/login"><Button size="sm">Login</Button></Link>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Emergency Type</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Type of Emergency</Label>
              <select className="w-full h-10 mt-1 rounded-md border border-input bg-card px-3 text-sm" {...register('emergencyType', { required: true })}>
                <option value="">Select emergency type</option>
                {emergencyTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <Label>Severity Level</Label>
              <div className="flex gap-3 mt-2">
                {(['critical', 'urgent', 'non-urgent'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setValue('severity', s)}
                    className={`flex-1 p-3 rounded-lg border text-sm capitalize ${
                      severity === s
                        ? s === 'critical' ? 'border-accent bg-accent/10 text-accent' : 'border-primary bg-primary/10'
                        : 'border-border'
                    }`}
                  >
                    {s === 'critical' && <AlertTriangle className="h-4 w-4 mx-auto mb-1" />}
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Location</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Pickup Address</Label>
              <Input placeholder="Enter address or use GPS" className="mt-1" {...register('address', { required: true })} />
            </div>
            <Button type="button" variant="outline" onClick={detectLocation} className="gap-2">
              <MapPin className="h-4 w-4" /> Detect My Location
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Patient Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Patient Name</Label><Input {...register('patientName', { required: true })} /></div>
            <div><Label>Age</Label><Input type="number" {...register('patientAge', { required: true })} /></div>
            <div>
              <Label>Gender</Label>
              <select className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm" {...register('patientGender')}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div><Label>Contact Number</Label><Input {...register('contactNumber', { required: true })} /></div>
            <div className="sm:col-span-2">
              <Label>Brief Condition Description</Label>
              <Input placeholder="Describe the emergency situation" {...register('condition', { required: true })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Ambulance Type</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {ambulanceTypes.map((type) => (
              <label key={type.id} className="flex items-center justify-between p-4 rounded-lg border border-border cursor-pointer hover:border-primary">
                <div className="flex items-center gap-3">
                  <input type="radio" value={type.id} {...register('ambulanceType')} />
                  <span className="font-medium">{type.label}</span>
                </div>
                <Badge>₹{type.price}+</Badge>
              </label>
            ))}
          </CardContent>
        </Card>

        <Button type="submit" variant="danger" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? 'Requesting...' : 'Request Ambulance Now'}
        </Button>
      </form>
    </div>
  );
}
