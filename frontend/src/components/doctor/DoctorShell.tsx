import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Calendar, LayoutDashboard, LogOut, Stethoscope, Users, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { logout } from '@/features/auth/authSlice';
import { useLogoutMutation } from '@/features/api/apiSlice';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn, getInitials } from '@/lib/utils';

const navItems = [
  { to: '/doctor/patients', icon: Users, label: 'Patients' },
  { to: '/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/live-checkup', icon: Video, label: 'Live checkup' },
  { to: '/dashboard/doctor/scans', icon: Stethoscope, label: 'AI scans' },
];

export function DoctorShell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [logoutApi] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch {
      /* session may already be cleared */
    }
    dispatch(logout());
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="md:w-64 border-b md:border-b-0 md:border-r border-border bg-card shrink-0">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm">LifeCare+ Doctor</p>
              <p className="text-xs text-muted">Clinical workspace</p>
            </div>
          </div>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/doctor/patients'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted hover:bg-background hover:text-foreground'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 mt-auto border-t border-border">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.profile.profilePhoto} />
              <AvatarFallback>{getInitials(user.profile.firstName, user.profile.lastName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                Dr. {user.profile.firstName} {user.profile.lastName}
              </p>
              <p className="text-xs text-muted truncate">{user.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            {t('common.logout', { defaultValue: 'Sign out' })}
          </Button>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur px-4 py-3 md:px-8">
          <p className="text-sm text-muted">Doctor portal — separate from patient dashboard</p>
        </header>
        <main className="p-4 md:p-8 max-w-5xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
