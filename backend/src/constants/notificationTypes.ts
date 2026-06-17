export const NOTIFICATION_TYPES = {
  APPOINTMENT: 'appointment',
  PRESCRIPTION: 'prescription',
  AMBULANCE: 'ambulance',
  WALLET: 'wallet',
  ORDER: 'order',
  TRANSPORT: 'transport',
  SYSTEM: 'system',
  SCAN: 'scan',
  PROMOTIONAL: 'promotional',
  BLOOD_EMERGENCY: 'blood_emergency',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const SOCKET_EVENTS = {
  NOTIFICATION: 'notification',
  APPOINTMENT_BOOKED: 'appointment:booked',
  APPOINTMENT_REMINDER: 'appointment:reminder',
  APPOINTMENT_ACCEPTED: 'appointment:accepted',
  APPOINTMENT_REJECTED: 'appointment:rejected',
  PRESCRIPTION_READY: 'prescription:ready',
  AMBULANCE_DISPATCHED: 'ambulance:dispatched',
  WALLET_CREDITED: 'wallet:credited',
  SCAN_COMPLETE: 'scan:complete',
  SCAN_LOW_CONFIDENCE: 'scan:low_confidence',
  SCAN_REVIEWED: 'scan:reviewed',
  SCAN_URGENT: 'scan:urgent',
  SCAN_BOOK_SUGGESTED: 'scan:book_suggested',
  BLOOD_ALERT: 'blood:alert',
} as const;
