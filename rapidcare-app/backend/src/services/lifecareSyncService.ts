import { env } from '../config/env.js';
import type { IBooking } from '../models/Booking.js';
import { Driver } from '../models/Driver.js';

export async function syncBookingToLifecare(booking: IBooking): Promise<boolean> {
  if (booking.lifecareSynced) return true;

  const driver = booking.driverId ? await Driver.findById(booking.driverId) : null;
  const dispatchTime = booking.dispatchTime || booking.createdAt;
  const arrivalTime = booking.arrivalTime || booking.completedAt || new Date();
  const responseMinutes = Math.max(
    1,
    Math.round((arrivalTime.getTime() - dispatchTime.getTime()) / 60000)
  );

  const payload = {
    rapidcareBookingId: booking.bookingId,
    patientName: booking.patientName,
    patientPhone: booking.phone,
    lifecarePatientId: booking.lifecarePatientId,
    pickupLocation: booking.pickupLocation.address,
    hospital: booking.destinationLocation.name || booking.destinationLocation.address,
    vehicleType: booking.vehicleType,
    condition: booking.condition,
    dispatchTime: dispatchTime.toISOString(),
    arrivalTime: arrivalTime.toISOString(),
    responseTimeMinutes: responseMinutes,
    driverName: driver?.name || 'Unknown',
    vehicleNumber: driver?.vehicleNumber || 'N/A',
    fare: booking.fare,
    paymentStatus: booking.paymentStatus,
  };

  try {
    const res = await fetch(`${env.lifecareApiUrl}/api/ambulance/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidCare-Secret': env.lifecareWebhookSecret,
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
