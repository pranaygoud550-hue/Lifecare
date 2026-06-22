import { describe, expect, it } from 'vitest';
import { evaluateVitalStatus } from './vitalRanges';

describe('vitalRanges', () => {
  it('flags high blood pressure as concerning', () => {
    expect(
      evaluateVitalStatus({
        type: 'blood_pressure',
        systolic: 150,
        diastolic: 95,
        recordedAt: new Date().toISOString(),
      })
    ).toBe('concerning');
  });

  it('marks normal resting heart rate', () => {
    expect(
      evaluateVitalStatus({
        type: 'heart_rate',
        value: 72,
        recordedAt: new Date().toISOString(),
      })
    ).toBe('normal');
  });
});
