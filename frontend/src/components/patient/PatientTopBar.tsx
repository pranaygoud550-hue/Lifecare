import { Link, useNavigate } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import { LifeCareLogo } from '@/components/brand/LifeCareLogo';
import { NotificationBell } from '@/components/common/NotificationBell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { dispatchNeedHelp } from '@/lib/needHelp';
import { getInitials } from '@/lib/utils';

export function PatientTopBar() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
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
          <button
            type="button"
            onClick={() => dispatchNeedHelp(dispatch)}
            className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 min-h-[36px]"
            aria-label="Need Help — emergency and hospital transport"
          >
            <LifeBuoy className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Need Help</span>
          </button>
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
