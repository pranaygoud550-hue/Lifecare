import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, FileText, Video } from 'lucide-react';
import { useAppSelector } from '@/hooks/redux';
import { useGetAppointmentsQuery } from '@/features/api/apiSlice';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types';

const legacyCarePaths = ['/appointments', '/prescriptions', '/live-checkup'];

export function PatientCareNav() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const location = useLocation();

  const { data: appointmentsData } = useGetAppointmentsQuery({}, { skip: !isAuthenticated || user?.userType !== 'patient' });

  if (!isAuthenticated || user?.userType !== 'patient') {
    return null;
  }

  const onLegacyCare = legacyCarePaths.some((p) => location.pathname.startsWith(p));

  if (!onLegacyCare) return null;

  const appointments = (appointmentsData?.data?.appointments || []) as Appointment[];
  const liveCount = appointments.filter((a) =>
    ['confirmed', 'in-progress'].includes(a.status) && ['video', 'audio'].includes(a.consultationType)
  ).length;

  const tabs = [
    { to: '/dashboard?tab=care&care=appointments', label: t('nav.appointments'), icon: Calendar },
    { to: '/dashboard?tab=care&care=prescriptions', label: t('nav.prescriptions'), icon: FileText },
    { to: '/live-checkup', label: t('nav.liveCheckup'), icon: Video, badge: liveCount },
  ];

  return (
    <div className="border-b border-border bg-card/80 sticky top-16 z-40">
      <div className="container-custom">
        <nav className="flex gap-1 overflow-x-auto py-2 scrollbar-hide" aria-label="Care navigation">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted hover:bg-background'
                )
              }
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.badge && tab.badge > 0 ? (
                <span className="bg-secondary text-white text-xs px-1.5 rounded-full">{tab.badge}</span>
              ) : null}
            </NavLink>
          ))}
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-primary whitespace-nowrap ml-auto"
          >
            {t('care.backToDashboard')}
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
