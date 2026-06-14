import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu, X, User, LogOut, Calendar, ShoppingCart,
  FileText, Video, LayoutDashboard, ScanLine, Sparkles, Pill,
} from 'lucide-react';
import { LifeCareLogo } from '@/components/brand/LifeCareLogo';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { logout } from '@/features/auth/authSlice';
import { selectCartCount } from '@/features/cart/cartSlice';
import { NotificationBell } from '@/components/common/NotificationBell';
import { NeedHelpButton } from '@/components/emergency/NeedHelpButton';
import { useGetAppointmentsQuery, useLogoutMutation } from '@/features/api/apiSlice';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types';

export function Header() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const cartCount = useAppSelector(selectCartCount);
  const dispatch = useAppDispatch();
  const [logoutApi] = useLogoutMutation();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthRoute = ['/login', '/register', '/unlock-account'].some((p) =>
    location.pathname.startsWith(p)
  );

  const showCareNav = isAuthenticated && user && !['admin', 'pharmacy', 'ambulance'].includes(user.userType);

  const { data: appointmentsData } = useGetAppointmentsQuery({}, { skip: !showCareNav });
  const appointments = (appointmentsData?.data?.appointments || []) as Appointment[];
  const liveCount = appointments.filter((a) =>
    ['confirmed', 'in-progress'].includes(a.status) && ['video', 'audio'].includes(a.consultationType)
  ).length;

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch {
      /* clear local state even if API fails */
    }
    dispatch(logout());
    navigate('/');
  };

  const publicLinks = useMemo(
    () => [
      { to: '/doctors', label: t('nav.findDoctors') },
      { to: '/pharmacy', label: t('nav.pharmacy') },
    ],
    [t]
  );

  const patientNavLinks = useMemo(
    () => [
      { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
      { to: '/dashboard?tab=care', label: t('nav.myCare'), icon: Calendar },
    ],
    [t]
  );

  const careLinks = useMemo(
    () => [
      { to: '/appointments', label: t('nav.appointments'), icon: Calendar },
      { to: '/prescriptions', label: t('nav.prescriptions'), icon: FileText },
      { to: '/live-checkup', label: t('nav.liveCheckup'), icon: Video, badge: liveCount },
    ],
    [t, liveCount]
  );

  const isMediScanActive = location.pathname.startsWith('/dashboard/mediscan');
  const isPharmacyActive = location.pathname.startsWith('/pharmacy') || location.pathname.startsWith('/cart');

  const isActive = (path: string) => {
    if (path.includes('?')) {
      const [base, query] = path.split('?');
      if (!location.pathname.startsWith(base)) return false;
      const expected = new URLSearchParams(query);
      const current = new URLSearchParams(location.search);
      for (const [key, value] of expected.entries()) {
        if (current.get(key) !== value) return false;
      }
      return true;
    }
    if (path === '/dashboard') {
      return location.pathname.startsWith('/dashboard') && !location.pathname.startsWith('/dashboard/mediscan') && !location.pathname.startsWith('/dashboard/wellness') && !location.pathname.startsWith('/dashboard/doctor');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container-custom flex h-16 items-center justify-between gap-4">
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2.5 font-bold text-xl shrink-0">
          <LifeCareLogo size={36} idSuffix="-header" />
          <span className="hidden sm:inline text-foreground">
            LifeCare<span className="text-primary">+</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {isAuthenticated && showCareNav && user?.userType === 'patient' && (
            <>
              <Link
                to="/dashboard/mediscan"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all',
                  isMediScanActive
                    ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-md'
                    : 'bg-gradient-to-r from-violet-600/90 to-cyan-500/90 text-white hover:from-violet-500 hover:to-cyan-400 shadow-sm'
                )}
              >
                <ScanLine className="h-4 w-4" />
                {t('nav.mediscan')}
                <Sparkles className="h-3 w-3 opacity-80" />
              </Link>
              <Link
                to="/pharmacy"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all mr-1',
                  isPharmacyActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md'
                    : 'bg-gradient-to-r from-emerald-600/90 to-teal-500/90 text-white hover:from-emerald-500 hover:to-teal-400 shadow-sm'
                )}
              >
                <Pill className="h-4 w-4" />
                {t('nav.pharmacy')}
                <Sparkles className="h-3 w-3 opacity-80" />
              </Link>
            </>
          )}
          {isAuthenticated && showCareNav ? (
            user?.userType === 'patient' ? (
              patientNavLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive(link.to)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted hover:text-foreground hover:bg-background'
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))
            ) : (
              careLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive(link.to)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted hover:text-foreground hover:bg-background'
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                  {link.badge && link.badge > 0 ? (
                    <span className="ml-0.5 h-5 min-w-[1.25rem] px-1 rounded-full bg-secondary text-white text-xs flex items-center justify-center">
                      {link.badge}
                    </span>
                  ) : null}
                </Link>
              ))
            )
          ) : (
            publicLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          {!isAuthRoute && <NeedHelpButton variant="header" />}

          {isAuthenticated ? (
            <>
              {user?.userType === 'patient' && (
                <Link to="/cart" className="relative p-2 hover:text-primary">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-white text-xs flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Link>
              )}
              <NotificationBell />
              <Link to="/dashboard">
                <Button variant="ghost" size="icon" title={t('nav.dashboard')}>
                  <LayoutDashboard className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-1 pl-1 border-l border-border">
                <Button variant="outline" size="sm" className="gap-1 max-w-[120px]" onClick={() => navigate('/dashboard?tab=profile')}>
                  <User className="h-4 w-4 shrink-0" />
                  <span className="truncate">{user?.profile.firstName}</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={handleLogout} title={t('nav.logout')}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">{t('nav.login')}</Button></Link>
              <Link to="/register"><Button size="sm">{t('nav.getStarted')}</Button></Link>
            </>
          )}
        </div>

        <div className="md:hidden flex items-center gap-2">
        <button className="p-2" onClick={() => setMobileOpen(!mobileOpen)} aria-label={t('nav.menu')}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card p-4 space-y-1">
          {isAuthenticated && showCareNav ? (
            <>
              {user?.userType === 'patient' && (
                <>
                  <Link
                    to="/dashboard/mediscan"
                    className={cn(
                      'flex items-center gap-3 py-3 px-3 rounded-lg text-sm font-semibold text-white',
                      isMediScanActive
                        ? 'bg-gradient-to-r from-violet-600 to-cyan-500'
                        : 'bg-gradient-to-r from-violet-600/90 to-cyan-500/90'
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    <ScanLine className="h-5 w-5" />
                    {t('nav.mediscanStudio')}
                    <Sparkles className="h-3.5 w-3.5 ml-auto opacity-80" />
                  </Link>
                  <Link
                    to="/pharmacy"
                    className={cn(
                      'flex items-center gap-3 py-3 px-3 rounded-lg text-sm font-semibold text-white',
                      isPharmacyActive
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-500'
                        : 'bg-gradient-to-r from-emerald-600/90 to-teal-500/90'
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Pill className="h-5 w-5" />
                    {t('nav.pharmacyBrand')}
                    <span className="ml-auto flex items-center gap-2">
                      {cartCount > 0 && (
                        <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                          {t('nav.cart')} {cartCount}
                        </span>
                      )}
                      <Sparkles className="h-3.5 w-3.5 opacity-80" />
                    </span>
                  </Link>
                </>
              )}
              {user?.userType === 'patient' ? (
                <>
                  <Link
                    to="/dashboard"
                    className={cn(
                      'flex items-center gap-3 py-3 px-3 rounded-lg text-sm font-medium',
                      isActive('/dashboard') && !location.search.includes('tab=') ? 'bg-primary text-primary-foreground' : 'hover:bg-background'
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    <LayoutDashboard className="h-5 w-5" /> {t('nav.dashboard')}
                  </Link>
                  <Link
                    to="/dashboard?tab=care"
                    className={cn(
                      'flex items-center gap-3 py-3 px-3 rounded-lg text-sm font-medium',
                      isActive('/dashboard?tab=care') ? 'bg-primary text-primary-foreground' : 'hover:bg-background'
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Calendar className="h-5 w-5" /> {t('nav.myCare')}
                  </Link>
                  <Link
                    to="/dashboard?tab=profile"
                    className={cn(
                      'flex items-center gap-3 py-3 px-3 rounded-lg text-sm font-medium',
                      isActive('/dashboard?tab=profile') ? 'bg-primary text-primary-foreground' : 'hover:bg-background'
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    <User className="h-5 w-5" /> {t('nav.profile')}
                  </Link>
                </>
              ) : (
                careLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      'flex items-center gap-3 py-3 px-3 rounded-lg text-sm font-medium',
                      isActive(link.to) ? 'bg-primary text-primary-foreground' : 'hover:bg-background'
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                    {link.badge && link.badge > 0 ? (
                      <span className="ml-auto bg-secondary text-white text-xs px-2 py-0.5 rounded-full">{link.badge}</span>
                    ) : null}
                  </Link>
                ))
              )}
              {publicLinks.map((link) => (
                <Link key={link.to} to={link.to} className="block py-2 px-3 text-sm text-muted" onClick={() => setMobileOpen(false)}>
                  {link.label}
                </Link>
              ))}
            </>
          ) : (
            publicLinks.map((link) => (
              <Link key={link.to} to={link.to} className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            ))
          )}
          {!isAuthenticated && (
            <div className="flex gap-2 pt-3">
              <Link to="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full">{t('nav.login')}</Button>
              </Link>
              <Link to="/register" className="flex-1" onClick={() => setMobileOpen(false)}>
                <Button className="w-full">{t('nav.register')}</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
