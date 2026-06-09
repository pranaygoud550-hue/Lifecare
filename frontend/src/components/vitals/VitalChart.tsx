import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Legend,
} from 'recharts';
import type { VitalReading, VitalType } from '@/types';
import { getChartReferenceBands, VITAL_META } from '@/lib/vitalRanges';

function formatChartDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

interface VitalChartProps {
  type: VitalType;
  readings: VitalReading[];
  glucoseMeal?: 'fasting' | 'post_meal';
  height?: number;
}

export function VitalChart({ type, readings, glucoseMeal, height = 220 }: VitalChartProps) {
  const filtered = readings.filter((r) => {
    if (r.type !== type) return false;
    if (type === 'blood_sugar' && glucoseMeal) return r.glucoseMeal === glucoseMeal;
    return true;
  });

  const bands = getChartReferenceBands(type, glucoseMeal);

  if (type === 'blood_pressure') {
    const data = filtered.map((r) => ({
      date: formatChartDate(r.recordedAt),
      recordedAt: r.recordedAt,
      systolic: r.systolic,
      diastolic: r.diastolic,
    }));

    if (data.length === 0) {
      return <EmptyChart label={VITAL_META.blood_pressure.label} />;
    }

    return (
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
            <Tooltip
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.recordedAt
                  ? new Date(payload[0].payload.recordedAt).toLocaleString('en-IN')
                  : ''
              }
            />
            {bands.map((b) => (
              <ReferenceArea
                key={b.label}
                y1={b.y1}
                y2={b.y2}
                fill="#00c48c"
                fillOpacity={0.12}
                strokeOpacity={0}
              />
            ))}
            <Legend />
            <Line type="monotone" dataKey="systolic" stroke="#0066ff" strokeWidth={2} dot={{ r: 3 }} name="Systolic" />
            <Line type="monotone" dataKey="diastolic" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} name="Diastolic" />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted text-center mt-1">
          Green band = normal systolic (90–119). Blue = systolic, purple = diastolic.
        </p>
      </div>
    );
  }

  const data = filtered.map((r) => ({
    date: formatChartDate(r.recordedAt),
    recordedAt: r.recordedAt,
    value:
      type === 'blood_sugar'
        ? r.glucose
        : r.value,
  }));

  if (data.length === 0) {
    return <EmptyChart label={VITAL_META[type].label} />;
  }

  const lineColor =
    type === 'blood_sugar'
      ? '#f59e0b'
      : type === 'heart_rate'
        ? '#ef4444'
        : type === 'oxygen'
          ? '#06b6d4'
          : '#0066ff';

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
          <Tooltip
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.recordedAt
                ? new Date(payload[0].payload.recordedAt).toLocaleString('en-IN')
                : ''
            }
          />
          {bands.map((b) => (
            <ReferenceArea
              key={b.label}
              y1={b.y1}
              y2={b.y2}
              fill="#00c48c"
              fillOpacity={0.12}
              strokeOpacity={0}
            />
          ))}
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: 3 }}
            name={VITAL_META[type].label}
          />
        </LineChart>
      </ResponsiveContainer>
      {bands.length > 0 && (
        <p className="text-xs text-muted text-center mt-1">Green band = normal range</p>
      )}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center rounded-xl border border-dashed border-border bg-background/50 text-sm text-muted">
      No {label} readings in the last 30 days — log one below
    </div>
  );
}
