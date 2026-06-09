import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '@/hooks/redux';

const PATIENT_SHELL_PREFIXES = [
  '/dashboard',
  '/appointments',
  '/pharmacy',
  '/live-checkup',
  '/prescriptions',
  '/cart',
  '/notifications',
];

export function usePatientAppShell(): boolean {
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const { pathname } = useLocation();

  return useMemo(() => {
    if (!isAuthenticated || user?.userType !== 'patient') return false;
    return PATIENT_SHELL_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
  }, [isAuthenticated, user?.userType, pathname]);
}
