import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/validate.js';
import {
  createDoctorCarePlan,
  getDoctorPatientSummary,
  listDoctorPatients,
  searchPatientsGlobalForDoctor,
} from '../services/doctorPatientService.js';
import { DoctorCarePlan } from '../models/DoctorCarePlan.js';
import { createNotification } from '../services/notificationService.js';

export const getMyPatients = asyncHandler(async (req: Request, res: Response) => {
  const search = String(req.query.search ?? '').trim();
  const doctorId = req.user!.userId;

  if (search) {
    const users = await searchPatientsGlobalForDoctor(doctorId, search);
    res.json({
      success: true,
      data: {
        patients: users.map((p) => ({
          _id: p._id,
          profile: p.profile,
          email: p.email,
          phone: p.phone,
          medicalHistory: p.medicalHistory,
          healthDataSharing: p.healthDataSharing,
        })),
        count: users.length,
      },
    });
    return;
  }

  const patients = await listDoctorPatients(doctorId, search);
  res.json({
    success: true,
    data: { patients, count: patients.length },
  });
});

export const getMyPatientDetail = asyncHandler(async (req: Request, res: Response) => {
  const summary = await getDoctorPatientSummary(req.user!.userId, String(req.params.patientId));
  if (!summary) {
    res.status(404).json({ success: false, message: 'Patient not found or not under your care' });
    return;
  }
  res.json({ success: true, data: summary });
});

export const publishCarePlan = asyncHandler(async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const {
    title,
    summary,
    dos,
    donts,
    dietInstructions,
    lifestyleNotes,
    bpSugarNotes,
    publishToPatient,
    appointmentId,
  } = req.body as {
    title?: string;
    summary?: string;
    dos?: string[];
    donts?: string[];
    dietInstructions?: string;
    lifestyleNotes?: string;
    bpSugarNotes?: string;
    publishToPatient?: boolean;
    appointmentId?: string;
  };

  const plan = await createDoctorCarePlan({
    doctorId: req.user!.userId,
    patientId,
    appointmentId,
    title: title?.trim() || 'Your care plan',
    summary,
    dos: dos ?? [],
    donts: donts ?? [],
    dietInstructions,
    lifestyleNotes,
    bpSugarNotes,
    publishToPatient: publishToPatient ?? true,
  });

  if (!plan) {
    res.status(404).json({ success: false, message: 'Cannot create plan for this patient' });
    return;
  }

  if (plan.publishedToPatient) {
    await createNotification({
      userId: patientId,
      type: 'general',
      title: 'New care plan from your doctor',
      message: `Dr. updated your diet & wellness guidance: ${plan.title}`,
      data: { carePlanId: plan._id, doctorId: req.user!.userId },
    });
  }

  res.status(201).json({ success: true, data: plan });
});

export const getPatientCarePlansForDoctor = asyncHandler(async (req: Request, res: Response) => {
  const plans = await DoctorCarePlan.find({
    doctorId: req.user!.userId,
    patientId: req.params.patientId,
  }).sort({ createdAt: -1 });

  res.json({ success: true, data: plans });
});
