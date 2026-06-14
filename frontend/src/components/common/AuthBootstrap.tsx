import { useEffect, useRef } from 'react';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { useGetProfileQuery } from '@/features/api/apiSlice';
import { useAppDispatch } from '@/hooks/redux';
import { setUser, setAuthStatus } from '@/features/auth/authSlice';
import { hasAuthTokens } from '@/lib/authTokens';
import { hasSessionHint, readStoredUser } from '@/lib/authStorage';

/** Validates stored session on load and syncs the user profile from the API. */
export function AuthBootstrap() {
  const dispatch = useAppDispatch();
  const handled = useRef(false);
  const shouldValidate = hasSessionHint() || hasAuthTokens();

  const { data, error, isError, isSuccess, isFetching } = useGetProfileQuery(undefined, {
    skip: !shouldValidate,
  });

  useEffect(() => {
    if (handled.current) return;

    if (!shouldValidate) {
      dispatch(setAuthStatus('anonymous'));
      handled.current = true;
      return;
    }

    if (isFetching) return;

    if (isSuccess && data?.data) {
      dispatch(setUser(data.data));
      handled.current = true;
      return;
    }

    if (isError) {
      const stored = readStoredUser();
      const status = (error as FetchBaseQueryError | undefined)?.status;

      // Offline or transient failure — keep local session until the API responds.
      if (stored && hasAuthTokens() && (status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR')) {
        dispatch(setUser(stored));
        handled.current = true;
        return;
      }

      // Valid cached user + tokens but profile endpoint failed after refresh — still allow app use.
      if (stored && hasAuthTokens() && status === 401) {
        dispatch(setAuthStatus('anonymous'));
        handled.current = true;
        return;
      }

      if (stored && hasAuthTokens()) {
        dispatch(setUser(stored));
        handled.current = true;
        return;
      }

      dispatch(setAuthStatus('anonymous'));
      handled.current = true;
    }
  }, [shouldValidate, isSuccess, isError, isFetching, data, error, dispatch]);

  return null;
}
