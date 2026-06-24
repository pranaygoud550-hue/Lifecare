import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useDemoLoginMutation } from '@/features/api/apiSlice';
import { useAppDispatch } from '@/hooks/redux';
import { setUser } from '@/features/auth/authSlice';
import { getApiErrorMessage } from '@/lib/apiError';
import { storeAuthTokens } from '@/lib/authTokens';
import { DEMO_ACCOUNTS, getPostLoginPath } from '@/lib/demoAuth';
import { markOnboardingComplete } from '@/lib/onboardingStorage';
import type { User } from '@/types';

export function useDemoAuth() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [demoLogin] = useDemoLoginMutation();
  const [loadingPhone, setLoadingPhone] = useState<string | null>(null);

  const signInAsDemo = useCallback(
    async (phone: string) => {
      setLoadingPhone(phone);
      try {
        const result = await demoLogin({ phone }).unwrap();
        const user = result.data.user as User;
        storeAuthTokens(result.data.accessToken, result.data.refreshToken);
        dispatch(setUser(user));
        markOnboardingComplete();
        toast.success(`Signed in as ${user.profile.firstName} (${user.userType})`);
        navigate(getPostLoginPath(user));
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Demo sign-in failed. Try again or use Login.'));
      } finally {
        setLoadingPhone(null);
      }
    },
    [demoLogin, dispatch, navigate]
  );

  return { accounts: DEMO_ACCOUNTS, signInAsDemo, loadingPhone };
}
