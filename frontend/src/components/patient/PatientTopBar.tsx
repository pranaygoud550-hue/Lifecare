import { Link, useNavigate } from 'react-router-dom';
import { LifeCareLogo } from '@/components/brand/LifeCareLogo';
import { NotificationBell } from '@/components/common/NotificationBell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppSelector } from '@/hooks/redux';
import { getInitials } from '@/lib/utils';

export function PatientTopBar() {
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0" aria-label="LifeCare+ Home">
          <LifeCareLogo size={32} idSuffix="-patient-top" />
          <span className="font-bold text-foreground text-lg">
            LifeCare<span className="text-primary">+</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={() => navigate('/dashboard/profile')}
            className="rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all p-0.5"
            aria-label="Open profile"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.profile?.profilePhoto} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {getInitials(user.profile?.firstName ?? 'U', user.profile?.lastName ?? '')}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>
    </header>
  );
}
