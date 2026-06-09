import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/hooks/redux';
import { isPatientProfileIncomplete } from '@/lib/medicalFormUtils';
import { PageSkeleton } from '@/components/common/PageSkeleton';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { authStatus, user } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (authStatus === 'loading') {
    return <PageSkeleton variant="dashboard" />;
  }

  if (authStatus !== 'authenticated' || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.userType)) {
    return <Navigate to="/dashboard" replace />;
  }

  const onProfileScreen =
    location.pathname === '/dashboard/profile' ||
    (location.pathname === '/dashboard' &&
      new URLSearchParams(location.search).get('tab') === 'profile');

  const profileExempt =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/unlock-account');

  if (
    isPatientProfileIncomplete(user) &&
    location.pathname !== '/patient-profile' &&
    !onProfileScreen &&
    !profileExempt
  ) {
    return <Navigate to="/dashboard/profile" replace />;
  }

  return <Outlet />;
}
