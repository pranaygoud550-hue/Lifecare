import { useEffect, useRef } from 'react';
import { useGetProfileQuery } from '@/features/api/apiSlice';
import { useAppDispatch } from '@/hooks/redux';
import { setUser, setAuthStatus } from '@/features/auth/authSlice';

/** Validates HTTP-only session cookies on load and syncs user profile */
export function AuthBootstrap() {
  const dispatch = useAppDispatch();
  const handled = useRef(false);

  const { data, isError, isSuccess, isFetching } = useGetProfileQuery();

  useEffect(() => {
    if (handled.current || isFetching) return;

    if (isSuccess && data?.data) {
      dispatch(setUser(data.data));
      handled.current = true;
      return;
    }

    if (isError) {
      dispatch(setAuthStatus('anonymous'));
      handled.current = true;
    }
  }, [isSuccess, isError, isFetching, data, dispatch]);

  return null;
}
