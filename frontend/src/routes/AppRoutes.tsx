import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/common/Layout';
import { CareLayout } from '@/components/common/CareLayout';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { PageSkeleton } from '@/components/common/PageSkeleton';

const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const DoctorsPage = lazy(() => import('@/pages/DoctorsPage').then((m) => ({ default: m.DoctorsPage })));
const HospitalMapPage = lazy(() => import('@/pages/HospitalMapPage').then((m) => ({ default: m.HospitalMapPage })));
const PatientHospitalsPage = lazy(() =>
  import('@/pages/patient/PatientHospitalsPage').then((m) => ({ default: m.PatientHospitalsPage }))
);
const DoctorDetailPage = lazy(() => import('@/pages/DoctorDetailPage').then((m) => ({ default: m.DoctorDetailPage })));
const BookingPage = lazy(() => import('@/pages/BookingPage').then((m) => ({ default: m.BookingPage })));
const AppointmentsPage = lazy(() => import('@/pages/AppointmentsPage').then((m) => ({ default: m.AppointmentsPage })));
const PharmacyPage = lazy(() => import('@/pages/PharmacyPage').then((m) => ({ default: m.PharmacyPage })));
const CartPage = lazy(() => import('@/pages/CartPage').then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const PharmacyOrderPage = lazy(() => import('@/pages/PharmacyOrderPage').then((m) => ({ default: m.PharmacyOrderPage })));
const AmbulancePage = lazy(() => import('@/pages/AmbulancePage').then((m) => ({ default: m.AmbulancePage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const PrescriptionsPage = lazy(() => import('@/pages/PrescriptionsPage').then((m) => ({ default: m.PrescriptionsPage })));
const HealthRecordsPage = lazy(() => import('@/pages/HealthRecordsPage').then((m) => ({ default: m.HealthRecordsPage })));
const WalletPage = lazy(() => import('@/pages/WalletPage').then((m) => ({ default: m.WalletPage })));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const LiveCheckupPage = lazy(() => import('@/pages/LiveCheckupPage').then((m) => ({ default: m.LiveCheckupPage })));
const ConsultationRoomPage = lazy(() =>
  import('@/pages/ConsultationRoomPage').then((m) => ({ default: m.ConsultationRoomPage }))
);
const PatientProfileHubPage = lazy(() =>
  import('@/pages/PatientProfileHubPage').then((m) => ({ default: m.PatientProfileHubPage }))
);
const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const DoctorVerificationPage = lazy(() =>
  import('@/pages/doctor/DoctorVerificationPage').then((m) => ({ default: m.DoctorVerificationPage }))
);
const TransportEscortPage = lazy(() =>
  import('@/pages/TransportEscortPage').then((m) => ({ default: m.TransportEscortPage }))
);
const TransportStatusPage = lazy(() =>
  import('@/pages/TransportStatusPage').then((m) => ({ default: m.TransportStatusPage }))
);
const PublicTrackPage = lazy(() => import('@/pages/PublicTrackPage').then((m) => ({ default: m.PublicTrackPage })));
const AttendantDashboardPage = lazy(() =>
  import('@/pages/AttendantDashboardPage').then((m) => ({ default: m.AttendantDashboardPage }))
);
const RegularRidesPage = lazy(() => import('@/pages/RegularRidesPage').then((m) => ({ default: m.RegularRidesPage })));
const UnlockAccountPage = lazy(() => import('@/pages/UnlockAccountPage').then((m) => ({ default: m.UnlockAccountPage })));
const MediScanPage = lazy(() => import('@/pages/MediScanPage').then((m) => ({ default: m.MediScanPage })));
const WellnessPage = lazy(() => import('@/pages/WellnessPage').then((m) => ({ default: m.WellnessPage })));
const PatientProfilePage = lazy(() =>
  import('@/pages/PatientProfilePage').then((m) => ({ default: m.PatientProfilePage }))
);
const DoctorScansPage = lazy(() =>
  import('@/pages/DoctorScansPage').then((m) => ({ default: m.DoctorScansPage }))
);
const ScanAnalysisPage = lazy(() =>
  import('@/pages/patient/ScanAnalysisPage').then((m) => ({ default: m.ScanAnalysisPage }))
);
const EmergencyHistoryPage = lazy(() =>
  import('@/pages/EmergencyHistoryPage').then((m) => ({ default: m.EmergencyHistoryPage }))
);
const ScanHistoryPage = lazy(() =>
  import('@/pages/patient/ScanHistoryPage').then((m) => ({ default: m.ScanHistoryPage }))
);

function PageLoad({ variant }: { variant?: 'default' | 'dashboard' | 'list' }) {
  return <PageSkeleton variant={variant} />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoad />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="unlock-account" element={<UnlockAccountPage />} />
          <Route path="doctors" element={<Suspense fallback={<PageLoad variant="list" />}><DoctorsPage /></Suspense>} />
          <Route path="hospitals/nearby" element={<Suspense fallback={<PageLoad variant="list" />}><HospitalMapPage /></Suspense>} />
          <Route path="doctors/:id" element={<DoctorDetailPage />} />
          <Route path="pharmacy" element={<PharmacyPage />} />
          <Route path="ambulance" element={<AmbulancePage />} />
          <Route path="track/:token" element={<PublicTrackPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="transport/book" element={<TransportEscortPage />} />
            <Route path="transport/status" element={<TransportStatusPage />} />
            <Route path="regular-rides" element={<RegularRidesPage />} />
            <Route path="patient-profile" element={<PatientProfileHubPage />} />
            <Route path="doctors/:id/book" element={<BookingPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="pharmacy/orders/:id" element={<PharmacyOrderPage />} />
            <Route path="dashboard" element={<Suspense fallback={<PageLoad variant="dashboard" />}><DashboardPage /></Suspense>} />
            <Route
              path="dashboard/profile"
              element={
                <Suspense fallback={<PageLoad variant="dashboard" />}>
                  <PatientProfilePage />
                </Suspense>
              }
            />
            <Route path="dashboard/mediscan" element={<Suspense fallback={<PageLoad variant="dashboard" />}><MediScanPage /></Suspense>} />
            <Route path="dashboard/wellness" element={<Suspense fallback={<PageLoad variant="dashboard" />}><WellnessPage /></Suspense>} />
            <Route
              path="dashboard/emergency-history"
              element={
                <Suspense fallback={<PageLoad variant="dashboard" />}>
                  <EmergencyHistoryPage />
                </Suspense>
              }
            />
            <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
              <Route
                path="patient/hospitals"
                element={
                  <Suspense fallback={<PageLoad variant="list" />}>
                    <PatientHospitalsPage />
                  </Suspense>
                }
              />
              <Route
                path="patient/scan-analysis"
                element={
                  <Suspense fallback={<PageLoad variant="dashboard" />}>
                    <ScanAnalysisPage />
                  </Suspense>
                }
              />
              <Route
                path="patient/scan-history"
                element={
                  <Suspense fallback={<PageLoad variant="dashboard" />}>
                    <ScanHistoryPage />
                  </Suspense>
                }
              />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
              <Route
                path="dashboard/doctor/scans"
                element={
                  <Suspense fallback={<PageLoad variant="dashboard" />}>
                    <DoctorScansPage />
                  </Suspense>
                }
              />
            </Route>
            <Route path="health-records" element={<HealthRecordsPage />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="notifications" element={<NotificationsPage />} />

            <Route element={<CareLayout />}>
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="prescriptions" element={<PrescriptionsPage />} />
              <Route path="live-checkup" element={<LiveCheckupPage />} />
              <Route path="live-checkup/:appointmentId" element={<ConsultationRoomPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ambulance']} />}>
            <Route path="attendant" element={<AttendantDashboardPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
            <Route path="doctor/verification" element={<DoctorVerificationPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="admin/users" element={<AdminUsersPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
