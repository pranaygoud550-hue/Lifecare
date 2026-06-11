import { Resend } from 'resend';
import { env } from '../config/env.js';
import type { IBooking } from '../models/Booking.js';

const resend = env.resendKey ? new Resend(env.resendKey) : null;

export async function sendBookingConfirmation(booking: IBooking): Promise<void> {
  const trackUrl = `${env.frontendUrl}/track/${booking.bookingId}`;
  const subject = `RapidCare Booking ${booking.bookingId} confirmed`;
  const html = `
    <h2>Your ambulance is on the way</h2>
    <p>Booking ID: <strong>${booking.bookingId}</strong></p>
    <p>Vehicle: ${booking.vehicleType}</p>
    <p>Estimated fare: ₹${booking.fare}</p>
    <p><a href="${trackUrl}">Track live</a></p>
  `;

  if (resend) {
    await resend.emails.send({
      from: env.resendFrom,
      to: booking.phone.includes('@') ? booking.phone : `${booking.phone}@sms.placeholder`,
      subject,
      html,
    }).catch(() => undefined);
  } else {
    console.log(`[RapidCare] Confirmation for ${booking.bookingId}: ${trackUrl}`);
  }
}
