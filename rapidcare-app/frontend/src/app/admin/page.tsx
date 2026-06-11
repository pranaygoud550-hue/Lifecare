'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Dashboard = {
  totalBookings: number;
  todayBookings: number;
  monthlyRevenue: number;
  avgResponseMinutes: number;
  drivers: { name: string; phone: string; vehicleNumber: string; isAvailable: boolean }[];
  heatmap: { lat: number; lng: number }[];
};

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('admin@rapidcare.app');
  const [password, setPassword] = useState('admin123');
  const [data, setData] = useState<Dashboard | null>(null);
  const [live, setLive] = useState<unknown[]>([]);

  useEffect(() => {
    const t = localStorage.getItem('rc_admin_token');
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    api.adminDashboard(token).then((r) => setData(r.data as Dashboard));
    api.liveBookings().then((r) => setLive(r.data));
    const i = setInterval(() => api.liveBookings().then((r) => setLive(r.data)), 15000);
    return () => clearInterval(i);
  }, [token]);

  async function login() {
    const r = await api.adminLogin(email, password);
    localStorage.setItem('rc_admin_token', r.data.token);
    setToken(r.data.token);
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold">Admin Login</h1>
        <div className="mt-6 space-y-4">
          <input className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" onClick={login} className="w-full rounded-lg bg-red-600 py-3 font-semibold">
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-white">Dispatch Control</h1>
      {data && (
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <Card label="Total bookings" value={data.totalBookings} />
          <Card label="Today" value={data.todayBookings} />
          <Card label="Monthly revenue" value={`₹${data.monthlyRevenue}`} />
          <Card label="Avg response" value={`${data.avgResponseMinutes} min`} />
        </div>
      )}

      <h2 className="mt-10 text-xl font-semibold">Live bookings ({live.length})</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Patient</th>
              <th className="p-3">Status</th>
              <th className="p-3">Vehicle</th>
            </tr>
          </thead>
          <tbody>
            {live.map((b) => (
              <tr key={String((b as { bookingId: string }).bookingId)} className="border-t border-slate-800">
                <td className="p-3 font-mono">{(b as { bookingId: string }).bookingId}</td>
                <td className="p-3">{(b as { patientName: string }).patientName}</td>
                <td className="p-3 capitalize">{(b as { status: string }).status}</td>
                <td className="p-3">{(b as { vehicleType: string }).vehicleType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-xl font-semibold">Fleet</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {data?.drivers.map((d) => (
          <div key={d.phone} className="rounded-xl border border-slate-800 p-4">
            <p className="font-semibold">{d.name}</p>
            <p className="text-sm text-slate-400">{d.vehicleNumber}</p>
            <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${d.isAvailable ? 'bg-green-900 text-green-300' : 'bg-amber-900 text-amber-300'}`}>
              {d.isAvailable ? 'Available' : 'On trip'}
            </span>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-semibold">Pickup heatmap</h2>
      <div className="mt-4 flex flex-wrap gap-1">
        {data?.heatmap.slice(0, 80).map((p, i) => (
          <span key={i} className="h-2 w-2 rounded-full bg-red-500/60" style={{ opacity: 0.3 + (i % 7) * 0.1 }} title={`${p.lat},${p.lng}`} />
        ))}
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
