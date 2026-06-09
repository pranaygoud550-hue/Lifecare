import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Salad, Calendar, ScanLine, Pill, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = {
  id: string;
  labelKey: string;
  to: string;
  icon: typeof Home;
  end?: boolean;
  isCenter?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'home', labelKey: 'patientNav.home', to: '/dashboard', icon: Home, end: true },
  { id: 'diet', labelKey: 'patientNav.diet', to: '/dashboard/wellness', icon: Salad },
  { id: 'appointments', labelKey: 'patientNav.appointments', to: '/appointments', icon: Calendar },
  { id: 'mediscan', labelKey: 'patientNav.mediscan', to: '/dashboard/mediscan', icon: ScanLine, isCenter: true },
  { id: 'pharmacy', labelKey: 'patientNav.pharmacy', to: '/pharmacy', icon: Pill },
  { id: 'profile', labelKey: 'patientNav.profile', to: '/dashboard/profile', icon: User },
];

function isNavActive(pathname: string, search: string, item: NavItem): boolean {
  if (item.id === 'home') {
    return (
      pathname === '/dashboard' &&
      (!search.includes('tab=') || search.includes('tab=overview') || search === '')
    );
  }
  if (item.id === 'profile') {
    return pathname === '/dashboard/profile' || (pathname === '/dashboard' && search.includes('tab=profile'));
  }
  if (item.id === 'diet') {
    return pathname === '/dashboard/wellness' || pathname.startsWith('/dashboard/wellness/');
  }
  if (item.id === 'mediscan') {
    return pathname.startsWith('/dashboard/mediscan');
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function PatientBottomNav() {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-[4.25rem] max-w-lg items-end justify-around px-1 sm:px-2">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, search, item);
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <NavLink
                key={item.id}
                to={item.to}
                className="relative -top-5 flex flex-col items-center gap-0.5"
                aria-label={t(item.labelKey)}
              >
                <span
                  className={cn(
                    'flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform',
                    'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
                    'ring-4 ring-card',
                    active ? 'scale-105 shadow-emerald-500/40' : 'hover:scale-105'
                  )}
                >
                  <ScanLine className="h-7 w-7" strokeWidth={2.25} />
                </span>
                <span
                  className={cn(
                    'text-[10px] font-bold mt-0.5',
                    active ? 'text-emerald-600' : 'text-muted'
                  )}
                >
                  {t(item.labelKey)}
                </span>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.end}
              className={cn(
                'flex min-w-[2.75rem] flex-1 max-w-[4.5rem] flex-col items-center justify-center gap-0.5 py-2 px-0.5 rounded-xl transition-colors',
                active ? 'text-primary' : 'text-muted hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
              <span className={cn('text-[10px] font-medium leading-none', active && 'font-bold')}>
                {t(item.labelKey)}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
