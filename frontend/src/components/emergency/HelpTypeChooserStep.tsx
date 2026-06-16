import { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Loader2,
  MapPin,
  Phone,
  Stethoscope,
  Video,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import {
  closeEmergency,
  setEmergencyStep,
  proceedAfterHelpChoice,
  setHelpType,
  setNearbyHospitals,
  setEmergencyLocation,
} from '@/features/emergency/emergencySlice';
import { useLazyGetEmergencyNearbyHospitalsQuery } from '@/features/api/apiSlice';
import { cn } from '@/lib/utils';
import type { HelpType } from '@/features/emergency/emergencySlice';
import type { EmergencyHospitalInfo } from '@/types';
import {
  HyderabadAreaSearch,
  type HyderabadAreaSelection,
} from '@/components/emergency/HyderabadAreaSearch';
import { HYDERABAD_SERVICE_LABEL } from '@/data/hyderabadAreas';

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

function NearestHospitalCard({
  hospital,
  loading,
  hasLocation,
}: {
  hospital: EmergencyHospitalInfo | null;
  loading: boolean;
  hasLocation: boolean;
}) {
  if (!hasLocation) {
    return (
      <div className="p-4 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-100 text-sm">
        Pick your Hyderabad area below to find the nearest hospital.
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-white/10 border border-white/15 text-white/80">
        <Loader2 className="h-5 w-5 animate-spin shrink-0" />
        <span className="text-sm">Finding nearest hospital…</span>
      </div>
    );
  }
  if (!hospital) {
    return (
      <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-100 text-sm">
        No hospital found near this area — you can still continue.
      </div>
    );
  }
  return (
    <div className="p-4 rounded-xl bg-white/10 border border-cyan-400/30">
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300 mb-1">
        Nearest hospital
      </p>
      <p className="font-bold text-white text-lg leading-tight">{hospital.name}</p>
      <p className="text-sm text-white/70 mt-1 flex items-start gap-1.5">
        <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
        {hospital.address}
      </p>
      <p className="text-sm text-cyan-200 mt-2 font-medium">
        {formatDistance(hospital.distanceMeters)}
      </p>
      {hospital.phone && (
        <a
          href={`tel:${hospital.phone}`}
          className="inline-flex items-center gap-1.5 mt-2 text-sm text-white/90 hover:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <Phone className="h-4 w-4" />
          {hospital.phone}
        </a>
      )}
    </div>
  );
}

export function HelpTypeChooserStep() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const { nearestHospital, location: savedLocation } = useAppSelector((s) => s.emergency);

  const [pickupAddress, setPickupAddress] = useState(savedLocation?.address ?? '');
  const [hasLocation, setHasLocation] = useState(
    savedLocation?.lat != null && savedLocation?.lng != null
  );
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [fetchHospitals] = useLazyGetEmergencyNearbyHospitalsQuery();

  const applyArea = async (selection: HyderabadAreaSelection) => {
    const { lat, lng, address } = selection;
    setPickupAddress(address);
    setHasLocation(true);
    dispatch(setEmergencyLocation({ lat, lng, address }));
    setHospitalsLoading(true);
    try {
      const res = await fetchHospitals({ lat, lng, radius: 8 }).unwrap();
      const list = res.data?.hospitals ?? [];
      dispatch(setNearbyHospitals({ hospitals: list, nearest: list[0] ?? null }));
    } catch {
      toast.info('Could not load nearby hospitals — you can still continue.');
    } finally {
      setHospitalsLoading(false);
    }
  };

  const continueWithType = (type: HelpType) => {
    if ((type === 'emergency' || type === 'hospital_ride') && !hasLocation) {
      toast.error(`Pick your area in ${HYDERABAD_SERVICE_LABEL} first.`);
      return;
    }

    dispatch(setHelpType(type));

    if (type === 'teleconsult') {
      dispatch(closeEmergency());
      navigate('/live-checkup', { state: { fromHelpChooser: true } });
      return;
    }

    if (!isAuthenticated) {
      dispatch(setEmergencyStep('guest'));
      return;
    }

    if (user?.userType !== 'patient') {
      toast.error('Sign in as a patient to book rides or request emergency help.');
      return;
    }

    dispatch(proceedAfterHelpChoice());
  };

  return (
    <div className="flex flex-col flex-1 p-6 sm:p-8 max-w-2xl mx-auto w-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug">
          What kind of help do you need?
        </h2>
        <p className="text-base text-white/70 mt-2">
          Emergency help is available in <strong>{HYDERABAD_SERVICE_LABEL}</strong> only.
        </p>
      </div>

        <HyderabadAreaSearch
          value={pickupAddress}
          onSelect={(sel) => void applyArea(sel)}
          inputClassName="h-11 bg-white text-base"
          className="mb-4"
          showLandmark
        />

      <NearestHospitalCard
        hospital={nearestHospital}
        loading={hospitalsLoading}
        hasLocation={hasLocation}
      />

      <div className="grid gap-4 mt-6 flex-1">
        <button
          type="button"
          onClick={() => continueWithType('emergency')}
          className={cn(
            'text-left p-5 sm:p-6 rounded-2xl border-2 transition-all',
            'bg-red-600/90 border-red-400 hover:bg-red-600 hover:border-red-300',
            'focus:outline-none focus:ring-4 focus:ring-red-300/50 active:scale-[0.99]',
            !hasLocation && 'opacity-60'
          )}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-red-100 mb-1">
                Medical emergency
              </p>
              <p className="text-xl sm:text-2xl font-bold text-white">Ambulance SOS</p>
              <p className="text-sm text-red-50 mt-2 leading-relaxed">
                Life-threatening or urgent — we dispatch the nearest ambulance and route to the
                closest hospital with emergency care.
              </p>
              <p className="text-xs font-semibold text-white/90 mt-3 flex items-center gap-1">
                <Stethoscope className="h-3.5 w-3.5" />
                Hyderabad service area only
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => continueWithType('hospital_ride')}
          className={cn(
            'text-left p-5 sm:p-6 rounded-2xl border-2 transition-all',
            'bg-sky-700/90 border-sky-400 hover:bg-sky-700 hover:border-sky-300',
            'focus:outline-none focus:ring-4 focus:ring-sky-300/50 active:scale-[0.99]',
            !hasLocation && 'opacity-60'
          )}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-100 mb-1">
                Non-emergency
              </p>
              <p className="text-xl sm:text-2xl font-bold text-white">I need a ride</p>
              <p className="text-sm text-sky-50 mt-2 leading-relaxed">
                Medical cab to your nearest hospital — pick your area above, then we assign a vehicle
                and show the route{nearestHospital ? ` to ${nearestHospital.name}` : ''}.
              </p>
              <p className="text-xs font-semibold text-white/90 mt-3">
                No vehicle choice · Hyderabad areas only
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => continueWithType('teleconsult')}
          className={cn(
            'text-left p-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 transition-colors'
          )}
        >
          <div className="flex items-center gap-3 text-white/90">
            <Video className="h-5 w-5 text-white shrink-0" />
            <span className="font-medium">Talk to a doctor on video first</span>
          </div>
        </button>
      </div>

      <a href="tel:108" className="block mt-6">
        <Button variant="outline" className="w-full h-12 border-white/30 text-white hover:bg-white/10">
          Call national emergency 108
        </Button>
      </a>
    </div>
  );
}
