import type { User } from '@/types';
import { isPatientProfileIncomplete } from '@/lib/medicalFormUtils';

export const DEMO_ACCOUNTS = [
  { phone: '9876543210', label: 'Patient', role: 'patient' as const, description: 'Appointments, MediScan, pharmacy' },
  { phone: '9876543211', label: 'Doctor', role: 'doctor' as const, description: 'Consultations & prescriptions' },
  { phone: '9999999999', label: 'Admin', role: 'admin' as const, description: 'Platform management' },
] as const;

export function getPostLoginPath(user: User): string {
  if (isPatientProfileIncomplete(user)) return '/dashboard/profile';
  if (user.userType === 'admin') return '/admin';
  if (user.userType === 'ambulance') return '/attendant';
  return '/dashboard';
}

export function isDemoPhone(phone: string): boolean {
  return DEMO_ACCOUNTS.some((a) => a.phone === phone);
}
