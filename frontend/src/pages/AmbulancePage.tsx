import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { dispatchNeedHelp } from '@/lib/needHelp';
import { PageSkeleton } from '@/components/common/PageSkeleton';

/** Legacy /ambulance URL — opens Need Help flow instead of the old booking form. */
export function AmbulancePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatchNeedHelp(dispatch);
    if (isAuthenticated && user?.userType === 'patient') {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [dispatch, navigate, isAuthenticated, user]);

  return <PageSkeleton variant="dashboard" />;
}
