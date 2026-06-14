import { Appointment, User } from '../models/index.js';
import { isDbReady } from '../config/dbStatus.js';
import { normalizePhone } from '../utils/phone.js';

const DEMO_PATIENT_PHONE = '9876543210';
const DEMO_DOCTOR_PHONE = '9876543211';
export const DEMO_LIVE_APPOINTMENT_ID = 'DEMO-LIVE-VIDEO';

/** Ensures patient wallet can pay for a consult during live demos. */
export async function ensureDemoPatientWallet() {
  if (!isDbReady()) return;
  const patient = await User.findOne({ phone: normalizePhone(DEMO_PATIENT_PHONE) });
  if (!patient || patient.userType !== 'patient') return;

  const balance = patient.wallet?.balance ?? 0;
  if (balance >= 500) return;

  patient.wallet = {
    balance: 2500,
    transactions: patient.wallet?.transactions?.length
      ? patient.wallet.transactions
      : [
          {
            type: 'credit',
            amount: 2500,
            description: 'Demo wallet top-up',
            timestamp: new Date(),
          },
        ],
  };
  await patient.save();
}

/** Ready-to-join video consult for interview walkthroughs (patient + doctor demo). */
export async function ensureInterviewDemoAppointment() {
  if (!isDbReady()) return;

  const patient = await User.findOne({ phone: normalizePhone(DEMO_PATIENT_PHONE) });
  const doctor = await User.findOne({ phone: normalizePhone(DEMO_DOCTOR_PHONE) });
  if (!patient || !doctor) return;

  await ensureDemoPatientWallet();

  const now = new Date();
  const scheduledTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  await Appointment.findOneAndUpdate(
    { appointmentId: DEMO_LIVE_APPOINTMENT_ID },
    {
      $set: {
        patientId: patient._id,
        doctorId: doctor._id,
        consultationType: 'video',
        scheduledDate: now,
        scheduledTime,
        duration: 30,
        status: 'in-progress',
        chiefComplaint: 'Interview demo — live video consultation',
        payment: {
          amount: 800,
          status: 'paid',
          method: 'wallet',
          timestamp: new Date(),
        },
        doctorResponse: 'accepted',
        doctorResponseAt: new Date(),
        videoCallDetails: {
          roomId: 'demo-live-checkup-room',
          startTime: new Date(),
        },
      },
    },
    { upsert: true, new: true }
  );
}
