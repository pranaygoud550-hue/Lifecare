import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useGetHospitalProfileQuery } from '@/features/api/apiSlice';

export function HospitalLegalGate() {
  const location = useLocation();
  const { data, isLoading } = useGetHospitalProfileQuery();

  if (isLoading) {
    return <p className="text-muted text-sm">Loading hospital profile…</p>;
  }

  const legalComplete = data?.data?.legalComplete;
  const onLegalPage = location.pathname === '/hospital/legal';

  if (!legalComplete && !onLegalPage) {
    return <Navigate to="/hospital/legal" replace />;
  }

  return <Outlet />;
}
