'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export default function DriverPage() {
  const [token, setToken] = useState('');
  const [phone, setPhone] = useState('9000000001');
  const [password, setPassword] = useState('driver123');
  const [pending, setPending] = useState<Record<string, unknown>[]>([]);
  const [mine, setMine] = useState<Record<string, unknown>[]>([]);
  const [earnings, setEarnings] = useState<{ earnings: number; totalTrips: number } | null>(null);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('rc_driver_token');
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    loadRequests();
    const socket = getSocket();
    socket.emit('join:drivers');
    socket.on('booking:created', () => loadRequests());
    const loc = navigator.geolocation;
    const watch = loc?.watchPosition(
      (p) => api.postLocation(token, p.coords.latitude, p.coords.longitude).catch(() => undefined),
      undefined,
      { enableHighAccuracy: true }
    );
    return () => {
      socket.off('booking:created');
      if (watch !== undefined) loc.clearWatch(watch);
    };
  }, [token]);

  async function loadRequests() {
    const r = await api.driverRequests(token);
    setPending(r.data.pending as Record<string, unknown>[]);
    setMine(r.data.mine as Record<string, unknown>[]);
    const e = await api.driverEarnings(token);
    setEarnings(e.data);
  }

  async function login() {
    const r = await api.driverLogin(phone, password);
    localStorage.setItem('rc_driver_token', r.data.token);
    setToken(r.data.token);
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold text-white">Driver Login</h1>
        <div className="mt-6 space-y-4">
          <input className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
          <input className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          <button type="button" onClick={login} className="w-full rounded-lg bg-red-600 py-3 font-semibold">
            Sign in
          </button>
          <p className="text-xs text-slate-500">Demo: 9000000001 / driver123</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Driver Console</h1>
        {earnings && (
          <div className="text-right text-sm">
            <p className="text-slate-400">{earnings.totalTrips} trips</p>
            <p className="font-bold text-green-400">₹{earnings.earnings}</p>
          </div>
        )}
      </div>

      <h2 className="mt-8 font-semibold text-white">Incoming requests</h2>
      <div className="mt-3 space-y-3">
        {pending.length === 0 && <p className="text-slate-500">No pending requests</p>}
        {pending.map((b) => (
          <div key={String(b.bookingId)} className="rounded-xl border border-slate-800 p-4">
            <p className="font-mono text-sm text-red-400">{String(b.bookingId)}</p>
            <p className="text-white">{String((b as { patientName?: string }).patientName)}</p>
            <p className="text-sm text-slate-400">{(b as { pickupLocation?: { address: string } }).pickupLocation?.address}</p>
            <button
              type="button"
              onClick={() => api.acceptBooking(token, String(b.bookingId)).then(loadRequests)}
              className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold"
            >
              Accept
            </button>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-semibold text-white">Active trips</h2>
      <div className="mt-3 space-y-3">
        {mine.filter((b) => (b as { status: string }).status !== 'completed').map((b) => {
          const id = String(b.bookingId);
          const status = String((b as { status: string }).status);
          return (
            <div key={id} className="rounded-xl border border-slate-800 p-4">
              <p className="font-mono text-sm">{id}</p>
              <p className="capitalize text-slate-400">{status}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {status === 'accepted' && (
                  <button type="button" onClick={() => api.updateStatus(token, id, 'en-route').then(loadRequests)} className="rounded bg-blue-600 px-3 py-1 text-sm">
                    En route
                  </button>
                )}
                {status === 'en-route' && (
                  <button type="button" onClick={() => api.updateStatus(token, id, 'arrived').then(loadRequests)} className="rounded bg-amber-600 px-3 py-1 text-sm">
                    Arrived
                  </button>
                )}
                {status === 'arrived' && (
                  <div className="flex gap-2">
                    <input className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="OTP" />
                    <button
                      type="button"
                      onClick={() => api.verifyOtp(token, id, otp).then(loadRequests)}
                      className="rounded bg-green-600 px-3 py-1 text-sm"
                    >
                      Verify OTP
                    </button>
                  </div>
                )}
                {status === 'in-transit' && (
                  <button type="button" onClick={() => api.updateStatus(token, id, 'completed').then(loadRequests)} className="rounded bg-red-600 px-3 py-1 text-sm">
                    Complete trip
                  </button>
                )}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${(b as { pickupLocation: { coords: { lat: number; lng: number } } }).pickupLocation.coords.lat},${(b as { pickupLocation: { coords: { lat: number; lng: number } } }).pickupLocation.coords.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-slate-600 px-3 py-1 text-sm"
                >
                  Navigate
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
