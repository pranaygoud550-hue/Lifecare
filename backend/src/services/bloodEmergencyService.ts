import { Types } from 'mongoose';
import {
  BloodEmergencyAlert,
  type IBloodEmergencyAlert,
  type BloodAlertUrgency,
  type BloodDonorResponseStatus,
} from '../models/BloodEmergencyAlert.js';
import { User, Hospital } from '../models/index.js';
import type { AppError } from '../middleware/errorHandler.js';
import { createNotification } from './notificationService.js';
import { NOTIFICATION_TYPES, SOCKET_EVENTS } from '../constants/notificationTypes.js';
import { isValidBloodGroup, mapsUrlForCoords } from '../constants/bloodGroups.js';
import { getHospitalAdminWithHospital, isHospitalLegalComplete } from './hospitalAdminService.js';
import { sendBloodAlertSms } from './smsService.js';

const NOTIFY_BATCH = 50;
const NOTIFY_CAP = 500;
const COOLDOWN_MS = 30 * 60 * 1000;
const ALERT_TTL_HOURS = 8;

function clientError(message: string): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = 400;
  return err;
}

export async function findEligibleDonors(bloodGroup: string) {
  return User.find({
    userType: 'patient',
    isActive: true,
    isBlocked: false,
    'medicalHistory.bloodGroup': bloodGroup,
    $or: [
      { 'profile.address.city': /hyderabad/i },
      { 'profile.address.state': /telangana/i },
    ],
  })
    .select('_id profile phone medicalHistory.bloodGroup')
    .limit(NOTIFY_CAP)
    .lean();
}

async function assertCanCreateAlert(hospitalId: Types.ObjectId, bloodGroup: string) {
  const active = await BloodEmergencyAlert.findOne({
    hospitalId,
    bloodGroup,
    status: 'active',
  });
  if (active) {
    throw clientError(`An active ${bloodGroup} alert already exists for this hospital`);
  }

  const recent = await BloodEmergencyAlert.findOne({
    hospitalId,
    createdAt: { $gte: new Date(Date.now() - COOLDOWN_MS) },
  }).sort({ createdAt: -1 });

  if (recent) {
    throw clientError('Please wait 30 minutes before sending another blood alert from this hospital');
  }
}

function buildAlertMessage(alert: IBloodEmergencyAlert): { title: string; message: string } {
  const urgencyPrefix =
    alert.urgency === 'critical' ? 'CRITICAL: ' : alert.urgency === 'urgent' ? 'URGENT: ' : '';
  const units = alert.unitsNeeded ? ` (${alert.unitsNeeded} unit(s) needed)` : '';
  return {
    title: `${urgencyPrefix}${alert.bloodGroup} blood needed`,
    message: `${alert.hospitalName} needs ${alert.bloodGroup} blood${units}. ${alert.notes || 'Please come to the hospital blood bank if you can donate.'}`,
  };
}

export async function notifyMatchingDonors(alert: IBloodEmergencyAlert): Promise<number> {
  const donors = await findEligibleDonors(alert.bloodGroup);
  const { title, message } = buildAlertMessage(alert);
  const mapsUrl = mapsUrlForCoords(
    alert.coordinates.lat,
    alert.coordinates.lng,
    alert.hospitalName
  );

  let notified = 0;
  for (let i = 0; i < donors.length; i += NOTIFY_BATCH) {
    const batch = donors.slice(i, i + NOTIFY_BATCH);
    await Promise.all(
      batch.map(async (donor) => {
        await createNotification({
          userId: donor._id,
          type: NOTIFICATION_TYPES.BLOOD_EMERGENCY,
          title,
          message,
          data: {
            alertId: alert._id.toString(),
            hospitalId: alert.hospitalId.toString(),
            hospitalName: alert.hospitalName,
            address: alert.address,
            bloodGroup: alert.bloodGroup,
            urgency: alert.urgency,
            mapsUrl,
            coordinates: alert.coordinates,
          },
          socketEvent: SOCKET_EVENTS.BLOOD_ALERT,
        });

        if (alert.urgency === 'critical' && process.env.BLOOD_ALERT_SMS === 'true' && donor.phone) {
          await sendBloodAlertSms({
            to: donor.phone,
            bloodGroup: alert.bloodGroup,
            hospitalName: alert.hospitalName,
          });
        }
        notified += 1;
      })
    );
  }

  if (donors.length >= NOTIFY_CAP) {
    console.warn(`[BloodAlert] Notification cap (${NOTIFY_CAP}) reached for alert ${alert._id}`);
  }

  return notified;
}

export async function createBloodAlert(
  hospitalAdminId: string,
  payload: {
    bloodGroup: string;
    unitsNeeded?: number;
    urgency?: BloodAlertUrgency;
    notes?: string;
  }
) {
  if (!isValidBloodGroup(payload.bloodGroup)) {
    throw clientError('Invalid blood group');
  }

  const admin = await getHospitalAdminWithHospital(hospitalAdminId);
  if (!isHospitalLegalComplete(admin.hospitalAdminDetails)) {
    throw clientError(
      'Complete legal acknowledgment and blood bank license verification before sending alerts'
    );
  }
  const hospitalRef = admin.hospitalAdminDetails!.hospitalId as unknown as {
    _id: Types.ObjectId;
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
  };

  await assertCanCreateAlert(hospitalRef._id, payload.bloodGroup);

  const expiresAt = new Date(Date.now() + ALERT_TTL_HOURS * 60 * 60 * 1000);

  const alert = await BloodEmergencyAlert.create({
    hospitalId: hospitalRef._id,
    hospitalName: hospitalRef.name,
    address: hospitalRef.address,
    coordinates: hospitalRef.coordinates,
    bloodGroup: payload.bloodGroup,
    unitsNeeded: payload.unitsNeeded,
    urgency: payload.urgency || 'urgent',
    notes: payload.notes?.trim(),
    createdBy: new Types.ObjectId(hospitalAdminId),
    status: 'active',
    notifiedCount: 0,
    responses: [],
    expiresAt,
  });

  const notifiedCount = await notifyMatchingDonors(alert);
  alert.notifiedCount = notifiedCount;
  await alert.save();

  return alert;
}

export async function getHospitalBloodAlerts(hospitalAdminId: string) {
  const admin = await getHospitalAdminWithHospital(hospitalAdminId);
  const hospitalId = (admin.hospitalAdminDetails!.hospitalId as { _id: Types.ObjectId })._id;

  return BloodEmergencyAlert.find({ hospitalId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
}

export async function getBloodAlertDetailForHospital(hospitalAdminId: string, alertId: string) {
  const admin = await getHospitalAdminWithHospital(hospitalAdminId);
  const hospitalId = (admin.hospitalAdminDetails!.hospitalId as { _id: Types.ObjectId })._id;

  const alert = await BloodEmergencyAlert.findOne({ _id: alertId, hospitalId })
    .populate('responses.userId', 'profile phone medicalHistory.bloodGroup')
    .lean();

  if (!alert) throw new Error('Blood alert not found');
  return alert;
}

export async function updateBloodAlertStatus(
  hospitalAdminId: string,
  alertId: string,
  status: 'fulfilled' | 'cancelled'
) {
  const admin = await getHospitalAdminWithHospital(hospitalAdminId);
  const hospitalId = (admin.hospitalAdminDetails!.hospitalId as { _id: Types.ObjectId })._id;

  const alert = await BloodEmergencyAlert.findOneAndUpdate(
    { _id: alertId, hospitalId, status: 'active' },
    { status },
    { new: true }
  );

  if (!alert) throw new Error('Active blood alert not found');
  return alert;
}

export async function getActiveBloodAlertsForPatients() {
  const now = new Date();
  await BloodEmergencyAlert.updateMany(
    { status: 'active', expiresAt: { $lt: now } },
    { status: 'expired' }
  );

  return BloodEmergencyAlert.find({ status: 'active', expiresAt: { $gte: now } })
    .sort({ urgency: 1, createdAt: -1 })
    .lean();
}

export async function respondToBloodAlert(
  patientId: string,
  alertId: string,
  status: BloodDonorResponseStatus
) {
  const patient = await User.findById(patientId).select('userType medicalHistory.bloodGroup');
  if (!patient || patient.userType !== 'patient') {
    throw new Error('Only patients can respond to blood alerts');
  }

  const alert = await BloodEmergencyAlert.findOne({ _id: alertId, status: 'active' });
  if (!alert) throw new Error('Blood alert is no longer active');

  if (patient.medicalHistory?.bloodGroup !== alert.bloodGroup) {
    throw new Error('This alert is for a different blood group');
  }

  const existingIdx = alert.responses.findIndex((r) => r.userId.toString() === patientId);
  if (existingIdx >= 0) {
    alert.responses[existingIdx]!.status = status;
    alert.responses[existingIdx]!.respondedAt = new Date();
  } else {
    alert.responses.push({
      userId: new Types.ObjectId(patientId),
      status,
      respondedAt: new Date(),
    });
  }
  await alert.save();

  const onMyWay = alert.responses.filter((r) => r.status === 'on_my_way').length;
  await createNotification({
    userId: alert.createdBy,
    type: NOTIFICATION_TYPES.BLOOD_EMERGENCY,
    title: 'Donor response update',
    message: `A donor responded to your ${alert.bloodGroup} alert. ${onMyWay} donor(s) on the way.`,
    data: { alertId: alert._id.toString(), onMyWay },
    socketEvent: SOCKET_EVENTS.BLOOD_ALERT,
  });

  return alert;
}

export async function listAllBloodAlertsAdmin() {
  return BloodEmergencyAlert.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('hospitalId', 'name city')
    .lean();
}
