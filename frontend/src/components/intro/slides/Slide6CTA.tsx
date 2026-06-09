import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useDemoLoginMutation } from '@/features/api/apiSlice';
import { useAppDispatch } from '@/hooks/redux';
import { setUser } from '@/features/auth/authSlice';
import { getApiErrorMessage } from '@/lib/apiError';
import { markIntroSeen } from '@/hooks/useIntroSeen';
import { IntroBlobBg, IntroSlideShell } from '../intro-shared';
import type { User } from '@/types';

const DEMO_ROLES = [
  { phone: '9876543210', label: 'Patient', emoji: '🧑‍⚕️' },
  { phone: '9876543216', label: 'Doctor', emoji: '👨‍⚕️' },
  { phone: '9999999999', label: 'Admin', emoji: '📊' },
] as const;

type Props = {
  active: boolean;
  onComplete: () => void;
  onBack: () => void;
};

function postLoginPath(user: User): string {
  if (user.userType === 'admin') return '/admin';
  if (user.userType === 'ambulance') return '/attendant';
  return '/dashboard';
}

export function Slide6CTA({ active, onComplete, onBack }: Props) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [demoLogin, { isLoading }] = useDemoLoginMutation();

  const finish = (path: string) => {
    markIntroSeen();
    onComplete();
    navigate(path, { replace: true });
  };

  const handleDemo = async (phone: string) => {
    try {
      const result = await demoLogin({ phone }).unwrap();
      dispatch(setUser(result.data.user));
      toast.success(`Signed in as ${result.data.user.profile.firstName} (${result.data.user.userType})`);
      finish(postLoginPath(result.data.user));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Demo sign-in failed'));
    }
  };

  return (
    <IntroSlideShell active={active} direction="forward" className="max-w-2xl">
      <IntroBlobBg variant="cta" />
      <p className="mb-4 text-sm uppercase tracking-[0.18em] text-blue-300/80">You&apos;ve seen what LifeCare+ can do.</p>
      <h2 className="text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
        Ready to explore
        <br />
        <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
          real healthcare tech?
        </span>
      </h2>
      <p className="mt-5 text-base text-white/60 sm:text-lg">
        Recruiters: use one-tap demo login below.
        <br />
        No OTP. No setup. Live on Vercel + Render.
      </p>

      <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => finish('/register')}
          className="intro-cta-primary rounded-2xl px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:scale-[1.02]"
        >
          🚀 Get Started Free
        </button>
        <button
          type="button"
          onClick={() => finish('/')}
          className="rounded-2xl border border-white/40 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10"
        >
          Explore Homepage →
        </button>
      </div>

      <div className="mt-10 w-full max-w-lg">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">Recruiter quick demo</p>
        <div className="grid grid-cols-3 gap-2">
          {DEMO_ROLES.map((role) => (
            <button
              key={role.phone}
              type="button"
              disabled={isLoading}
              onClick={() => handleDemo(role.phone)}
              className="rounded-xl border border-blue-500/30 bg-[#1A1A2E] px-2 py-3 text-sm font-medium text-white transition hover:border-blue-400/60 hover:bg-blue-500/10 disabled:opacity-50"
            >
              <span className="block text-lg">{role.emoji}</span>
              {role.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/35">Password@123 · Seeded demo accounts</p>
      </div>

      <p className="mt-6 text-xs text-white/35">Free demo · No credit card · Works in 60 seconds</p>

      <button
        type="button"
        onClick={onBack}
        className="absolute bottom-6 left-6 z-20 text-sm text-white/50 hover:text-white/80"
      >
        ← Back
      </button>
    </IntroSlideShell>
  );
}
