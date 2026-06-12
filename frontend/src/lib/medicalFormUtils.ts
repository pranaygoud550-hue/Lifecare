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
  const payload: Record<string, unknown> = {
    bloodGroup: form.bloodGroup,
    organDonor: !!form.organDonor,
    allergies: parseCommaList(form.allergies),
    chronicConditions: parseCommaList(form.chronicConditions),
    currentMedications: parseCommaList(form.currentMedications),
    familyHistory: parseCommaList(form.familyHistory),
  };

  const heightCm = finiteNumber(form.heightCm);
  const weightKg = finiteNumber(form.weightKg);
  if (heightCm !== undefined) payload.heightCm = heightCm;
  if (weightKg !== undefined) payload.weightKg = weightKg;
  if (form.smokingStatus?.trim()) payload.smokingStatus = form.smokingStatus.trim();
  if (form.alcoholUse?.trim()) payload.alcoholUse = form.alcoholUse.trim();
  if (form.insuranceProvider?.trim()) payload.insuranceProvider = form.insuranceProvider.trim();
  if (form.insuranceNumber?.trim()) payload.insuranceNumber = form.insuranceNumber.trim();
  if (form.dateOfBirth?.trim()) payload.dateOfBirth = form.dateOfBirth.trim();
  if (form.gender?.trim()) payload.gender = form.gender.trim();

  return payload;
}

export function isPatientProfileIncomplete(user: { userType?: string; medicalHistory?: { profileCompleted?: boolean; bloodGroup?: string } } | null): boolean {
  if (!user || user.userType !== 'patient') return false;
  return !user.medicalHistory?.profileCompleted && !user.medicalHistory?.bloodGroup;
}
