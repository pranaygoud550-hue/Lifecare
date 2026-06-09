import type { VitalReading, VitalType } from '@/types';

export type VitalStatus = 'normal' | 'elevated' | 'concerning' | 'unknown';

export function evaluateVitalStatus(reading: VitalReading): VitalStatus {
  switch (reading.type) {
    case 'blood_pressure': {
      const sys = reading.systolic ?? 0;
      const dia = reading.diastolic ?? 0;
      if (sys >= 140 || dia >= 90) return 'concerning';
      if (sys >= 130 || dia >= 80 || sys >= 120) return 'elevated';
      if (sys >= 90 && sys < 120 && dia >= 60 && dia < 80) return 'normal';
      if (sys < 90 || dia < 60) return 'elevated';
      return 'unknown';
    }
    case 'blood_sugar': {
      const g = reading.glucose ?? 0;
      if (reading.glucoseMeal === 'fasting') {
        if (g >= 126) return 'concerning';
        if (g >= 100) return 'elevated';
        if (g >= 70 && g < 100) return 'normal';
        return 'elevated';
      }
      if (g >= 200) return 'concerning';
      if (g >= 140) return 'elevated';
      if (g < 140) return 'normal';
      return 'unknown';
    }
    case 'heart_rate': {
      const v = reading.value ?? 0;
      if (v < 50 || v > 100) return 'concerning';
      if (v < 60 || v > 90) return 'elevated';
      return 'normal';
    }
    case 'oxygen': {
      const v = reading.value ?? 0;
      if (v < 90) return 'concerning';
      if (v < 95) return 'elevated';
      return 'normal';
    }
    case 'weight':
      return 'normal';
    default:
      return 'unknown';
  }
}

export function formatVitalDisplay(reading: VitalReading): string {
  switch (reading.type) {
    case 'blood_pressure':
      return `${reading.systolic}/${reading.diastolic} mmHg`;
    case 'blood_sugar':
      return `${reading.glucose} mg/dL (${reading.glucoseMeal === 'fasting' ? 'Fasting' : 'Post-meal'})`;
    case 'weight':
      return `${reading.value} ${reading.unit || 'kg'}`;
    case 'heart_rate':
      return `${reading.value} bpm`;
    case 'oxygen':
      return `${reading.value}% SpO₂`;
    default:
      return '—';
  }
}

export const VITAL_META: Record<
  VitalType,
  { label: string; unit: string; normalHint: string }
> = {
  blood_pressure: {
    label: 'Blood pressure',
    unit: 'mmHg',
    normalHint: 'Normal: below 120/80 mmHg',
  },
  blood_sugar: {
    label: 'Blood sugar',
    unit: 'mg/dL',
    normalHint: 'Fasting: 70–99 · Post-meal: under 140',
  },
  weight: {
    label: 'Weight',
    unit: 'kg',
    normalHint: 'Track your trend over time',
  },
  heart_rate: {
    label: 'Heart rate',
    unit: 'bpm',
    normalHint: 'Normal: 60–100 bpm',
  },
  oxygen: {
    label: 'Oxygen (SpO₂)',
    unit: '%',
    normalHint: 'Normal: 95–100%',
  },
};

/** Reference bands for Recharts ReferenceArea (y1, y2) */
export function getChartReferenceBands(
  type: VitalType,
  glucoseMeal?: 'fasting' | 'post_meal'
): { y1: number; y2: number; label: string }[] {
  switch (type) {
    case 'blood_pressure':
      return [{ y1: 90, y2: 119, label: 'Normal systolic range' }];
    case 'blood_sugar':
      return glucoseMeal === 'post_meal'
        ? [{ y1: 70, y2: 139, label: 'Normal post-meal' }]
        : [{ y1: 70, y2: 99, label: 'Normal fasting' }];
    case 'heart_rate':
      return [{ y1: 60, y2: 100, label: 'Normal range' }];
    case 'oxygen':
      return [{ y1: 95, y2: 100, label: 'Normal SpO₂' }];
    default:
      return [];
  }
}

export const STATUS_STYLES: Record<VitalStatus, { badge: 'success' | 'warning' | 'danger' | 'secondary'; label: string }> = {
  normal: { badge: 'success', label: 'Normal' },
  elevated: { badge: 'warning', label: 'Watch' },
  concerning: { badge: 'danger', label: 'Concerning' },
  unknown: { badge: 'secondary', label: '—' },
};
