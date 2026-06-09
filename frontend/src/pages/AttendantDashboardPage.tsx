import { useState } from 'react';
import { toast } from 'react-toastify';
import { MapPin, Phone, Check, X, Navigation, ClipboardList } from 'lucide-react';
import {
  useGetDriverTransportRequestsQuery,
  useGetDriverEmergencyActiveQuery,
  useAcceptTransportMutation,
  useUpdateTransportStatusMutation,
  useVerifyTransportOtpMutation,
  useVerifyEmergencyOtpMutation,
} from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { joinDriverRoom } from '@/lib/socket';
import { useAppSelector } from '@/hooks/redux';
import { useEffect } from 'react';

const CHECKLISTS: Record<string, string[]> = {
  basic_ambulance: ['Oxygen cylinder', 'First aid kit', 'Stretcher', 'BP monitor'],
  BLS: ['Oxygen cylinder', 'First aid kit', 'Stretcher'],
  medical_cab: ['First aid kit', 'Water'],
  wheelchair_van: ['Wheelchair', 'Ramp assist', 'First aid kit'],
  default: ['First aid kit'],
};

interface TransportReq {
  _id: string;
  bookingId: string;
  flowType: string;
  status: string;
  pickupLocation: { address: string; coordinates: { lat: number; lng: number } };
  destinationHospital?: { name: string; address: string };
  patientDetails?: { name: string; condition?: string; contactNumber?: string };
  vehicleType: string;
  otp?: string;
}

export function AttendantDashboardPage() {
  const { user } = useAppSelector((s) => s.auth);
  const { data, refetch } = useGetDriverTransportRequestsQuery(undefined, { pollingInterval: 8000 });
  const { data: emergencyData, refetch: refetchEmergency } = useGetDriverEmergencyActiveQuery(undefined, {
    pollingInterval: 5000,
  });
  const [acceptTransport] = useAcceptTransportMutation();
  const [updateStatus] = useUpdateTransportStatusMutation();
  const [verifyOtp] = useVerifyTransportOtpMutation();
  const [verifyEmergencyOtp] = useVerifyEmergencyOtpMutation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [vitals, setVitals] = useState({ bp: '', pulse: '', oxygen: '' });

  const requests = (data?.data || []) as TransportReq[];
  const incoming = requests.filter((r) => r.status === 'requested');
  const emergencyRequest = emergencyData?.data?.request;
  const active = requests.find((r) => r._id === activeId) || requests.find((r) => !['requested', 'completed', 'cancelled'].includes(r.status));

  useEffect(() => {
    if (user?._id) joinDriverRoom(user._id);
  }, [user?._id]);

  const handleAccept = async (id: string) => {
    try {
      await acceptTransport(id).unwrap();
      setActiveId(id);
      toast.success('Request accepted');
      refetch();
    } catch {
      toast.error('Could not accept');
    }
  };

  const handleStatus = async (status: string) => {
    if (!active?._id) return;
    try {
      await updateStatus({ id: active._id, status }).unwrap();
      toast.success(`Status: ${status}`);
      refetch();
    } catch {
      toast.error('Update failed');
    }
  };

  const handleVerifyOtp = async () => {
    if (!active?._id) return;
    try {
      await verifyOtp({ id: active._id, otp: otpInput }).unwrap();
      toast.success('OTP verified — patient confirmed');
      setOtpInput('');
      refetch();
    } catch {
      toast.error('Wrong OTP');
    }
  };

  const openMaps = (_address: string, lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const handleVerifyEmergencyOtp = async () => {
    if (!emergencyRequest?.requestId) return;
    try {
      await verifyEmergencyOtp({ id: emergencyRequest.requestId, otp: otpInput }).unwrap();
      toast.success('Safety code verified');
      setOtpInput('');
      refetchEmergency();
    } catch {
      toast.error('Wrong safety code');
    }
  };

  const checklist = CHECKLISTS[active?.vehicleType || ''] || CHECKLISTS.default;

  return (
    <div className="container-custom py-8 max-w-2xl elder-text">
      <h1 className="text-3xl font-bold mb-2">Attendant dashboard</h1>
      <p className="text-lg text-muted mb-8">Incoming requests & active trip</p>

      {emergencyRequest && ['dispatched', 'arrived'].includes(emergencyRequest.status) && (
        <section className="mb-8">
          <Card className="border-2 border-red-400">
            <CardHeader>
              <CardTitle className="text-xl">Emergency SOS — {emergencyRequest.requestId}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge>{emergencyRequest.status}</Badge>
              {emergencyRequest.status === 'arrived' && (
                <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-200">
                  <p className="text-lg font-medium">Enter patient safety code</p>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      placeholder="4-digit code"
                      maxLength={4}
                      className="h-14 text-2xl tracking-widest text-center"
                    />
                    <Button className="h-14 px-6" onClick={handleVerifyEmergencyOtp}>
                      Verify
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {incoming.length > 0 && (
        <section className="mb-8 space-y-4">
          <h2 className="text-2xl font-semibold">New requests</h2>
          {incoming.map((req) => (
            <Card key={req._id} className="border-2 border-accent/40">
              <CardHeader>
                <CardTitle className="text-xl flex justify-between items-start gap-2">
                  {req.patientDetails?.name || 'Patient'}
                  <Badge>{req.flowType.replace(/_/g, ' ')}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-lg flex items-start gap-2">
                  <MapPin className="h-5 w-5 shrink-0" /> {req.pickupLocation.address}
                </p>
                {req.destinationHospital?.name && (
                  <p className="text-lg">Hospital: {req.destinationHospital.name}</p>
                )}
                {req.patientDetails?.condition && (
                  <p className="text-lg text-muted">Notes: {req.patientDetails.condition}</p>
                )}
                <div className="flex gap-3 pt-2">
                  <Button className="flex-1 h-14 text-lg" onClick={() => handleAccept(req._id)}>
                    <Check className="h-5 w-5 mr-2" /> Accept
                  </Button>
                  <Button variant="outline" className="h-14 px-6" onClick={() => toast.info('Declined')}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {active && active.status !== 'requested' && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="text-xl">Active trip — {active.bookingId}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {active.patientDetails?.contactNumber && (
              <a href={`tel:${active.patientDetails.contactNumber}`}>
                <Button className="w-full h-14 text-lg gap-2">
                  <Phone className="h-5 w-5" /> Call patient
                </Button>
              </a>
            )}
            <Button
              variant="outline"
              className="w-full h-14 text-lg gap-2"
              onClick={() =>
                openMaps(
                  active.pickupLocation.address,
                  active.pickupLocation.coordinates.lat,
                  active.pickupLocation.coordinates.lng
                )
              }
            >
              <Navigation className="h-5 w-5" /> Open in Google Maps
            </Button>

            <div>
              <p className="text-lg font-semibold flex items-center gap-2">
                <ClipboardList className="h-5 w-5" /> Bring these items
              </p>
              <ul className="mt-2 space-y-1 text-lg list-disc list-inside">
                {checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            {active.status === 'accepted' || active.status === 'en-route-to-patient' ? (
              <>
                <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-200">
                  <p className="text-lg font-medium">Enter patient safety code</p>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      placeholder="4-digit OTP"
                      maxLength={4}
                      className="h-14 text-2xl tracking-widest text-center"
                    />
                    <Button className="h-14 px-6" onClick={handleVerifyOtp}>
                      Verify
                    </Button>
                  </div>
                </div>
                <Button className="w-full h-14 text-lg" onClick={() => handleStatus('en-route-to-patient')}>
                  En route to patient
                </Button>
                <Button className="w-full h-14 text-lg" variant="outline" onClick={() => handleStatus('patient-picked-up')}>
                  I have arrived
                </Button>
              </>
            ) : null}

            {active.status === 'patient-picked-up' && (
              <div className="space-y-3">
                <p className="text-lg font-medium">Optional vitals before departure</p>
                <Input placeholder="BP e.g. 120/80" value={vitals.bp} onChange={(e) => setVitals({ ...vitals, bp: e.target.value })} className="h-12 text-lg" />
                <Input placeholder="Pulse" value={vitals.pulse} onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })} className="h-12 text-lg" />
                <Input placeholder="SpO2 %" value={vitals.oxygen} onChange={(e) => setVitals({ ...vitals, oxygen: e.target.value })} className="h-12 text-lg" />
                <Button className="w-full h-14 text-lg" onClick={() => handleStatus('en-route-to-hospital')}>
                  En route to hospital
                </Button>
              </div>
            )}

            {active.status === 'en-route-to-hospital' && (
              <Button className="w-full h-14 text-lg" onClick={() => handleStatus('completed')}>
                Mark trip complete
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {incoming.length === 0 && !active && (
        <p className="text-xl text-muted text-center py-12">No active requests — stay available</p>
      )}
    </div>
  );
}
