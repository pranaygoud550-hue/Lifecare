import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ShieldCheck } from 'lucide-react';
import { useUnlockAccountMutation } from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function UnlockAccountPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [unlockAccount, { isLoading }] = useUnlockAccountMutation();
  const [done, setDone] = useState(false);

  const handleUnlock = async () => {
    if (!token) {
      toast.error('Invalid unlock link');
      return;
    }
    try {
      await unlockAccount({ token }).unwrap();
      setDone(true);
      toast.success('Account unlocked. You can sign in now.');
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      toast.error(error.data?.message || 'Unlock failed');
    }
  };

  return (
    <div className="container-custom py-16 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle>Unlock your account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-sm text-muted">
          {done ? (
            <>
              <p>Your account has been unlocked.</p>
              <Button asChild className="w-full">
                <Link to="/login">Sign in</Link>
              </Button>
            </>
          ) : (
            <>
              <p>
                Your account was locked after too many failed sign-in attempts. Click below to restore access.
              </p>
              <Button className="w-full" onClick={handleUnlock} disabled={isLoading || !token}>
                {isLoading ? 'Unlocking...' : 'Unlock account'}
              </Button>
              {!token && <p className="text-destructive">This link is missing a valid token.</p>}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
