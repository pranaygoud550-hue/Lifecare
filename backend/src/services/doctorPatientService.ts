import { Types } from 'mongoose';
import { Appointment, User, DoctorCarePlan } from '../models/index.js';
import type { IUser } from '../models/User.js';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listDoctorPatients(doctorId: string, search?: string) {
  const appointments = await Appointment.find({
    doctorId: new Types.ObjectId(doctorId),
    status: { $nin: ['cancelled'] },
  })
    .sort({ scheduledDate: -1 })
    .limit(200)
    .populate('patientId', 'profile email phone medicalHistory healthDataSharing');

  const byPatient = new Map<string, { patient: IUser; lastVisit: Date; appointmentCount: number }>();

  for (const apt of appointments) {
    const patient = apt.patientId as unknown as IUser | null;
    if (!patient || typeof patient !== 'object' || !('_id' in patient)) continue;
    const id = String(patient._id);
    const existing = byPatient.get(id);
    if (!existing) {
      byPatient.set(id, {
        patient,
        lastVisit: apt.scheduledDate,
        appointmentCount: 1,
      });
    } else {
      existing.appointmentCount += 1;
      if (apt.scheduledDate > existing.lastVisit) existing.lastVisit = apt.scheduledDate;
    }
  }

  let rows = [...byPatient.values()];

  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter(({ patient }) => {
      const name = `${patient.profile?.firstName ?? ''} ${patient.profile?.lastName ?? ''}`.toLowerCase();
      return name.includes(q) || patient.phone?.includes(q) || patient.email?.toLowerCase().includes(q);
    });
  }

  return rows
    .sort((a, b) => b.lastVisit.getTime() - a.lastVisit.getTime())
    .map(({ patient, lastVisit, appointmentCount }) => ({
      _id: patient._id,
      profile: patient.profile,
      email: patient.email,
      phone: patient.phone,
      medicalHistory: patient.medicalHistory,
      healthDataSharing: patient.healthDataSharing,
      lastVisit,
      appointmentCount,
    }));
}

export async function getDoctorPatientSummary(doctorId: string, patientId: string) {
  const hasRelation = await Appointment.exists({
    doctorId: new Types.ObjectId(doctorId),
    patientId: new Types.ObjectId(patientId),
    status: { $nin: ['cancelled'] },
  });

  if (!hasRelation) return null;

  const patient = await User.findById(patientId).select(
    'profile email phone medicalHistory healthDataSharing userType'
  );
  if (!patient) return null;

  const carePlans = await DoctorCarePlan.find({
    doctorId: new Types.ObjectId(doctorId),
    patientId: new Types.ObjectId(patientId),
  })
    .sort({ createdAt: -1 })
    .limit(20);

  const upcoming = await Appointment.findOne({
    doctorId: new Types.ObjectId(doctorId),
    patientId: new Types.ObjectId(patientId),
    status: { $in: ['confirmed', 'in-progress', 'pending'] },
    scheduledDate: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  }).sort({ scheduledDate: 1 });

  return { patient, carePlans, upcomingAppointment: upcoming };
}

export async function createDoctorCarePlan(input: {
  doctorId: string;
  patientId: string;
  appointmentId?: string;
  title: string;
  summary?: string;
  dos: string[];
  donts: string[];
  dietInstructions?: string;
  lifestyleNotes?: string;
  bpSugarNotes?: string;
  publishToPatient?: boolean;
}) {
  const hasRelation = await Appointment.exists({
    doctorId: new Types.ObjectId(input.doctorId),
    patientId: new Types.ObjectId(input.patientId),
    status: { $nin: ['cancelled'] },
  });
  if (!hasRelation) return null;

  return DoctorCarePlan.create({
    doctorId: input.doctorId,
    patientId: input.patientId,
    appointmentId: input.appointmentId,
    title: input.title,
    summary: input.summary ?? '',
    dos: input.dos,
    donts: input.donts,
    dietInstructions: input.dietInstructions ?? '',
    lifestyleNotes: input.lifestyleNotes,
    bpSugarNotes: input.bpSugarNotes,
    publishedToPatient: Boolean(input.publishToPatient),
    patientAcknowledgedAt: undefined,
  });
}

export async function searchPatientsGlobalForDoctor(doctorId: string, q: string) {
  const regex = new RegExp(escapeRegex(q.trim()), 'i');
  const related = await Appointment.distinct('patientId', {
    doctorId: new Types.ObjectId(doctorId),
    status: { $nin: ['cancelled'] },
  });
  if (related.length === 0) return [];

  return User.find({
    _id: { $in: related },
    userType: 'patient',
    $or: [
      { 'profile.firstName': regex },
      { 'profile.lastName': regex },
      { email: regex },
      { phone: regex },
    ],
  })
    .select('profile email phone medicalHistory healthDataSharing')
    .limit(30);
}
