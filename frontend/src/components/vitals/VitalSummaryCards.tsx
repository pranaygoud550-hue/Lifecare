import { Activity, Droplets, Heart, Scale, Wind } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  evaluateVitalStatus,
  formatVitalDisplay,
  STATUS_STYLES,
  VITAL_META,
} from '@/lib/vitalRanges';
import type { VitalReading, VitalType } from '@/types';

const ICONS: Record<VitalType, typeof Heart> = {
  blood_pressure: Activity,
  blood_sugar: Droplets,
  weight: Scale,
  heart_rate: Heart,
  oxygen: Wind,
};

interface VitalSummaryCardsProps {
  latest: VitalReading[];
}

export function VitalSummaryCards({ latest }: VitalSummaryCardsProps) {
  const order: VitalType[] = ['blood_pressure', 'blood_sugar', 'heart_rate', 'oxygen', 'weight'];

  const byType = new Map(latest.map((r) => [r.type, r]));

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {order.map((type) => {
        const reading = byType.get(type);
        const Icon = ICONS[type];
        const meta = VITAL_META[type];

        if (!reading) {
          return (
            <Card key={type} className="border-dashed opacity-80">
              <CardContent className="p-4">
                <Icon className="h-5 w-5 text-muted mb-2" />
                <p className="text-xs font-medium text-muted">{meta.label}</p>
                <p className="text-sm text-muted mt-1">No data yet</p>
              </CardContent>
            </Card>
          );
        }

        const status = evaluateVitalStatus(reading);
        const style = STATUS_STYLES[status];

        return (
          <Card key={type} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-1 mb-2">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <Badge variant={style.badge} className="text-[10px] px-1.5">
                  {style.label}
                </Badge>
              </div>
              <p className="text-xs text-muted font-medium">{meta.label}</p>
              <p className="text-lg font-bold mt-1 leading-tight">{formatVitalDisplay(reading)}</p>
              <p className="text-[10px] text-muted mt-2">
                {new Date(reading.recordedAt).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
