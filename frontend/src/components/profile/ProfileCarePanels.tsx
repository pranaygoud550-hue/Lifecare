import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Video,
  FileText,
  Download,
  ShoppingBag,
  FolderOpen,
  Wallet,
  Stethoscope,
  ChevronRight,
  ScanLine,
} from 'lucide-react';
import { useGetUnifiedScanHistoryQuery } from '@/features/api/apiSlice';
import { scanTypeLabel } from '@/lib/mediscan';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { downloadPrescriptionPdf } from '@/lib/prescriptionDownload';
import type { Appointment, Prescription, User, PharmacyOrder } from '@/types';

const ORDER_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  confirmed: 'default',
  packed: 'secondary',
  shipped: 'secondary',
  delivered: 'success',
  cancelled: 'danger',
};

function canJoinVideo(appointment: Appointment): boolean {
  if (!['confirmed', 'in-progress'].includes(appointment.status)) return false;
  if (appointment.consultationType !== 'video') return false;
  const scheduled = new Date(appointment.scheduledDate);
  const [h, m] = appointment.scheduledTime.split(':').map(Number);
  scheduled.setHours(h, m || 0, 0, 0);
  const diffMins = (scheduled.getTime() - Date.now()) / (1000 * 60);
  return appointment.status === 'in-progress' || (diffMins <= 15 && diffMins >= -30);
}

function getDoctor(appt: Appointment): User | null {
  return typeof appt.doctorId === 'object' ? (appt.doctorId as User) : null;
}

export function ProfileAppointmentsPanel({
  appointments,
  loading,
  liveCount,
}: {
  appointments: Appointment[];
  loading: boolean;
  liveCount: number;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const upcoming = appointments
    .filter((a) => ['pending', 'confirmed', 'in-progress'].includes(a.status))
    .sort((a, b) => {
      const da = new Date(`${a.scheduledDate}T${a.scheduledTime}`);
      const db = new Date(`${b.scheduledDate}T${b.scheduledTime}`);
      return da.getTime() - db.getTime();
    });

  return (
    <div className="space-y-4">
      {liveCount > 0 && (
        <Card className="border-secondary/40 bg-secondary/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex gap-3">
              <Video className="h-6 w-6 text-secondary shrink-0" />
              <div>
                <p className="font-bold">{t('dashboard.liveCheckupReady')}</p>
                <p className="text-sm text-muted">{t('dashboard.liveCheckupReadyDesc')}</p>
              </div>
            </div>
            <Link to="/live-checkup">
              <Button className="gap-2">
                <Video className="h-4 w-4" /> {t('dashboard.openLiveCheckup')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted">{t('dashboard.upcomingVisits', { count: upcoming.length })}</p>
        <Link to="/doctors">
          <Button size="sm">{t('dashboard.bookNewDoctor')}</Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Calendar className="h-10 w-10 text-muted mx-auto mb-3" />
            <p className="font-medium mb-1">{t('dashboard.noAppointments')}</p>
            <p className="text-sm text-muted mb-4">{t('dashboard.noAppointmentsDesc')}</p>
            <Link to="/doctors">
              <Button>{t('dashboard.findDoctor')}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {upcoming.map((appt) => {
            const doctor = getDoctor(appt);
            const joinable = canJoinVideo(appt);
            return (
              <Card key={appt._id}>
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                  <div className="flex gap-3 flex-1">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={doctor?.profile.profilePhoto} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(doctor?.profile.firstName, doctor?.profile.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">
                        Dr. {doctor?.profile.firstName} {doctor?.profile.lastName}
                      </p>
                      <p className="text-sm text-muted capitalize">
                        {appt.consultationType} · {formatDate(appt.scheduledDate)} at {appt.scheduledTime}
                      </p>
                      <Badge variant="secondary" className="mt-2 capitalize text-xs">
                        {appt.status.replace('-', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {joinable && (
                      <Button size="sm" className="gap-1" onClick={() => navigate(`/live-checkup/${appt._id}`)}>
                        <Video className="h-4 w-4" /> {t('dashboard.join')}
                      </Button>
                    )}
                    <Link to="/appointments">
                      <Button size="sm" variant="outline">
                        {t('dashboard.fullDetails')}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Link to="/dashboard?tab=care&care=appointments" className="inline-flex items-center text-sm text-primary font-medium hover:underline">
        {t('dashboard.fullAppointmentsList')} <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function ProfilePrescriptionsPanel({
  prescriptions,
  loading,
}: {
  prescriptions: Prescription[];
  loading: boolean;
}) {
  const { t } = useTranslation();
  const getDoctorFromRx = (rx: Prescription) =>
    typeof rx.doctorId === 'object' ? (rx.doctorId as User) : null;

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="h-32 bg-border rounded-xl animate-pulse" />
      ) : prescriptions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <FileText className="h-10 w-10 text-muted mx-auto mb-3" />
            <p className="text-muted">{t('dashboard.prescriptionsAfterVisit')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {prescriptions.slice(0, 8).map((rx) => {
            const doctor = getDoctorFromRx(rx);
            return (
              <Card key={rx._id}>
                <CardContent className="p-4">
                  <p className="font-semibold">{rx.diagnosis || 'Prescription'}</p>
                  <p className="text-sm text-muted mt-1">
                    {formatDate(rx.date)}
                    {doctor && ` · Dr. ${doctor.profile.firstName}`}
                  </p>
                  <p className="text-xs text-muted">{t('dashboard.medicinesCount', { count: rx.medications?.length || 0 })}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 gap-1"
                    onClick={() => downloadPrescriptionPdf(rx, doctor)}
                  >
                    <Download className="h-3.5 w-3.5" /> {t('dashboard.downloadPdf')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <Link to="/prescriptions" className="inline-flex items-center text-sm text-primary font-medium hover:underline">
        {t('dashboard.allPrescriptions')} <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function ProfilePharmacyPanel({ orders, loading }: { orders: PharmacyOrder[]; loading: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {loading ? (
        <div className="h-24 animate-pulse bg-border rounded-xl" />
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <ShoppingBag className="h-8 w-8 text-muted mx-auto mb-2" />
            <p className="text-muted mb-3">{t('dashboard.noMedicineOrders')}</p>
            <Link to="/pharmacy">
              <Button size="sm">{t('dashboard.browsePharmacy')}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.slice(0, 6).map((order) => (
            <Card key={order._id}>
              <CardContent className="p-4 flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {order.items?.map((i) => i.medicineName).slice(0, 2).join(', ')}
                  </p>
                  <p className="text-sm text-muted">
                    {order.orderId} · {formatCurrency(order.pricing?.total || 0)}
                  </p>
                </div>
                <Badge variant={ORDER_STATUS_VARIANT[order.delivery?.currentStatus] || 'secondary'} className="capitalize shrink-0">
                  {order.delivery?.currentStatus || 'pending'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Link to="/pharmacy" className="inline-flex items-center text-sm text-primary font-medium hover:underline">
        {t('dashboard.goToPharmacy')} <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function ProfileRecordsWalletPanel({
  recordsCount,
  walletBalance,
  scanCount,
}: {
  recordsCount: number;
  walletBalance: number;
  scanCount?: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Card>
        <CardContent className="p-5 flex flex-col gap-3">
          <FolderOpen className="h-8 w-8 text-primary" />
          <div>
            <p className="font-bold">{t('dashboard.healthRecords')}</p>
            <p className="text-sm text-muted">{t('dashboard.filesSaved', { count: recordsCount })}</p>
          </div>
          <Link to="/health-records">
            <Button variant="outline" className="w-full">
              {t('dashboard.openVault')}
            </Button>
          </Link>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5 flex flex-col gap-3">
          <ScanLine className="h-8 w-8 text-violet-600" />
          <div>
            <p className="font-bold">AI scan history</p>
            <p className="text-sm text-muted">
              {scanCount ?? 0} saved scan{(scanCount ?? 0) !== 1 ? 's' : ''} (X-ray, skin, eye)
            </p>
          </div>
          <Link to="/patient/scan-history">
            <Button variant="outline" className="w-full">
              View scan history
            </Button>
          </Link>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5 flex flex-col gap-3">
          <Wallet className="h-8 w-8 text-primary" />
          <div>
            <p className="font-bold">{t('dashboard.wallet')}</p>
            <p className="text-sm text-muted">{t('dashboard.balance', { amount: formatCurrency(walletBalance) })}</p>
          </div>
          <Link to="/wallet">
            <Button variant="outline" className="w-full">
              {t('dashboard.manageWallet')}
            </Button>
          </Link>
        </CardContent>
      </Card>
      <Card className="sm:col-span-2 border-dashed">
        <CardContent className="p-4 flex items-center gap-3">
          <Stethoscope className="h-6 w-6 text-primary" />
          <p className="text-sm text-muted flex-1">{t('dashboard.careTabHint')}</p>
          <Link to="/dashboard?tab=vitals">
            <Button size="sm">{t('dashboard.viewVitals')}</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProfileScanHistoryPreview() {
  const { data } = useGetUnifiedScanHistoryQuery();
  const recent = (data?.data ?? []).slice(0, 3);

  if (recent.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Recent AI scans</h3>
        <Link to="/patient/scan-history" className="text-sm text-primary font-medium hover:underline">
          View all
        </Link>
      </div>
      <div className="space-y-2">
        {recent.map((scan) => (
          <Card key={`${scan.source}-${scan.id}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <ScanLine className="h-5 w-5 text-violet-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {scanTypeLabel(scan.scanType)}
                  {scan.prediction ? ` — ${scan.prediction}` : ''}
                </p>
                <p className="text-xs text-muted">
                  {new Date(scan.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {scan.confidence != null ? ` · ${scan.confidence.toFixed(0)}%` : ''}
                </p>
              </div>
              <Link to={scan.source === 'mediscan_report' ? `/dashboard/mediscan?scan=${scan.id}` : '/patient/scan-history'}>
                <Button size="sm" variant="ghost">
                  Open
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
