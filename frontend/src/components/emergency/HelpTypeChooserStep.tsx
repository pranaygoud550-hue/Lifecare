import { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Loader2,
  MapPin,
  Phone,
  Video,
  Zap,
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
  setEmergencyLocation,
} from '@/features/emergency/emergencySlice';
import { cn } from '@/lib/utils';
import type { HelpType } from '@/features/emergency/emergencySlice';
import type { EmergencyHospitalInfo } from '@/types';
import {
  HyderabadAreaSearch,
  type HyderabadAreaSelection,
} from '@/components/emergency/HyderabadAreaSearch';
import { AutoDetectedLocationCard } from '@/components/emergency/AutoDetectedLocationCard';
import { useEmergencyAutoDetect } from '@/hooks/useEmergencyAutoDetect';
import { HYDERABAD_SERVICE_LABEL } from '@/data/hyderabadAreas';

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

function NearestHospitalCard({
  hospital,
  loading,
  hasLocation,
  detecting,
}: {
  hospital: EmergencyHospitalInfo | null;
  loading: boolean;
  hasLocation: boolean;
  detecting: boolean;
}) {
  if (detecting || (!hasLocation && !detecting)) {
    return (
      <div className="p-4 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-100 text-sm">
        {detecting
          ? 'Finding nearest hospital for your GPS location…'
          : 'Allow location or search a shop/street — nearest hospital appears here.'}
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
        No hospital found nearby — ambulance will still be dispatched. Call 108 if urgent.
      </div>
    );
  }
  return (
    <div className="p-4 rounded-xl bg-white/10 border border-cyan-400/30">
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300 mb-1">
        Nearest hospital (auto-matched)
      </p>
      <p className="font-bold text-white text-lg leading-tight break-words">{hospital.name}</p>
      <p className="text-sm text-white/70 mt-1 flex items-start gap-1.5 min-w-0">
        <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
        <span className="break-words line-clamp-2">{hospital.address}</span>
      </p>
      <p className="text-sm text-cyan-200 mt-2 font-medium">
        {formatDistance(hospital.distanceMeters)} from you
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
  const { nearestHospital } = useAppSelector((s) => s.emergency);

  const {
    status: detectStatus,
    error: detectError,
    hasLocation,
    location,
    hospitalsLoading,
    detect,
    loadHospitals,
  } = useEmergencyAutoDetect({ autoRun: true });

  const [accidentLoading, setAccidentLoading] = useState(false);

  const applyArea = async (selection: HyderabadAreaSelection) => {
    const { lat, lng, address } = selection;
    dispatch(setEmergencyLocation({ lat, lng, address }));
    await loadHospitals(lat, lng);
  };

  const proceedEmergency = (type: HelpType) => {
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

  const ensureLocation = async (): Promise<boolean> => {
    if (hasLocation && location) return true;
    const result = await detect();
    return result != null;
  };

  const handleAccidentNow = async () => {
    setAccidentLoading(true);
    try {
      const ok = await ensureLocation();
      if (!ok) {
        toast.error('Allow GPS or search your location (e.g. Chai Loaded, Kandlakoya) below.');
        return;
      }
      proceedEmergency('emergency');
    } finally {
      setAccidentLoading(false);
    }
  };

  const continueWithType = async (type: HelpType) => {
    if (type === 'emergency' || type === 'hospital_ride') {
      const ok = hasLocation || (await ensureLocation());
      if (!ok) {
        toast.error(`Allow GPS or pick your location in ${HYDERABAD_SERVICE_LABEL}.`);
        return;
      }
    }
    proceedEmergency(type);
  };

  const detecting = detectStatus === 'detecting';

  return (
    <div className="flex flex-col flex-1 p-6 sm:p-8 max-w-2xl mx-auto w-full overflow-y-auto">
      <div className="mb-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug">
          What kind of help do you need?
        </h2>
        <p className="text-sm text-white/70 mt-2 break-words">
          We auto-detect your spot (accident, restaurant, road). Ambulance routes to the nearest
          hospital. Covers {HYDERABAD_SERVICE_LABEL}.
        </p>
      </div>

      <AutoDetectedLocationCard
        status={detectStatus}
        location={location}
        error={detectError}
        onRetry={() => void detect()}
        className="mb-4"
      />

      <button
        type="button"
        disabled={accidentLoading || detecting}
        onClick={() => void handleAccidentNow()}
        className={cn(
          'w-full mb-4 p-4 rounded-2xl border-2 border-red-300 bg-red-600 text-white',
          'font-bold text-lg flex items-center justify-center gap-2 min-h-[3.5rem]',
          'hover:bg-red-500 active:scale-[0.99] disabled:opacity-60',
          'shadow-lg shadow-red-900/40 animate-pulse-urgent hover:animate-none'
        )}
      >
        {accidentLoading || detecting ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Zap className="h-6 w-6" />
        )}
        ACCIDENT — SEND AMBULANCE NOW
      </button>

      <details className="mb-4 group">
        <summary className="text-xs text-white/60 cursor-pointer hover:text-white/80 list-none flex items-center gap-1">
          <span className="group-open:hidden">▸ Wrong location? Search shop or street</span>
          <span className="hidden group-open:inline">▾ Manual location search</span>
        </summary>
        <div className="mt-3">
          <HyderabadAreaSearch
            value={location?.address ?? ''}
            onSelect={(sel) => void applyArea(sel)}
            inputClassName="h-11 bg-white text-base"
            showLandmark
            showGpsButton={detectStatus === 'failed'}
          />
        </div>
      </details>

      <NearestHospitalCard
        hospital={nearestHospital}
        loading={hospitalsLoading}
        hasLocation={hasLocation}
        detecting={detecting}
      />

      <div className="grid gap-4 mt-6 flex-1">
        <button
          type="button"
          onClick={() => void continueWithType('emergency')}
          disabled={detecting}
          className={cn(
            'text-left p-5 sm:p-6 rounded-2xl border-2 transition-all',
            'bg-red-600/90 border-red-400 hover:bg-red-600 hover:border-red-300',
            'focus:outline-none focus:ring-4 focus:ring-red-300/50 active:scale-[0.99]',
            detecting && 'opacity-60'
          )}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-xs font-bold uppercase tracking-wider text-red-100 mb-1">
                Medical emergency
              </p>
              <p className="text-xl sm:text-2xl font-bold text-white">Ambulance SOS</p>
              <p className="text-sm text-red-50 mt-2 leading-relaxed break-words">
                Auto location + nearest hospital + ambulance dispatch.
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => void continueWithType('hospital_ride')}
          disabled={detecting}
          className={cn(
            'text-left p-5 sm:p-6 rounded-2xl border-2 transition-all',
            'bg-sky-700/90 border-sky-400 hover:bg-sky-700 hover:border-sky-300',
            detecting && 'opacity-60'
          )}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-100 mb-1">
                Non-emergency
              </p>
              <p className="text-xl sm:text-2xl font-bold text-white">I need a ride</p>
              <p className="text-sm text-sky-50 mt-2 leading-relaxed break-words">
                Medical cab to {nearestHospital?.name ?? 'nearest hospital'}.
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => proceedEmergency('teleconsult')}
          className="text-left p-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10"
        >
          <div className="flex items-center gap-3 text-white/90">
            <Video className="h-5 w-5 shrink-0" />
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
