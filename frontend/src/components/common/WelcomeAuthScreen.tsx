import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LifeCareLogo } from '@/components/brand/LifeCareLogo';

const SKIP_KEY = 'lifecare-welcome-skipped';

export function markWelcomeSkipped() {
  sessionStorage.setItem(SKIP_KEY, '1');
}

export function isWelcomeSkipped() {
  return sessionStorage.getItem(SKIP_KEY) === '1';
}

export function WelcomeAuthScreen({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();

  const go = (path: string) => {
    markWelcomeSkipped();
    onDone();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-[99] flex items-center justify-center bg-gradient-to-br from-primary/5 via-white to-secondary/5 p-4">
      <div className="w-full max-w-md text-center">
        <LifeCareLogo size={88} showWordmark={false} className="mx-auto mb-6" idSuffix="-welcome" />
        <h1 className="text-3xl font-bold mb-2">
          Welcome to <span className="text-primary">LifeCare+</span>
        </h1>
        <p className="text-muted mb-8">
          Log in or sign up to book doctors and manage your health.
        </p>
        <div className="space-y-3">
          <Button className="w-full h-12 gap-2" onClick={() => go('/login')}>
            <LogIn className="h-5 w-5" /> Log In
          </Button>
          <Button variant="outline" className="w-full h-12 gap-2" onClick={() => go('/register')}>
            <UserPlus className="h-5 w-5" /> Sign Up
          </Button>
          <button
            type="button"
            onClick={() => go('/')}
            className="w-full flex items-center justify-center gap-2 text-sm text-muted hover:text-primary py-3"
          >
            <Compass className="h-4 w-4" /> Continue without account
          </button>
        </div>
      </div>
    </div>
  );
}
