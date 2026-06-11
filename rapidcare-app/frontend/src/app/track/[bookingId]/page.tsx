'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

type DriverInfo = { name: string; phone: string; vehicleNumber: string };
type Booking = {
  bookingId: string;
  status: string;
  patientName: string;
  pickupLocation: { address: string; coords: { lat: number; lng: number } };
  destinationLocation: { address: string; name?: string };
  driverId?: DriverInfo & { currentCoords?: { lat: number; lng: number } };
};

export default function TrackPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState(8);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getBooking(bookingId).then((r) => setBooking(r.data as unknown as Booking)).catch(() => setError('Booking not found'));
  }, [bookingId]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join:booking', bookingId);
    socket.on('driver:location', (p: { lat: number; lng: number; etaMinutes?: number }) => {
      setDriverLoc({ lat: p.lat, lng: p.lng });
      if (p.etaMinutes) setEta(p.etaMinutes);
    });
    socket.on('booking:accepted', (p: { driver: DriverInfo }) => {
      setBooking((b) => (b ? { ...b, driverId: p.driver as Booking['driverId'], status: 'accepted' } : b));
    });
    socket.on('booking:completed', () => {
      setBooking((b) => (b ? { ...b, status: 'completed' } : b));
    });
    return () => {
      socket.off('driver:location');
      socket.off('booking:accepted');
      socket.off('booking:completed');
    };
  }, [bookingId]);

  async function cancel() {
    if (eta <= 5) return;
    await api.cancelBooking(bookingId);
    setBooking((b) => (b ? { ...b, status: 'cancelled' } : b));
  }

  function shareLink() {
    navigator.clipboard.writeText(window.location.href);
    alert('Tracking link copied!');
  }

  const driver = booking?.driverId;
  const mapCenter = driverLoc || booking?.pickupLocation.coords;

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col">
      <div className="relative flex-1 bg-slate-900">
        {mapCenter ? (
          <iframe
            title="Live map"
            className="h-full min-h-[50vh] w-full border-0"
            src={`https://www.google.com/maps/embed/v1/view?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&center=${mapCenter.lat},${mapCenter.lng}&zoom=14`}
          />
        ) : (
          <div className="flex h-full min-h-[50vh] items-center justify-center text-slate-500">Loading map…</div>
        )}
      </div>

      <div className="border-t border-slate-800 bg-slate-950 p-4">
        {error && <p className="text-red-400">{error}</p>}
        {booking && (
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500">Tracking ID</p>
                <p className="font-mono text-lg font-bold text-white">{booking.bookingId}</p>
                <p className="mt-1 capitalize text-slate-400">Status: {booking.status}</p>
              </div>
              {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                <p className="rounded-full bg-red-600/20 px-4 py-2 text-sm font-semibold text-red-300">
                  Arrives in ~{eta} min
                </p>
              )}
            </div>

            {driver && (
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="font-semibold text-white">{driver.name}</p>
                <p className="text-sm text-slate-400">{driver.vehicleNumber}</p>
                <a href={`tel:${driver.phone}`} className="mt-2 inline-block text-red-400 hover:underline">
                  Call driver: {driver.phone}
                </a>
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <button type="button" onClick={shareLink} className="flex-1 rounded-lg border border-slate-700 py-2 text-sm">
                Share link
              </button>
              {eta > 5 && booking.status !== 'cancelled' && booking.status !== 'completed' && (
                <button type="button" onClick={cancel} className="flex-1 rounded-lg border border-red-800 py-2 text-sm text-red-400">
                  Cancel booking
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
