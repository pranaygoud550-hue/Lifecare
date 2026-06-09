import { Request, Response } from 'express';
import { Prescription, Appointment } from '../models/index.js';
import { asyncHandler } from '../middleware/validate.js';
import { notifyPrescriptionReady } from '../services/notificationService.js';

export const createPrescription = asyncHandler(async (req: Request, res: Response) => {
  const { appointmentId, diagnosis, medications, labTests, advice, followUpDate } = req.body;

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    res.status(404).json({ success: false, message: 'Appointment not found' });
    return;
  }

  if (appointment.doctorId.toString() !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Only the assigned doctor can create prescriptions' });
    return;
  }

  const prescription = await Prescription.create({
    appointmentId,
    patientId: appointment.patientId,
    doctorId: req.user!.userId,
    diagnosis,
    medications,
    labTests,
    advice,
    followUpDate: followUpDate ? new Date(followUpDate) : undefined,
  });

  appointment.prescription = prescription._id;
  await appointment.save();

  await notifyPrescriptionReady(
    appointment.patientId.toString(),
    prescription._id.toString(),
    appointmentId
  );

  const populated = await Prescription.findById(prescription._id)
    .populate('doctorId', 'profile doctorDetails')
    .populate('patientId', 'profile');

  res.status(201).json({ success: true, data: populated });
});

export const getPrescriptions = asyncHandler(async (req: Request, res: Response) => {
  const filter =
    req.user!.userType === 'doctor'
      ? { doctorId: req.user!.userId }
      : { patientId: req.user!.userId };

  const prescriptions = await Prescription.find(filter)
    .populate('doctorId', 'profile doctorDetails')
    .populate('patientId', 'profile')
    .populate('appointmentId', 'appointmentId scheduledDate consultationType')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: prescriptions });
});

export const getPrescriptionById = asyncHandler(async (req: Request, res: Response) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate('doctorId', 'profile doctorDetails')
    .populate('patientId', 'profile medicalHistory')
    .populate('appointmentId');

  if (!prescription) {
    res.status(404).json({ success: false, message: 'Prescription not found' });
    return;
  }

  const isAuthorized =
    prescription.patientId._id.toString() === req.user!.userId ||
    prescription.doctorId._id.toString() === req.user!.userId ||
    req.user!.userType === 'admin';

  if (!isAuthorized) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  res.json({ success: true, data: prescription });
});

export const getAppointmentPrescription = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await Appointment.findById(req.params.appointmentId).populate('prescription');
  if (!appointment) {
    res.status(404).json({ success: false, message: 'Appointment not found' });
    return;
  }

  if (
    appointment.patientId.toString() !== req.user!.userId &&
    appointment.doctorId.toString() !== req.user!.userId
  ) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  if (!appointment.prescription) {
    res.status(404).json({ success: false, message: 'No prescription for this appointment' });
    return;
  }

  const prescription = await Prescription.findById(appointment.prescription)
    .populate('doctorId', 'profile doctorDetails');

  res.json({ success: true, data: prescription });
});
