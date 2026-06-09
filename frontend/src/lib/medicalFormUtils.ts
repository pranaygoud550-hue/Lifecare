import type { PatientMedicalFormValues } from '@/components/auth/PatientMedicalForm';

export function formatDateForInput(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return '';
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
  return value;
}

export function parseCommaList(value?: string): string[] {
  if (!value?.trim()) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

export function buildMedicalHistoryPayload(form: PatientMedicalFormValues) {
  return {
    bloodGroup: form.bloodGroup,
    heightCm: finiteNumber(form.heightCm),
    weightKg: finiteNumber(form.weightKg),
    organDonor: !!form.organDonor,
    smokingStatus: form.smokingStatus || undefined,
    alcoholUse: form.alcoholUse || undefined,
    allergies: parseCommaList(form.allergies),
    chronicConditions: parseCommaList(form.chronicConditions),
    currentMedications: parseCommaList(form.currentMedications),
    familyHistory: parseCommaList(form.familyHistory),
    insuranceProvider: form.insuranceProvider || undefined,
    insuranceNumber: form.insuranceNumber || undefined,
    dateOfBirth: form.dateOfBirth || undefined,
    gender: form.gender || undefined,
  };
}

export function isPatientProfileIncomplete(user: { userType?: string; medicalHistory?: { profileCompleted?: boolean; bloodGroup?: string } } | null): boolean {
  if (!user || user.userType !== 'patient') return false;
  return !user.medicalHistory?.profileCompleted && !user.medicalHistory?.bloodGroup;
}
