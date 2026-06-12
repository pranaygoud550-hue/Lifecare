import { useState } from 'react';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { useGetPatientVitalsForDoctorQuery } from '@/features/api/apiSlice';
import { VitalChart } from '@/components/vitals/VitalChart';
import { VitalSummaryCards } from '@/components/vitals/VitalSummaryCards';
import type { VitalReading } from '@/types';

export function PatientVitalsPanel({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(true);
  const [days, setDays] = useState<'7' | '30'>('30');
  const { data, isLoading } = useGetPatientVitalsForDoctorQuery({ patientId, days });

  const readings = (data?.data?.readings ?? []) as VitalReading[];
  const latest = (data?.data?.latest ?? []) as VitalReading[];

  return (
    <div className="border-t border-border bg-card">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2 font-semibold text-sm">
          <Activity className="h-4 w-4 text-primary" />
          Patient vitals (last {days} days)
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 max-h-[320px] overflow-y-auto">
          <div className="flex gap-2 text-xs">
            {(['7', '30'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-2 py-1 rounded ${days === d ? 'bg-primary text-white' : 'bg-muted'}`}
              >
                {d}d
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="h-24 bg-muted animate-pulse rounded-lg" />
          ) : readings.length === 0 ? (
            <p className="text-sm text-muted">No vitals logged yet for this patient.</p>
          ) : (
            <>
              <VitalSummaryCards latest={latest} />
              <VitalChart type="blood_pressure" readings={readings} height={160} />
              <VitalChart type="blood_sugar" readings={readings} glucoseMeal="fasting" height={140} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
