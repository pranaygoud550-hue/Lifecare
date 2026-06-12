import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar, User, Heart, FileText, Settings, Shield, Video, ShieldCheck, Brain,
} from 'lucide-react';
import { useGetDoctorVerificationStatusQuery } from '@/features/api/apiSlice';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { toggleLargeText } from '@/features/accessibility/accessibilitySlice';
import { useGetAppointmentsQuery } from '@/features/api/apiSlice';
import { PatientDashboard } from '@/components/dashboard/PatientDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DoctorScheduleEditor } from '@/components/doctor/DoctorScheduleEditor';
import { getInitials } from '@/lib/utils';

const ROLE_KEYS: Record<string, string> = {
  patient: 'dashboard.rolePatient',
  doctor: 'dashboard.roleDoctor',
  admin: 'dashboard.roleAdmin',
  ambulance: 'dashboard.roleAmbulance',
};

/** Non-patient dashboards (doctor, admin, ambulance) */
function StaffDashboard() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const largeText = useAppSelector((s) => s.accessibility.largeText);
  const { data: appointmentsData } = useGetAppointmentsQuery({});
  const { data: verificationData } = useGetDoctorVerificationStatusQuery(undefined, {
    skip: user?.userType !== 'doctor',
  });

  if (!user) return null;

  const verificationStatus = verificationData?.data?.verificationStatus;
  const showVerificationBanner =
    user.userType === 'doctor' && verificationStatus && verificationStatus !== 'approved';

  const upcomingCount =
    appointmentsData?.data?.appointments?.filter((a) =>
      ['pending', 'confirmed', 'in-progress'].includes(a.status)
    ).length || 0;

  const doctorLinks = [
    { to: '/appointments', icon: Calendar, label: t('dashboard.appointments'), desc: t('dashboard.appointmentsDesc', { count: upcomingCount }) },
    { to: '/dashboard/doctor/scans', icon: Brain, label: t('dashboard.aiScans'), desc: t('dashboard.aiScansDesc') },
    { to: '/live-checkup', icon: Video, label: t('dashboard.liveCheckup'), desc: t('dashboard.liveCheckupDesc') },
    { to: '/prescriptions', icon: FileText, label: t('dashboard.prescriptions'), desc: t('dashboard.prescriptionsDesc') },
    { to: '/doctor/verification', icon: ShieldCheck, label: t('dashboard.verification'), desc: t('dashboard.verificationDesc') },
  ];

  const adminLinks = [
    { to: '/admin', icon: Shield, label: t('dashboard.adminDashboard'), desc: t('dashboard.adminDesc') },
    { to: '/admin/users', icon: Settings, label: t('dashboard.userManagement'), desc: t('dashboard.userManagementDesc') },
  ];

  const attendantLinks = [
    { to: '/attendant', icon: Heart, label: t('dashboard.attendantDashboard'), desc: t('dashboard.attendantDesc') },
  ];

  const quickLinks =
    user.userType === 'admin'
      ? adminLinks
      : user.userType === 'ambulance'
        ? attendantLinks
        : doctorLinks;

  const roleLabel = ROLE_KEYS[user.userType] ? t(ROLE_KEYS[user.userType]) : user.userType;

  return (
    <div className="container-custom py-8">
      <div className="flex items-center gap-4 mb-8">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user.profile.profilePhoto} />
          <AvatarFallback className="text-xl">
            {getInitials(user.profile.firstName, user.profile.lastName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.welcome', { name: user.profile.firstName })}</h1>
          <p className="text-muted capitalize">{t('dashboard.staffTitle', { role: roleLabel })}</p>
        </div>
      </div>

      {showVerificationBanner && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-amber-900">
                {verificationStatus === 'pending'
                  ? t('dashboard.verificationPending')
                  : verificationStatus === 'rejected'
                    ? t('dashboard.verificationRejected')
                    : t('dashboard.verificationIncomplete')}
              </p>
              <p className="text-sm text-amber-800 mt-0.5">
                {verificationStatus === 'rejected'
                  ? verificationData?.data?.rejectionReason || t('dashboard.verificationRejectedHint')
                  : t('dashboard.verificationPendingHint')}
              </p>
            </div>
            <Link to="/doctor/verification">
              <Button size="sm">{t('dashboard.viewStatus')}</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {quickLinks.map((link) => (
          <Link key={link.to} to={link.to}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <link.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{link.label}</h3>
                  <p className="text-sm text-muted">{link.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" /> {t('dashboard.profile')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted">{t('dashboard.email')}:</span> {user.email}
            </p>
            <p>
              <span className="text-muted">{t('dashboard.phone')}:</span> {user.phone}
            </p>
          </CardContent>
        </Card>

        {user.userType === 'doctor' && user.doctorDetails && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('dashboard.doctorStats')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="text-muted">{t('dashboard.specialization')}:</span>{' '}
                  {user.doctorDetails.specializations?.join(', ')}
                </p>
                <p>
                  <span className="text-muted">{t('dashboard.rating')}:</span> {user.doctorDetails.rating} (
                  {user.doctorDetails.reviewCount} {t('dashboard.reviews')})
                </p>
              </CardContent>
            </Card>
            <div className="lg:col-span-2">
              <DoctorScheduleEditor />
            </div>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.accessibility')}</CardTitle>
          </CardHeader>
          <CardContent>
            <button
              type="button"
              onClick={() => dispatch(toggleLargeText())}
              className="text-lg font-medium text-primary hover:underline min-h-[48px]"
            >
              {largeText ? t('dashboard.largeTextOn') : t('dashboard.largeTextOff')}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAppSelector((state) => state.auth);

  if (user?.userType === 'patient') {
    return <PatientDashboard />;
  }

  return <StaffDashboard />;
}
