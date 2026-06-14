import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Heart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { OtpInput } from '@/components/auth/OtpInput';
import { DemoLoginButtons } from '@/components/landing/DemoLoginButtons';
import { useLoginOtpMutation, useSendOtpMutation } from '@/features/api/apiSlice';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { setUser } from '@/features/auth/authSlice';
import { getApiErrorMessage } from '@/lib/apiError';
import { getPostLoginPath } from '@/lib/demoAuth';
import { storeAuthTokens } from '@/lib/authTokens';
import { formatPhoneDisplay, isValidIndianMobile, normalizePhone } from '@/lib/phone';
import { useApiReady, useRetryOnFetchError } from '@/hooks/useApiReady';
import type { User } from '@/types';

type Step = 'phone' | 'code';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const authStatus = useAppSelector((s) => s.auth.authStatus);
  const user = useAppSelector((s) => s.auth.user);
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [shownCode, setShownCode] = useState<string | null>(null);

  const [sendOtp, { isLoading: sendingOtp }] = useSendOtpMutation();
  const [loginOtp, { isLoading: verifyingOtp }] = useLoginOtpMutation();
  const { checking: apiChecking } = useApiReady();
  const retryOnFetchError = useRetryOnFetchError();

  const afterAuth = (data: { user: User; accessToken?: string; refreshToken?: string }) => {
    storeAuthTokens(data.accessToken, data.refreshToken);
    dispatch(setUser(data.user));
    toast.success(`Signed in as ${data.user.profile.firstName} (${data.user.userType})`);
    navigate(getPostLoginPath(data.user));
  };

  const handleGetCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const normalized = normalizePhone(phone);
    if (!isValidIndianMobile(normalized)) {
      toast.error(t('auth.invalidPhone'));
      return;
    }
    setNormalizedPhone(normalized);
    try {
      const result = await retryOnFetchError(() =>
        sendOtp({ phone: normalized, purpose: 'login' }).unwrap()
      );
      setStep('code');
      setOtp('');
      if (result.data.otp) {
        setShownCode(result.data.otp);
        toast.success('Your sign-in code is ready');
      } else {
        setShownCode(null);
        toast.success('OTP sent to your mobile');
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not send OTP'));
    }
  };

  const handleVerifyCode = async () => {
    if (otp.length !== 6) return;
    try {
      const result = await loginOtp({ phone: normalizedPhone, otp }).unwrap();
      afterAuth(result.data);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Wrong or expired OTP'));
    }
  };

  useEffect(() => {
    if (authStatus === 'authenticated' && user) {
      navigate(getPostLoginPath(user), { replace: true });
    }
  }, [authStatus, user, navigate]);

  useEffect(() => {
    if (step === 'code' && otp.length === 6) {
      handleVerifyCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-10 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <Heart className="h-11 w-11 text-primary fill-primary" />
          </div>
          <CardTitle className="text-2xl">{t('nav.login')}</CardTitle>
          <CardDescription>{t('auth.signInSubtitle')}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {step === 'phone' && (
            <form onSubmit={handleGetCode} className="space-y-4">
              <div>
                <Label htmlFor="phone">{t('auth.mobileNumber')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="10-digit mobile number"
                  className="mt-1.5"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={sendingOtp || apiChecking}>
                {sendingOtp ? t('common.loading') : t('auth.getCode')}
                {!sendingOtp && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
          )}

          {step === 'code' && (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted">
                OTP for{' '}
                <span className="font-medium text-foreground">
                  {formatPhoneDisplay(normalizedPhone)}
                </span>
              </p>

              {shownCode && (
                <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center">
                  <p className="text-xs text-muted mb-1">Your OTP (development)</p>
                  <p className="text-3xl font-bold tracking-[0.3em] text-primary">{shownCode}</p>
                  <p className="text-xs text-muted mt-2">Enter below — verifies automatically when complete</p>
                </div>
              )}

              <OtpInput value={otp} onChange={setOtp} disabled={verifyingOtp} />

              <Button
                type="button"
                className="w-full"
                onClick={handleVerifyCode}
                disabled={verifyingOtp || otp.length !== 6}
              >
                {verifyingOtp ? 'Signing in...' : 'Continue'}
              </Button>

              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  className="text-muted hover:text-foreground"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setShownCode(null);
                  }}
                >
                  ← {t('auth.changeNumber')}
                </button>
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => handleGetCode()}
                  disabled={sendingOtp}
                >
                  Resend OTP
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-muted pt-2">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">
              {t('auth.registerNow')}
            </Link>
          </p>

          <div className="pt-4 border-t border-border">
            <DemoLoginButtons compact />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
