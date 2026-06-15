import type { User } from '@/types';
import { isPatientProfileIncomplete } from '@/lib/medicalFormUtils';

/** Shown in login & onboarding — patient + doctor only for interviews. */
export const DEMO_ACCOUNTS = [
  {
    phone: '9876543210',
    label: 'Patient',
    role: 'patient' as const,
    description: 'Book doctors, SOS, MediScan, pharmacy & wallet',
  },
  {
    phone: '9876543211',
    label: 'Doctor',
    role: 'doctor' as const,
    description: 'Patient list, live video consults & care plans',
  },
] as const;

/** All backend demo phones (staff portals still work if needed in dev). */
export const ALL_DEMO_PHONES = [
  '9876543210',
  '9876543211',
  '9876543215',
  '9876543216',
  '9999999999',
] as const;

export function getPostLoginPath(user: User): string {
  if (isPatientProfileIncomplete(user)) return '/dashboard/profile';
  if (user.userType === 'admin') return '/admin';
  if (user.userType === 'doctor') return '/doctor/patients';
  if (user.userType === 'ambulance') return '/driver';
  if (user.userType === 'pharmacy') return '/pharmacy/portal';
  return '/dashboard';
}

export function isDemoPhone(phone: string): boolean {
  return ALL_DEMO_PHONES.includes(phone as (typeof ALL_DEMO_PHONES)[number]);
}
