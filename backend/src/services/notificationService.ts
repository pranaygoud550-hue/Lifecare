import { Types } from 'mongoose';
import { Notification } from '../models/Notification.js';
import { emitToUser } from './socketService.js';
import { NOTIFICATION_TYPES, SOCKET_EVENTS, type NotificationType } from '../constants/notificationTypes.js';

interface CreateNotificationParams {
  userId: string | Types.ObjectId;
  type: NotificationType | string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  socketEvent?: string;
}

const typeToSocketEvent: Record<string, string> = {
  [NOTIFICATION_TYPES.APPOINTMENT]: SOCKET_EVENTS.NOTIFICATION,
  appointment_booked: SOCKET_EVENTS.APPOINTMENT_BOOKED,
  appointment_reminder: SOCKET_EVENTS.APPOINTMENT_REMINDER,
  appointment_accepted: SOCKET_EVENTS.APPOINTMENT_ACCEPTED,
  appointment_rejected: SOCKET_EVENTS.APPOINTMENT_REJECTED,
  [NOTIFICATION_TYPES.PRESCRIPTION]: SOCKET_EVENTS.PRESCRIPTION_READY,
  [NOTIFICATION_TYPES.AMBULANCE]: SOCKET_EVENTS.AMBULANCE_DISPATCHED,
  [NOTIFICATION_TYPES.WALLET]: SOCKET_EVENTS.WALLET_CREDITED,
  [NOTIFICATION_TYPES.SCAN]: SOCKET_EVENTS.SCAN_COMPLETE,
  scan_complete: SOCKET_EVENTS.SCAN_COMPLETE,
  scan_urgent: SOCKET_EVENTS.SCAN_URGENT,
  scan_book_suggested: SOCKET_EVENTS.SCAN_BOOK_SUGGESTED,
  [NOTIFICATION_TYPES.BLOOD_EMERGENCY]: SOCKET_EVENTS.BLOOD_ALERT,
};

export const createNotification = async (params: CreateNotificationParams) => {
  const notification = await Notification.create({
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    data: params.data,
    isRead: false,
    sentAt: new Date(),
  });

  const payload = {
    _id: notification._id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    sentAt: notification.sentAt,
    isRead: false,
  };

  const userId = params.userId.toString();
  const socketEvent = params.socketEvent || typeToSocketEvent[params.type] || SOCKET_EVENTS.NOTIFICATION;

  emitToUser(userId, SOCKET_EVENTS.NOTIFICATION, payload);
  if (socketEvent !== SOCKET_EVENTS.NOTIFICATION) {
    emitToUser(userId, socketEvent, payload);
  }

  return notification;
};

export const notifyAppointmentBooked = async (
  patientId: string,
  doctorId: string,
  appointment: { _id: Types.ObjectId; appointmentId: string; scheduledDate: Date; scheduledTime: string; consultationType: string }
) => {
  const dateStr = new Date(appointment.scheduledDate).toLocaleDateString('en-IN');
  await Promise.all([
    createNotification({
      userId: patientId,
      type: 'appointment_booked',
      title: 'Appointment Booked',
      message: `Your ${appointment.consultationType} consultation is scheduled for ${dateStr} at ${appointment.scheduledTime}.`,
      data: { appointmentId: appointment._id, appointmentCode: appointment.appointmentId },
      socketEvent: SOCKET_EVENTS.APPOINTMENT_BOOKED,
    }),
    createNotification({
      userId: doctorId,
      type: NOTIFICATION_TYPES.APPOINTMENT,
      title: 'New Appointment Request',
      message: `New ${appointment.consultationType} consultation on ${dateStr} at ${appointment.scheduledTime}`,
      data: { appointmentId: appointment._id },
    }),
  ]);
};

export const notifyAppointmentReminder30m = async (
  userId: string,
  params: { appointmentId: string; doctorName: string; scheduledTime: string; consultationType: string }
) => {
  return createNotification({
    userId,
    type: 'appointment_reminder',
    title: 'Appointment in 30 minutes',
    message: `${params.doctorName} at ${params.scheduledTime}. ${params.consultationType === 'video' ? 'Prepare to join your video call.' : 'Please arrive on time.'}`,
    data: { appointmentId: params.appointmentId },
    socketEvent: SOCKET_EVENTS.APPOINTMENT_REMINDER,
  });
};

export const notifyAppointmentAccepted = async (patientId: string, appointmentId: string, doctorName: string) => {
  return createNotification({
    userId: patientId,
    type: 'appointment_accepted',
    title: 'Appointment Accepted',
    message: `${doctorName} has accepted your appointment request.`,
    data: { appointmentId },
    socketEvent: SOCKET_EVENTS.APPOINTMENT_ACCEPTED,
  });
};

export const notifyAppointmentRejected = async (
  patientId: string,
  appointmentId: string,
  doctorName: string,
  reason?: string
) => {
  return createNotification({
    userId: patientId,
    type: 'appointment_rejected',
    title: 'Appointment Declined',
    message: reason
      ? `${doctorName} declined your appointment: ${reason}`
      : `${doctorName} is unavailable for this slot. Please book another time.`,
    data: { appointmentId, reason },
    socketEvent: SOCKET_EVENTS.APPOINTMENT_REJECTED,
  });
};

export const notifyPrescriptionReady = async (patientId: string, prescriptionId: string, appointmentId: string) => {
  return createNotification({
    userId: patientId,
    type: NOTIFICATION_TYPES.PRESCRIPTION,
    title: 'Prescription Ready',
    message: 'Your doctor has issued a new prescription. View it in your health vault.',
    data: { prescriptionId, appointmentId },
    socketEvent: SOCKET_EVENTS.PRESCRIPTION_READY,
  });
};

export const notifyAmbulanceDispatched = async (patientId: string, requestId: string) => {
  return createNotification({
    userId: patientId,
    type: NOTIFICATION_TYPES.AMBULANCE,
    title: 'Ambulance Dispatched',
    message: 'An ambulance has been dispatched to your location. Track status in Emergency.',
    data: { requestId },
    socketEvent: SOCKET_EVENTS.AMBULANCE_DISPATCHED,
  });
};

export const notifyScanAnalysisComplete = async (
  patientId: string,
  params: { scanId: string; scanTypeLabel: string }
) => {
  return createNotification({
    userId: patientId,
    type: NOTIFICATION_TYPES.SCAN,
    title: 'MediScan result ready',
    message: `Your ${params.scanTypeLabel} result is ready. Tap to view.`,
    data: { scanId: params.scanId, action: 'view_scan' },
    socketEvent: SOCKET_EVENTS.SCAN_COMPLETE,
  });
};

export const notifyScanLowConfidenceDoctor = async (
  doctorId: string,
  params: { scanId: string; patientName: string }
) => {
  return createNotification({
    userId: doctorId,
    type: NOTIFICATION_TYPES.SCAN,
    title: 'MediScan review needed',
    message: `Low confidence AI result needs your review — ${params.patientName}`,
    data: { scanId: params.scanId, action: 'review_scan' },
    socketEvent: SOCKET_EVENTS.SCAN_LOW_CONFIDENCE,
  });
};

export const notifyScanReviewedByDoctor = async (
  patientId: string,
  params: { scanId: string; doctorName: string }
) => {
  return createNotification({
    userId: patientId,
    type: NOTIFICATION_TYPES.SCAN,
    title: 'Doctor reviewed your scan',
    message: `Dr. ${params.doctorName} has reviewed your scan and added notes.`,
    data: { scanId: params.scanId, action: 'view_scan' },
    socketEvent: SOCKET_EVENTS.SCAN_REVIEWED,
  });
};

export const notifyScanUrgentWithBooking = async (
  patientId: string,
  params: { scanId: string; condition: string; scanType: string }
) => {
  return createNotification({
    userId: patientId,
    type: 'scan_urgent',
    title: 'Important scan finding',
    message: `Your scan shows signs of ${params.condition}. We recommend seeing a doctor soon. Book now?`,
    data: {
      scanId: params.scanId,
      scanType: params.scanType,
      action: 'book_from_scan',
      suggestBooking: true,
    },
    socketEvent: SOCKET_EVENTS.SCAN_URGENT,
  });
};

export const notifyWalletCredited = async (userId: string, amount: number, balance: number) => {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.WALLET,
    title: 'Wallet Credited',
    message: `₹${amount} added to your wallet. New balance: ₹${balance}.`,
    data: { amount, balance },
    socketEvent: SOCKET_EVENTS.WALLET_CREDITED,
  });
};
