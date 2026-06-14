import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Package, Pill } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { logout } from '@/features/auth/authSlice';
import { useLogoutMutation } from '@/features/api/apiSlice';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn, getInitials } from '@/lib/utils';

const navItems = [
  { to: '/pharmacy/portal', icon: Package, label: 'Orders', end: true },
  { to: '/pharmacy/portal/inventory', icon: Pill, label: 'Inventory', end: true },
];

export function PharmacyShell() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [logoutApi] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch {
      /* ignore */
    }
    dispatch(logout());
    navigate('/login');
  };

  if (!user) return null;

  const pharmacyName = user.pharmacyDetails?.pharmacyName || 'Pharmacy';

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="md:w-64 border-b md:border-b-0 md:border-r border-border bg-card shrink-0">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-secondary/15 flex items-center justify-center">
              <Pill className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="font-bold text-sm">{pharmacyName}</p>
              <p className="text-xs text-muted">Pharmacy workspace</p>
            </div>
          </div>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
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
              <AvatarFallback>{getInitials(user.profile.firstName, user.profile.lastName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user.profile.firstName}</p>
              <p className="text-xs text-muted truncate">{user.phone}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur px-4 py-3 md:px-8 flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4 text-muted" />
          <p className="text-sm text-muted">Fulfill orders & manage stock — separate from patient shop</p>
        </header>
        <main className="p-4 md:p-8 max-w-5xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
