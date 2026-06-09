import { User, Appointment, Order, AmbulanceRequest, EmergencyRequest, Prescription } from '../models/index.js';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function startOfWeekMonday(): Date {
  const d = startOfDay(new Date());
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

export type ActivityType =
  | 'user_registered'
  | 'appointment_booked'
  | 'appointment_completed'
  | 'order_placed'
  | 'wallet_topup'
  | 'emergency_sos'
  | 'prescription_issued';

export interface PlatformActivity {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  timestamp: string;
}

/** Sum wallet credit top-ups between dates (from embedded wallet transactions). */
export async function sumWalletTopupsBetween(from: Date, to: Date): Promise<number> {
  const result = await User.aggregate([
    { $unwind: '$wallet.transactions' },
    {
      $match: {
        'wallet.transactions.type': 'credit',
        'wallet.transactions.category': 'topup',
        'wallet.transactions.timestamp': { $gte: from, $lte: to },
      },
    },
    { $group: { _id: null, total: { $sum: '$wallet.transactions.amount' } } },
  ]);

  return result[0]?.total ?? 0;
}

export async function buildDailyWalletTopupsLast30Days(): Promise<
  { date: string; revenue: number; label: string }[]
> {
  const days: { date: string; revenue: number; label: string }[] = [];
  const today = startOfDay(new Date());

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({
      date: dateKey(d),
      revenue: 0,
      label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    });
  }

  const map = new Map(days.map((d) => [d.date, d]));
  const from = new Date(today);
  from.setDate(from.getDate() - 29);

  const rows = await User.aggregate([
    { $unwind: '$wallet.transactions' },
    {
      $match: {
        'wallet.transactions.type': 'credit',
        'wallet.transactions.category': 'topup',
        'wallet.transactions.timestamp': { $gte: from },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$wallet.transactions.timestamp' },
        },
        total: { $sum: '$wallet.transactions.amount' },
      },
    },
  ]);

  for (const row of rows) {
    const bucket = map.get(row._id);
    if (bucket) bucket.revenue = row.total;
  }

  return days;
}

export async function buildDailyRevenueLast30Days(): Promise<
  { date: string; revenue: number; label: string }[]
> {
  const days: { date: string; revenue: number; label: string }[] = [];
  const today = startOfDay(new Date());

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({
      date: dateKey(d),
      revenue: 0,
      label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    });
  }

  const map = new Map(days.map((d) => [d.date, d]));
  const from = new Date(today);
  from.setDate(from.getDate() - 29);

  const [appts, orders, ambulances] = await Promise.all([
    Appointment.find({ 'payment.status': 'paid', createdAt: { $gte: from } }).select(
      'payment.amount createdAt'
    ),
    Order.find({ 'payment.status': 'paid', createdAt: { $gte: from } }).select(
      'pricing.total createdAt'
    ),
    AmbulanceRequest.find({ 'payment.status': 'paid', createdAt: { $gte: from } }).select(
      'charges.total createdAt'
    ),
  ]);

  for (const a of appts) {
    const key = dateKey(new Date(a.createdAt));
    const row = map.get(key);
    if (row) row.revenue += a.payment?.amount || 0;
  }
  for (const o of orders) {
    const key = dateKey(new Date(o.createdAt));
    const row = map.get(key);
    if (row) row.revenue += o.pricing?.total || 0;
  }
  for (const r of ambulances) {
    const key = dateKey(new Date(r.createdAt));
    const row = map.get(key);
    if (row) row.revenue += r.charges?.total || 0;
  }

  return days;
}

export async function sumRevenueBetween(from: Date, to: Date): Promise<number> {
  const [appts, orders, ambulances] = await Promise.all([
    Appointment.find({ 'payment.status': 'paid', createdAt: { $gte: from, $lte: to } }).select(
      'payment.amount'
    ),
    Order.find({ 'payment.status': 'paid', createdAt: { $gte: from, $lte: to } }).select(
      'pricing.total'
    ),
    AmbulanceRequest.find({ 'payment.status': 'paid', createdAt: { $gte: from, $lte: to } }).select(
      'charges.total'
    ),
  ]);

  return (
    appts.reduce((s, a) => s + (a.payment?.amount || 0), 0) +
    orders.reduce((s, o) => s + (o.pricing?.total || 0), 0) +
    ambulances.reduce((s, r) => s + (r.charges?.total || 0), 0)
  );
}

export async function buildAppointmentsBySpecialization(): Promise<
  { specialization: string; count: number }[]
> {
  const start = new Date();
  start.setDate(start.getDate() - 30);

  const rows = await Appointment.aggregate([
    { $match: { createdAt: { $gte: start } } },
    {
      $lookup: {
        from: 'users',
        localField: 'doctorId',
        foreignField: '_id',
        as: 'doctor',
      },
    },
    { $unwind: '$doctor' },
    { $unwind: { path: '$doctor.doctorDetails.specializations', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: ['$doctor.doctorDetails.specializations', 'General'] },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 12 },
  ]);

  return rows.map((r: { _id: string; count: number }) => ({
    specialization: r._id || 'General',
    count: r.count,
  }));
}

function formatUserName(profile?: { firstName?: string; lastName?: string }): string {
  if (!profile) return 'User';
  return `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'User';
}

/** Last N platform actions merged from MongoDB collections. */
export async function buildRecentActivity(limit = 10): Promise<PlatformActivity[]> {
  const [users, appointments, orders, emergencies, prescriptions, topups] = await Promise.all([
    User.find({ userType: { $in: ['patient', 'doctor'] } })
      .select('userType profile createdAt')
      .sort({ createdAt: -1 })
      .limit(15)
      .lean(),
    Appointment.find()
      .populate('patientId', 'profile')
      .populate('doctorId', 'profile')
      .sort({ createdAt: -1 })
      .limit(15)
      .lean(),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(15)
      .select('orderId pricing.total delivery.currentStatus createdAt')
      .lean(),
    EmergencyRequest.find()
      .sort({ requestedAt: -1 })
      .limit(15)
      .select('requestId emergencyType status requestedAt')
      .lean(),
    Prescription.find()
      .populate('doctorId', 'profile')
      .populate('patientId', 'profile')
      .sort({ createdAt: -1 })
      .limit(15)
      .lean(),
    User.aggregate([
      { $unwind: '$wallet.transactions' },
      {
        $match: {
          'wallet.transactions.type': 'credit',
          'wallet.transactions.category': 'topup',
        },
      },
      { $sort: { 'wallet.transactions.timestamp': -1 } },
      { $limit: 15 },
      {
        $project: {
          profile: 1,
          userType: 1,
          amount: '$wallet.transactions.amount',
          timestamp: '$wallet.transactions.timestamp',
        },
      },
    ]),
  ]);

  const items: PlatformActivity[] = [];

  for (const u of users) {
    items.push({
      id: `user-${u._id}`,
      type: 'user_registered',
      title: `${formatUserName(u.profile)} joined`,
      subtitle: `${u.userType} registration`,
      timestamp: new Date(u.createdAt).toISOString(),
    });
  }

  for (const a of appointments) {
    const patient = a.patientId as { profile?: { firstName?: string; lastName?: string } } | null;
    const doctor = a.doctorId as { profile?: { firstName?: string; lastName?: string } } | null;
    const completed = a.status === 'completed';
    items.push({
      id: `appt-${a._id}`,
      type: completed ? 'appointment_completed' : 'appointment_booked',
      title: completed
        ? `Consultation completed — ${a.consultationType}`
        : `New ${a.consultationType} booking`,
      subtitle: `${formatUserName(patient?.profile ?? undefined)} → Dr. ${formatUserName(doctor?.profile ?? undefined)}`,
      timestamp: new Date(a.createdAt).toISOString(),
    });
  }

  for (const o of orders) {
    items.push({
      id: `order-${o._id}`,
      type: 'order_placed',
      title: `Pharmacy order ${o.orderId}`,
      subtitle: `${o.delivery?.currentStatus || 'pending'} · ${formatCurrency(o.pricing?.total ?? 0)}`,
      timestamp: new Date(o.createdAt).toISOString(),
    });
  }

  for (const e of emergencies) {
    items.push({
      id: `sos-${e._id}`,
      type: 'emergency_sos',
      title: `Emergency SOS — ${e.emergencyType}`,
      subtitle: `Status: ${e.status} · ${e.requestId}`,
      timestamp: new Date(e.requestedAt).toISOString(),
    });
  }

  for (const p of prescriptions) {
    const doctor = p.doctorId as { profile?: { firstName?: string; lastName?: string } } | null;
    const patient = p.patientId as { profile?: { firstName?: string; lastName?: string } } | null;
    items.push({
      id: `rx-${p._id}`,
      type: 'prescription_issued',
      title: `Prescription issued — ${p.diagnosis || 'Consultation'}`,
      subtitle: `Dr. ${formatUserName(doctor?.profile ?? undefined)} → ${formatUserName(patient?.profile ?? undefined)}`,
      timestamp: new Date(p.createdAt).toISOString(),
    });
  }

  for (const t of topups) {
    items.push({
      id: `topup-${t._id}-${new Date(t.timestamp).getTime()}`,
      type: 'wallet_topup',
      title: `Wallet top-up — ${formatCurrency(t.amount)}`,
      subtitle: `${formatUserName(t.profile)} (${t.userType})`,
      timestamp: new Date(t.timestamp).toISOString(),
    });
  }

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
