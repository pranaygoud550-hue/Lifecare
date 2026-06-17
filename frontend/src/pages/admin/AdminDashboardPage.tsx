import { useState } from 'react';
import {
  Users, Stethoscope, Calendar, DollarSign, ShieldAlert, Activity, Database,
  Wifi, ExternalLink, Check, X, Star, TrendingUp, CalendarDays, Zap,
  UserPlus, ShoppingBag, AlertTriangle, FileText, Wallet,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  useGetAdminDashboardQuery,
  useGetPendingDoctorVerificationsQuery,
  useGetPendingReviewsQuery,
  useApproveDoctorVerificationMutation,
  useRejectDoctorVerificationMutation,
  useModerateReviewMutation,
} from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCurrency, getInitials, cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '@/lib/apiError';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User, Review, PlatformActivity, PlatformActivityType } from '@/types';

function docUrl(path?: string) {
  if (!path) return null;
  return path.startsWith('http') ? path : path;
}

const ACTIVITY_ICONS: Record<PlatformActivityType, typeof Activity> = {
  user_registered: UserPlus,
  appointment_booked: Calendar,
  appointment_completed: Stethoscope,
  order_placed: ShoppingBag,
  wallet_topup: Wallet,
  emergency_sos: AlertTriangle,
  prescription_issued: FileText,
};

const ACTIVITY_COLORS: Record<PlatformActivityType, string> = {
  user_registered: 'bg-blue-100 text-blue-700',
  appointment_booked: 'bg-violet-100 text-violet-700',
  appointment_completed: 'bg-emerald-100 text-emerald-700',
  order_placed: 'bg-amber-100 text-amber-700',
  wallet_topup: 'bg-teal-100 text-teal-700',
  emergency_sos: 'bg-red-100 text-red-700',
  prescription_issued: 'bg-indigo-100 text-indigo-700',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function AdminDashboardPage() {
  const { data: dashData, isLoading } = useGetAdminDashboardQuery(undefined, { pollingInterval: 15000 });
  const { data: pendingDoctors } = useGetPendingDoctorVerificationsQuery();
  const { data: pendingReviews } = useGetPendingReviewsQuery();
  const [approveDoctor] = useApproveDoctorVerificationMutation();
  const [rejectDoctor] = useRejectDoctorVerificationMutation();
  const [moderateReview] = useModerateReviewMutation();

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewDoctor, setViewDoctor] = useState<User | null>(null);

  const dash = dashData?.data;
  const health = dash?.platformHealth;
  const doctors = pendingDoctors?.data || [];
  const reviews = (pendingReviews?.data || []) as Review[];
  const activity = dash?.recentActivity || [];

  const handleApprove = async (id: string) => {
    try {
      await approveDoctor(id).unwrap();
      toast.success('Doctor approved — notification email sent');
      setViewDoctor(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Approve failed'));
    }
  };

  const handleReject = async () => {
    if (!rejectId || rejectReason.trim().length < 5) {
      toast.error('Enter a rejection reason (min 5 characters)');
      return;
    }
    try {
      await rejectDoctor({ id: rejectId, reason: rejectReason }).unwrap();
      toast.success('Doctor rejected — email sent with reason');
      setRejectId(null);
      setRejectReason('');
      setViewDoctor(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Reject failed'));
    }
  };

  const handleModerate = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await moderateReview({ id, status }).unwrap();
      toast.success(`Review ${status}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Moderation failed'));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/80">
        <div className="container-custom py-8 space-y-6">
          <div className="h-10 w-64 bg-border rounded animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-xl border animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total users',
      value: dash?.kpis.totalUsers ?? 0,
      sub: `${dash?.kpis.totalPatients ?? 0} patients · ${dash?.kpis.totalDoctors ?? 0} doctors`,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Active doctors',
      value: dash?.kpis.activeDoctors ?? 0,
      sub: 'Verified & active',
      icon: Stethoscope,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'Appointments today',
      value: dash?.kpis.todayAppointments ?? 0,
      sub: `${dash?.kpis.weekAppointments ?? 0} this week`,
      icon: Calendar,
      color: 'from-violet-500 to-purple-600',
    },
    {
      label: 'This week',
      value: dash?.kpis.weekAppointments ?? 0,
      sub: 'Bookings since Monday',
      icon: CalendarDays,
      color: 'from-indigo-500 to-blue-600',
    },
    {
      label: 'Wallet top-ups (month)',
      value: formatCurrency(dash?.kpis.revenueThisMonth ?? 0),
      sub: 'Credit top-ups via Stripe/wallet',
      icon: DollarSign,
      color: 'from-amber-500 to-orange-600',
      isMoney: true,
    },
    {
      label: 'Pending verifications',
      value: dash?.kpis.pendingVerifications ?? 0,
      sub: 'Doctors & pharmacies',
      icon: ShieldAlert,
      color: 'from-rose-500 to-pink-600',
    },
  ];

  const walletChart = dash?.charts.dailyWalletTopups || [];
  const specChart = dash?.charts.appointmentsBySpecialization || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="container-custom py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">LifeCare+ Admin</p>
            <h1 className="text-2xl font-bold text-slate-900">Platform overview</h1>
          </div>
          <div className="flex gap-2 items-center">
            <Link to="/admin/users">
              <Button variant="outline" size="sm">User management</Button>
            </Link>
            <Link to="/admin/hospital-staff">
              <Button variant="outline" size="sm">Hospital staff</Button>
            </Link>
            <Badge variant="secondary" className="gap-1 py-1.5 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live · 15s refresh
            </Badge>
          </div>
        </div>
      </div>

      <div className="container-custom py-8 space-y-8">
        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
          {kpis.map((k) => (
            <Card key={k.label} className="overflow-hidden border-0 shadow-md">
              <CardContent className="p-0">
                <div className={cn('h-1 bg-gradient-to-r', k.color)} />
                <div className="p-5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted uppercase tracking-wide">{k.label}</p>
                    <p className="text-2xl font-bold mt-1 text-slate-900 truncate">
                      {k.isMoney ? k.value : k.value.toLocaleString('en-IN')}
                    </p>
                    {k.sub && <p className="text-[11px] text-muted mt-1">{k.sub}</p>}
                  </div>
                  <div className={cn('p-2.5 rounded-xl bg-gradient-to-br text-white shadow-sm shrink-0', k.color)}>
                    <k.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Charts — 2 cols */}
          <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Wallet top-ups (30 days)</CardTitle>
                <CardDescription>Real credit top-ups from patient wallets</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={walletChart}>
                    <defs>
                      <linearGradient id="walletGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <Tooltip formatter={(value) => [formatCurrency(typeof value === 'number' ? value : Number(value ?? 0)), 'Top-ups']} />
                    <Area type="monotone" dataKey="revenue" stroke="#0d9488" fill="url(#walletGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Appointments by specialty</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={specChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="specialization" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Platform health + live activity summary */}
          <div className="space-y-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Platform health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <HealthRow
                  icon={Zap}
                  label="API response time"
                  value={health ? `${health.apiResponseTimeMs || '—'} ms` : '…'}
                  ok={!!health && health.apiResponseTimeMs < 500}
                />
                <HealthRow
                  icon={Database}
                  label="Database"
                  value={
                    health
                      ? `${health.database.status}${health.database.inMemory ? ' (in-memory)' : ''}`
                      : '…'
                  }
                  ok={health?.database.status === 'connected'}
                />
                <HealthRow
                  icon={Wifi}
                  label="Socket.io connections"
                  value={health ? String(health.socketConnections) : '…'}
                  ok
                />
                <HealthRow
                  icon={TrendingUp}
                  label="Total appointments"
                  value={dash ? String(dash.services.appointments) : '…'}
                  ok
                />
                <p className="text-[10px] text-muted pt-2">
                  Updated {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '—'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent activity feed */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recent platform activity
            </CardTitle>
            <CardDescription>Last 10 actions across registrations, bookings, SOS, orders & wallet</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted py-8 text-center">No recent activity yet — seed the database or run demo flows</p>
            ) : (
              <div className="divide-y divide-border">
                {activity.map((item: PlatformActivity) => {
                  const Icon = ACTIVITY_ICONS[item.type] || Activity;
                  return (
                    <div key={item.id} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                      <div className={cn('p-2.5 rounded-xl shrink-0', ACTIVITY_COLORS[item.type])}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900">{item.title}</p>
                        <p className="text-xs text-muted truncate">{item.subtitle}</p>
                      </div>
                      <span className="text-xs text-muted shrink-0 tabular-nums">
                        {relativeTime(item.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Doctor verification queue */}
          <Card className="xl:col-span-2 shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                Pending doctor verifications
              </CardTitle>
              <CardDescription>Review credentials and approve or reject</CardDescription>
            </CardHeader>
            <CardContent>
              {doctors.length === 0 ? (
                <p className="text-sm text-muted py-8 text-center">No pending verifications</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted">
                        <th className="pb-3 font-medium">Doctor</th>
                        <th className="pb-3 font-medium">License</th>
                        <th className="pb-3 font-medium">Submitted</th>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctors.map((doc) => {
                        const docs = doc.doctorDetails?.verificationDocuments;
                        return (
                          <tr key={doc._id} className="border-b border-border/60 last:border-0">
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={doc.profile.profilePhoto} />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(doc.profile.firstName, doc.profile.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">Dr. {doc.profile.firstName} {doc.profile.lastName}</p>
                                  <p className="text-xs text-muted">{doc.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-muted">
                              {docs?.medicalLicenseNumber || doc.doctorDetails?.registrationNumber || '—'}
                            </td>
                            <td className="py-3 text-muted">
                              {docs?.submittedAt
                                ? new Date(docs.submittedAt).toLocaleDateString('en-IN')
                                : '—'}
                            </td>
                            <td className="py-3">
                              <div className="flex justify-end gap-1 flex-wrap">
                                <Button size="sm" variant="outline" onClick={() => setViewDoctor(doc)}>
                                  Documents
                                </Button>
                                <Button size="sm" variant="default" onClick={() => handleApprove(doc._id)}>
                                  <Check className="h-3.5 w-3.5 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="danger" onClick={() => setRejectId(doc._id)}>
                                  <X className="h-3.5 w-3.5 mr-1" /> Reject
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service totals */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Service volume</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatRow label="Total appointments" value={dash?.services.appointments ?? 0} />
              <StatRow label="Pharmacy orders" value={dash?.services.orders ?? 0} />
              <StatRow label="Ambulance requests" value={dash?.services.ambulanceRequests ?? 0} />
              <StatRow label="Pharmacies onboarded" value={dash?.users.pharmacies ?? 0} />
            </CardContent>
          </Card>
        </div>

        {/* Flagged reviews */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Reviews awaiting moderation
            </CardTitle>
            <CardDescription>Low ratings or flagged content</CardDescription>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted py-6 text-center">No pending reviews</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => {
                  const reviewer =
                    typeof r.reviewedBy === 'object' && r.reviewedBy?.profile
                      ? `${r.reviewedBy.profile.firstName} ${r.reviewedBy.profile.lastName}`
                      : 'User';
                  return (
                    <div
                      key={r._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{reviewer}</span>
                          <Badge variant="outline" className="text-amber-700 border-amber-300">
                            {r.rating} ★
                          </Badge>
                          <Badge variant="secondary">{r.reviewType}</Badge>
                        </div>
                        {r.review && <p className="text-sm text-muted mt-1 line-clamp-2">{r.review}</p>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" onClick={() => handleModerate(r._id, 'approved')}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleModerate(r._id, 'rejected')}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Document viewer modal */}
      {viewDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setViewDoctor(null)}>
          <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>
                Dr. {viewDoctor.profile.firstName} {viewDoctor.profile.lastName}
              </CardTitle>
              <CardDescription>Verification documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Medical license', url: viewDoctor.doctorDetails?.verificationDocuments?.medicalLicenseFile },
                { label: 'Degree certificate', url: viewDoctor.doctorDetails?.verificationDocuments?.degreeCertificateFile },
                { label: 'Identity proof', url: viewDoctor.doctorDetails?.verificationDocuments?.identityProofFile },
              ].map((d) => (
                <div key={d.label} className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <span className="text-sm font-medium">{d.label}</span>
                  {d.url ? (
                    <a
                      href={docUrl(d.url) || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary flex items-center gap-1 hover:underline"
                    >
                      View <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="text-xs text-muted">Not uploaded</span>
                  )}
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={() => handleApprove(viewDoctor._id)}>
                  Approve
                </Button>
                <Button variant="danger" className="flex-1" onClick={() => { setRejectId(viewDoctor._id); setViewDoctor(null); }}>
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reject reason modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Reject verification</CardTitle>
              <CardDescription>This reason will be emailed to the doctor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Reason for rejection (min 5 characters)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setRejectId(null); setRejectReason(''); }}>
                  Cancel
                </Button>
                <Button variant="danger" className="flex-1" onClick={handleReject}>
                  Send rejection
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function HealthRow({
  icon: Icon,
  label,
  value,
  ok,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
      <div className={cn('p-2 rounded-lg', ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="font-semibold text-sm capitalize truncate">{value}</p>
      </div>
      <span className={cn('h-2 w-2 rounded-full shrink-0', ok ? 'bg-emerald-500' : 'bg-amber-500')} />
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
      <span className="text-sm text-muted">{label}</span>
      <span className="font-bold text-slate-900">{value.toLocaleString('en-IN')}</span>
    </div>
  );
}
