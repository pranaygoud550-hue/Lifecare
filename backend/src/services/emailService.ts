import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

const transporter =
  config.smtp.host && config.smtp.user
    ? nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: { user: config.smtp.user, pass: config.smtp.pass },
      })
    : null;

export async function sendAppointmentConfirmationEmail(params: {
  to: string;
  patientName: string;
  doctorName: string;
  appointmentId: string;
  scheduledDate: string;
  scheduledTime: string;
  consultationType: string;
  amount: number;
  paymentMethod: string;
}) {
  const subject = `LifeCare+ Appointment Confirmed — ${params.appointmentId}`;
  const html = `
    <h2>Your appointment is confirmed</h2>
    <p>Hi ${params.patientName},</p>
    <p>Thank you for booking with LifeCare+.</p>
    <ul>
      <li><strong>Appointment ID:</strong> ${params.appointmentId}</li>
      <li><strong>Doctor:</strong> ${params.doctorName}</li>
      <li><strong>Date:</strong> ${params.scheduledDate}</li>
      <li><strong>Time:</strong> ${params.scheduledTime}</li>
      <li><strong>Type:</strong> ${params.consultationType}</li>
      <li><strong>Fee:</strong> ₹${params.amount}</li>
      <li><strong>Payment:</strong> ${params.paymentMethod}</li>
    </ul>
    <p>View your appointments at <a href="${config.frontendUrl}/appointments">${config.frontendUrl}/appointments</a></p>
    <p>— LifeCare+ Team</p>
  `;

  if (!transporter) {
    console.log(`[LifeCare+ Email] ${subject}\nTo: ${params.to}\n${html.replace(/<[^>]+>/g, ' ')}`);
    return { sent: false, demo: true };
  }

  await transporter.sendMail({
    from: `"LifeCare+" <${config.smtp.user}>`,
    to: params.to,
    subject,
    html,
  });
  return { sent: true, demo: false };
}

export async function sendAccountUnlockEmail(params: {
  to: string;
  unlockUrl: string;
  firstName?: string;
}) {
  const subject = 'Unlock your LifeCare+ account';
  const html = `
    <h2>Account security notice</h2>
    <p>Hi ${params.firstName || 'there'},</p>
    <p>Your account was temporarily locked after multiple failed sign-in attempts.</p>
    <p><a href="${params.unlockUrl}">Click here to unlock your account</a></p>
    <p>This link expires in 24 hours. If you did not request this, contact support.</p>
    <p>— LifeCare+ Team</p>
  `;

  if (!transporter) {
    console.log(`[LifeCare+ Email] ${subject}\nUnlock URL: ${params.unlockUrl}`);
    return { sent: false, demo: true };
  }

  await transporter.sendMail({
    from: `"LifeCare+" <${config.smtp.user}>`,
    to: params.to,
    subject,
    html,
  });
  return { sent: true, demo: false };
}

export async function sendAppointmentReminderEmail24h(params: {
  to: string;
  patientName: string;
  doctorName: string;
  appointmentId: string;
  scheduledDate: string;
  scheduledTime: string;
  consultationType: string;
  preparationTips: string[];
  rescheduleUrl: string;
}) {
  const subject = `Reminder: Appointment tomorrow — ${params.appointmentId}`;
  const tipsHtml = params.preparationTips.map((t) => `<li>${t}</li>`).join('');
  const html = `
    <h2>Your appointment is tomorrow</h2>
    <p>Hi ${params.patientName},</p>
    <p>This is a friendly reminder about your upcoming LifeCare+ consultation.</p>
    <ul>
      <li><strong>Appointment ID:</strong> ${params.appointmentId}</li>
      <li><strong>Doctor:</strong> ${params.doctorName}</li>
      <li><strong>Date:</strong> ${params.scheduledDate}</li>
      <li><strong>Time:</strong> ${params.scheduledTime}</li>
      <li><strong>Type:</strong> ${params.consultationType}</li>
    </ul>
    <h3>Preparation</h3>
    <ul>${tipsHtml}</ul>
    <p>Need to change your slot? <a href="${params.rescheduleUrl}">Reschedule appointment</a></p>
    <p>— LifeCare+ Team</p>
  `;

  if (!transporter) {
    console.log(`[LifeCare+ Email] ${subject}\nTo: ${params.to}`);
    return { sent: false, demo: true };
  }

  await transporter.sendMail({
    from: `"LifeCare+" <${config.smtp.user}>`,
    to: params.to,
    subject,
    html,
  });
  return { sent: true, demo: false };
}

export async function sendDoctorVerificationSubmittedEmail(params: {
  to: string;
  firstName: string;
}) {
  const subject = 'LifeCare+ — Verification documents received';
  const html = `
    <h2>Thank you, Dr. ${params.firstName}</h2>
    <p>We received your medical license, degree certificate, and identity proof.</p>
    <p>Our admin team will review your application within 1–2 business days.</p>
    <p>— LifeCare+ Team</p>
  `;
  return sendGenericEmail(params.to, subject, html);
}

export async function sendDoctorApprovedEmail(params: { to: string; firstName: string }) {
  const subject = 'You are live on LifeCare+';
  const html = `
    <h2>Congratulations, Dr. ${params.firstName}!</h2>
    <p>Your doctor profile has been <strong>verified</strong> and is now live on LifeCare+.</p>
    <p><a href="${config.frontendUrl}/dashboard">Go to your dashboard</a></p>
    <p>— LifeCare+ Team</p>
  `;
  return sendGenericEmail(params.to, subject, html);
}

export async function sendDoctorRejectedEmail(params: {
  to: string;
  firstName: string;
  reason: string;
}) {
  const subject = 'LifeCare+ verification update';
  const resubmitUrl = `${config.frontendUrl}/doctor/verification`;
  const html = `
    <h2>Verification update</h2>
    <p>Hi Dr. ${params.firstName},</p>
    <p>We could not approve your verification at this time.</p>
    <p><strong>Reason:</strong> ${params.reason}</p>
    <p><a href="${resubmitUrl}">Resubmit documents</a></p>
    <p>— LifeCare+ Team</p>
  `;
  return sendGenericEmail(params.to, subject, html);
}

export async function sendRapidCareDoctorAlertEmail(params: {
  to: string;
  doctorName: string;
  patientName: string;
  condition: string;
  hospital: string;
}) {
  const subject = `🚨 Your patient ${params.patientName} has requested emergency transport`;
  const html = `
    <h2>🚨 Patient emergency transport</h2>
    <p>Hi ${params.doctorName},</p>
    <p>Your patient <strong>${params.patientName}</strong> has requested emergency transport via RapidCare.</p>
    <ul>
      <li><strong>Condition:</strong> ${params.condition}</li>
      <li><strong>Going to:</strong> ${params.hospital}</li>
    </ul>
    <p>— LifeCare+ · RapidCare integration</p>
  `;
  return sendGenericEmail(params.to, subject, html);
}

async function sendGenericEmail(to: string, subject: string, html: string) {
  if (!transporter) {
    console.log(`[LifeCare+ Email] ${subject}\nTo: ${to}`);
    return { sent: false, demo: true };
  }
  await transporter.sendMail({
    from: `"LifeCare+" <${config.smtp.user}>`,
    to,
    subject,
    html,
  });
  return { sent: true, demo: false };
}
