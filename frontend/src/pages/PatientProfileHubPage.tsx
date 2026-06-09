import { Navigate, useSearchParams } from 'react-router-dom';

const TAB_MAP: Record<string, string> = {
  medical: 'profile',
  appointments: 'care',
  prescriptions: 'care',
  files: 'profile',
};

const CARE_MAP: Record<string, string> = {
  appointments: 'appointments',
  prescriptions: 'prescriptions',
};

/** Redirects legacy /patient-profile routes to the unified dashboard hub. */
export function PatientProfileHubPage() {
  const [searchParams] = useSearchParams();
  const legacyTab = searchParams.get('tab') || 'medical';

  if (legacyTab === 'pharmacy') {
    return <Navigate to="/pharmacy" replace />;
  }

  const dashboardTab = TAB_MAP[legacyTab] || 'profile';
  const careSub = CARE_MAP[legacyTab];

  const params = new URLSearchParams({ tab: dashboardTab });
  if (careSub) params.set('care', careSub);

  if (dashboardTab === 'profile') {
    return <Navigate to="/dashboard/profile" replace />;
  }

  return <Navigate to={`/dashboard?${params.toString()}`} replace />;
}
